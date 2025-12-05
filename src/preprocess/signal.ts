import {
  Project,
  SyntaxKind,
  Node,
  VariableDeclaration,
  CallExpression,
  TemplateExpression,
  PropertyAccessExpression,
  Identifier
} from "ts-morph";
import * as fs from "fs";
import * as path from "path";

// Helpers and utility sets remain largely the same
const SIGNAL_HELPERS = new Set(["reactive", "derived", "share", "persistent", "session"]);
const TEMPLATE_EXCEPTIONS = new Set(["style"]);

// Array methods whose access should be rewritten to array().method
const arrayMethods = new Set([
  "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "map", "filter", "forEach", "length"
]);

function isHtmlTag(name: string) {
  return /^[a-z]+$/i.test(name);
}

/**
 * Transforms Clarity reactive variables from standard JS access (e.g., count)
 * into the Signals API (read: count(), write: count.set(v)).
 * @param code - The TypeScript source code to preprocess.
 * @param filePath - The path of the file.
 * @returns The preprocessed code.
 */
export function preprocessCodeSignal(code: string, filePath: string): string {
  if (!filePath.endsWith(".cl.ts")) return code;

  const reactiveVars = new Set<string>();
  const computeVars = new Set<string>();
  const reactiveArrays = new Set<string>();
  const reactiveObjects = new Set<string>();
  const runtimeHelpersUsed = new Set<string>();

  // --- Step 1: Handle declarations (Replacing 'derived' with 'computed') ---
  const lines = code.split("\n");
  const outputLines: string[] = [];
  let collecting = false;
  let buffer: string[] = [];
  let currentVar = "";
  let currentType = "";

  for (let line of lines) {
    if (!collecting) {
      const match = line.match(/^\s*(reactive|computed|share|persistent|session)\s+([a-zA-Z0-9_]+)\s*(?:=\s*(.*))?;?$/);
      if (match) {
        currentType = match[1];
        currentVar = match[2];
        let rest = match[3];

        if (!rest || rest.trim().endsWith(";")) {
          let value = rest ? rest.replace(/;$/, "") : undefined;
          if (currentType === "computed") {
            computeVars.add(currentVar);
            outputLines.push(`let ${currentVar} = computed(() => ${value});`);
          } else {
            reactiveVars.add(currentVar);
            const trimmed = value?.trim();
            if (trimmed?.startsWith("[") && trimmed.endsWith("]")) reactiveArrays.add(currentVar);
            if (trimmed?.startsWith("{") && trimmed.endsWith("}")) reactiveObjects.add(currentVar);

            if (currentType === "reactive" || currentType === "share") {
              outputLines.push(`let ${currentVar} = reactive(${value});`);
            } else if (currentType === "persistent") {
              outputLines.push(`let ${currentVar} = persistent("${currentVar}"${value !== undefined ? ", " + value : ""});`);
            } else if (currentType === "session") {
              outputLines.push(`let ${currentVar} = session("${currentVar}"${value !== undefined ? ", " + value : ""});`);
            }
          }
        } else {
          collecting = true;
          buffer = [rest];
        }

      } else {
        outputLines.push(line);
      }

    } else {
      buffer.push(line);
      if (line.trim().endsWith(";")) {
        const value = buffer.join("\n").replace(/;$/, "");

        if (currentType === "derived") {
          computeVars.add(currentVar);
          outputLines.push(`let ${currentVar} = computed(() => ${value});`);
        } else {
          reactiveVars.add(currentVar);
          if (currentType === "reactive" || currentType === "share") {
            outputLines.push(`let ${currentVar} = reactive(${value});`);
          } else if (currentType === "persistent") {
            outputLines.push(`let ${currentVar} = persistent("${currentVar}", ${value});`);
          } else if (currentType === "session") {
            outputLines.push(`let ${currentVar} = session("${currentVar}", ${value});`);
          }
        }

        collecting = false;
        buffer = [];
      }
    }
  }

  let tempCode = outputLines.join("\n");

  const project = new Project();
  const sourceFile = project.createSourceFile("__temp.ts", tempCode, { overwrite: true });

  sourceFile.forEachDescendant((node: Node) => {
    const parent = node.getParent();
    const kind = node.getKind();
    const name = node.getText();

    // --------------------------------------------------------------------------------
    // 1. Write Context: Assignment (x = y) and Compound Assignment (x += y)
    //    Goal: x = y      -> x.set(y)
    //    Goal: x += y     -> x.set(x() + y)
    // --------------------------------------------------------------------------------
    if (parent?.isKind(SyntaxKind.BinaryExpression)) {
      const bin = parent.asKindOrThrow(SyntaxKind.BinaryExpression);
      const opKind = bin.getOperatorToken().getKind();

      if (bin.getLeft() === node && reactiveVars.has(name)) {
        const rhs = bin.getRight().getText();

        if (opKind === SyntaxKind.EqualsToken) {
          // Assignment: count = 5  -> count.set(5)
          bin.replaceWithText(`${name}.set(${rhs})`);
        } else {
          // Compound assignment: count += 1 -> count.set(count() + 1)
          const assignmentOps = new Set([
            SyntaxKind.PlusEqualsToken, SyntaxKind.MinusEqualsToken,
            SyntaxKind.AsteriskEqualsToken, SyntaxKind.SlashEqualsToken,
            SyntaxKind.PercentEqualsToken
          ]);

          if (assignmentOps.has(opKind)) {
            const operatorChar = bin.getOperatorToken().getText().replace("=", "");
            bin.replaceWithText(`${name}.set(${name}() ${operatorChar} ${rhs})`);
          }
        }
        return;
      }
    }

    // --------------------------------------------------------------------------------
    // 2. Write Context: Unary ++ / -- operators
    //    Goal: count++    -> count.set(count() + 1)
    // --------------------------------------------------------------------------------
    if ((parent?.isKind(SyntaxKind.PrefixUnaryExpression) || parent?.isKind(SyntaxKind.PostfixUnaryExpression)) && reactiveVars.has(name)) {
      const unary = parent;
      const opKind = unary.getOperatorToken();
      console.log(opKind.toString())
      if (opKind === SyntaxKind.PlusPlusToken) {
        unary.replaceWithText(`${name}.set(${name}() + 1)`);
      } else if (opKind === SyntaxKind.MinusMinusToken) {
        unary.replaceWithText(`${name}.set(${name}() - 1)`);
      }
      return;
    }

    // 0. Wrap event handlers in an anonymous function
    if (Node.isPropertyAssignment(node)) {
        const propName = node.getName();
        // Check for event handlers (on* attributes)
        if (propName.startsWith('on') && propName.length > 2) {
            const initializer = node.getInitializer();

            if (initializer) {
                const initializerKind = initializer.getKind();
                const shouldSkipWrapping = 
                    initializerKind === SyntaxKind.ArrowFunction || 
                    initializerKind === SyntaxKind.FunctionExpression || 
                    initializerKind === SyntaxKind.Block ||
                    initializerKind === SyntaxKind.Identifier ||
                    initializerKind === SyntaxKind.PropertyAccessExpression;

                if (!shouldSkipWrapping) {
                    const expression = initializer.getText();
                    node.setInitializer(`() => ${expression}`);
                    return;
                }
            }
        }
    }

    // --------------------------------------------------------------------------------
    // 3. Template literals inside HTML
    //    Goal: div`${count}` -> div(() => count())
    // --------------------------------------------------------------------------------
    if (kind === SyntaxKind.TemplateExpression) {
      const templateNode = node.asKindOrThrow(SyntaxKind.TemplateExpression);
      
      // Only process inside HTML calls
      const htmlParent = templateNode.getFirstAncestorByKind(SyntaxKind.CallExpression);
      if (!htmlParent || !isHtmlTag(htmlParent.getExpression().getText())) return;

      const parts: string[] = [];
      // The template literal head (e.g., "Count: ${count}")
      const headText = templateNode.getHead().getText().slice(1); 
      
      if (headText) parts.push(JSON.stringify(headText.replace("${", "")));
      templateNode.getTemplateSpans().forEach(span => {
        const expr = span.getExpression();
        let exprText = expr.getText();
        
        if (reactiveVars.has(exprText) || computeVars.has(exprText)) {
          exprText = `${exprText}`;
        }
        exprText = exprText.replaceAll("()", "");

        parts.push(exprText);
        
        const lit = span.getLiteral().getText();
        
        if (lit && lit.length > 2) parts.push(JSON.stringify(lit.slice(1, -1))); // Exclude ${ and }
      });
      templateNode.replaceWithText(`[${parts.join(", ")}]`);
      return;
    }


    // --------------------------------------------------------------------------------
    // 4. Property access: unwrap array signals
    //    Goal: reactiveArray.push(1) -> reactiveArray().push(1)
    // --------------------------------------------------------------------------------
    if (Node.isPropertyAccessExpression(node)) {
      const pae = node;
      const rootName = pae.getExpression().getText();
      const propName = pae.getName();
      
      if (reactiveArrays.has(rootName) && arrayMethods.has(propName)) {
        pae.replaceWithText(`${rootName}().${propName}`);
        return;
      }
    }


    // --------------------------------------------------------------------------------
    // 5. Read Context: Identifier (Append function call)
    //    Goal: p(count) -> p(count())
    // --------------------------------------------------------------------------------
    if (kind === SyntaxKind.Identifier) {
      if (parent?.isKind(SyntaxKind.PrefixUnaryExpression) || parent?.isKind(SyntaxKind.PostfixUnaryExpression)) {
        return;
      }
      if (parent?.isKind(SyntaxKind.CallExpression)) {
        // avoid double ()()
        return;
      }
      
      if (!reactiveVars.has(name) && !computeVars.has(name)) return;

      if (parent?.isKind(SyntaxKind.VariableDeclaration)) {
        const initializer = parent.asKindOrThrow(SyntaxKind.VariableDeclaration).getInitializer();
        initializer?.forEachDescendant((node) => {
          if (node.isKind(SyntaxKind.Identifier) && reactiveVars.has(node.getText())) {
            const identifierNode = node as Identifier;
            identifierNode.replaceWithText(`${node.getText()}()`);
          }
        })
        return;
      };
      if (parent?.isKind(SyntaxKind.BinaryExpression) && parent.asKindOrThrow(SyntaxKind.BinaryExpression).getLeft() === node) return;

      if (Node.isPropertyAccessExpression(parent) && parent.getExpression() === node) {
        const propName = parent.getName();
        if (propName === 'set') return;
      }
      
      node.replaceWithText(`${name}()`);
    }

  });
  
  // --- Step 3: Inject imports for the Signals API ---
  const signalsToImport = new Set<string>();

  signalsToImport.add('reactive');
  signalsToImport.add('computed'); 
  signalsToImport.add('persistent');
  signalsToImport.add('session');

  const importStatement = `import { ${Array.from(signalsToImport).join(', ')} } from "@fracipolla/clarity";\n`;
  sourceFile.insertText(0, importStatement);

  const finalCode = sourceFile.getFullText();

  return finalCode;
}