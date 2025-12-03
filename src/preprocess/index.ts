import {
  Node,
  Project,
  SyntaxKind,
  VariableDeclaration,
  TemplateExpression,
  BinaryExpression,
  PrefixUnaryExpression,
  PostfixUnaryExpression,
  PropertyAccessExpression,
  ImportDeclaration,
  ObjectLiteralExpression,
  SyntaxList } from "ts-morph";

import { isHtmlTag } from "../runtime/dom.js";
import * as fs from "fs";
import * as path from "path";

function flattenPlus(node: Node): Node[] {
  if (node.getKind() === SyntaxKind.BinaryExpression) {
    const bin = node.asKindOrThrow(SyntaxKind.BinaryExpression);
    if (bin.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
      return [
        ...flattenPlus(bin.getLeft()),
        ...flattenPlus(bin.getRight()),
      ];
    }
  }
  return [node];
}

function isInsideHtmlCall(node: Node) {
  const parent = node.getParent();
  if (!parent || !parent.isKind(SyntaxKind.CallExpression)) return false;

  const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
  const expr = call.getExpression();

  return expr.isKind(SyntaxKind.Identifier) && isHtmlTag(expr.getText());
}

function isInsideStyle(node: Node): boolean {
  let parent = node.getParent();
  while (parent) {
    if (parent.isKind(SyntaxKind.PropertyAssignment)) {
      const pa = parent.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const name = pa.getName();
      if (name === "style") return true;
    }
    parent = parent.getParent();
  }
  return false;
}

function isWriteContext(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;

  const pk = parent.getKind();

  // Variable declarations are NEVER writes
  //    let count = ...
  //    const count = ...
  if (pk === SyntaxKind.VariableDeclaration) {
    const v = parent as VariableDeclaration;
    if (v.getNameNode() === node) return false;
  }

  // Assignment on LHS
  if (pk === SyntaxKind.BinaryExpression) {
    const bin = parent as BinaryExpression;

    const WRITE_OPS = new Set([
      SyntaxKind.EqualsToken,
      SyntaxKind.AsteriskToken,
      SyntaxKind.PlusToken,
      SyntaxKind.PlusPlusToken,
      SyntaxKind.PlusEqualsToken,
      SyntaxKind.MinusEqualsToken,
      SyntaxKind.AsteriskEqualsToken,
      SyntaxKind.SlashEqualsToken,
      SyntaxKind.PercentToken,
      SyntaxKind.PercentEqualsToken,
      SyntaxKind.AmpersandEqualsToken,
      SyntaxKind.BarEqualsToken,
      SyntaxKind.CaretEqualsToken,
      SyntaxKind.LessThanLessThanEqualsToken,
      SyntaxKind.GreaterThanGreaterThanEqualsToken,
      SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
      SyntaxKind.AsteriskAsteriskEqualsToken,
      SyntaxKind.QuestionQuestionEqualsToken,
      SyntaxKind.BarBarEqualsToken,
      SyntaxKind.AmpersandAmpersandEqualsToken,
      SyntaxKind.EqualsEqualsEqualsToken
    ]);

    if (bin.getLeft() === node && WRITE_OPS.has(bin.getOperatorToken().getKind())) {
      return true;
    } else if (bin.getRight() === node && bin.getOperatorToken().getKind() === SyntaxKind.EqualsEqualsEqualsToken) {
      return true;
    }
  }

  // ++count  count++
  if (pk === SyntaxKind.PrefixUnaryExpression || pk === SyntaxKind.PostfixUnaryExpression) {
    const unary = parent as PrefixUnaryExpression | PostfixUnaryExpression;
    const INC_OPS = new Set([SyntaxKind.PlusPlusToken, SyntaxKind.MinusMinusToken]);
    return INC_OPS.has(unary.getOperatorToken());
  }

  // Member assignment: count.x = 
  if (pk === SyntaxKind.PropertyAccessExpression) {
    const pae = parent as PropertyAccessExpression;
    
    // Ensure "count" is the object part of "count.x"
    if (pae.getExpression() !== node) {
      return false;
    }

    // Do NOT treat variable declarations as writes
    const grand = parent.getParent();
    if (grand && grand.getKind() === SyntaxKind.VariableDeclaration) {
      return false;
    }

    if (grand && grand.getKind() === SyntaxKind.BinaryExpression) {
      const bin = grand as BinaryExpression;
      const op = bin.getOperatorToken().getKind();

      const writeOps = new Set([
        SyntaxKind.EqualsToken,
        SyntaxKind.PlusEqualsToken,
        SyntaxKind.PlusPlusToken,
        SyntaxKind.MinusEqualsToken,
        SyntaxKind.AsteriskEqualsToken,
        SyntaxKind.SlashEqualsToken,
        SyntaxKind.PercentEqualsToken,
        SyntaxKind.PlusPlusToken
      ]);

      if (bin.getLeft() === parent && writeOps.has(op)) {
        return true;
      }
    }
  }

  return false;
}

const arrayMethods = new Set([
  "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "map", "filter", "forEach", "length"
]);
const storeVars = new Set<{var: string, file: string}>();
export function preprocessCode(code: string, filePath: string): string {
  if (!filePath.endsWith(".cl.ts")) return code;
  const reactiveVars = new Set<string>();
  const reactiveArrays = new Set<string>();
  const reactiveObjects = new Set<string>();
  const computeVars = new Set<string>();
  const lines = code.split("\n");
  const outputLines: string[] = [];
  let collecting = false;
  let buffer: string[] = [];
  let currentVar = "";
  let type = "";
  
  for (let line of lines) {
    if (!collecting) {
      const match = line.match(/^\s*(reactive|computed|share|persistent|session)\s+([a-zA-Z0-9_]+)\s*(?:=\s*(.*))?;?$/);
      if (match) {
        type = match[1];
        currentVar = match[2];
        let rest = match[3];
        if (rest === undefined || rest.trim().endsWith(";")) {
          const value = rest ? rest.replace(/;$/, "") : undefined;
          if (type === "reactive") {
              const trimmed = value?.trim();
              if (trimmed?.startsWith("[") && trimmed.endsWith("]")) {
                reactiveArrays.add(currentVar);
              } else if (trimmed?.startsWith("{") && trimmed.endsWith("}")) {
                reactiveObjects.add(currentVar);
              }
              reactiveVars.add(currentVar);
              outputLines.push(`let ${currentVar} = reactive(${value});`);
          } else if (type === "share") {
            outputLines.push(`export let ${currentVar} = reactive(${value});`);
          } else if (type === "persistent") {
            reactiveVars.add(currentVar);
            outputLines.push(`let ${currentVar} = persistent("${currentVar}"${value !== undefined ? ", " + value : ""});`);
          } else if (type === "session") {
            reactiveVars.add(currentVar);
            outputLines.push(`let ${currentVar} = session("${currentVar}"${value !== undefined ? ", " + value : ""});`);
          } else {
            computeVars.add(currentVar);
            outputLines.push(`let ${currentVar} = computed(() => ${value});`);
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
        if (type === "reactive") {
          const trimmed = value?.trim();
          if (trimmed?.startsWith("[") && trimmed.endsWith("]")) {
            reactiveArrays.add(currentVar);
          } else if (trimmed?.startsWith("{") && trimmed.endsWith("}")) {
            reactiveObjects.add(currentVar);
          }
          reactiveVars.add(currentVar);
          outputLines.push(`const ${currentVar} = reactive(${value});`);
        } else if (type === "share") {
          outputLines.push(`export const ${currentVar} = reactive(${value});`);
        } else if (type === "persistent") {
          reactiveVars.add(currentVar);
          outputLines.push(`const ${currentVar} = persistent("${currentVar}"${value !== undefined ? ", " + value : ""});`);
        } else if (type === "session") {
          reactiveVars.add(currentVar);
          outputLines.push(`const ${currentVar} = session("${currentVar}"${value !== undefined ? ", " + value : ""});`);
        } else {
          computeVars.add(currentVar);
          outputLines.push(`const ${currentVar} = computed(() => ${value});`);
        }
        collecting = false;
        buffer = [];
      }
    }
  }

  const tempCode = outputLines.join("\n");
  const project = new Project();
  const sourceFile = project.createSourceFile("__temp.ts", tempCode, { overwrite: true });
  const dir = path.dirname(filePath);
  sourceFile.getImportDeclarations().forEach((imp: ImportDeclaration) => {
    const modulePath = imp.getModuleSpecifierValue();
    if (!modulePath.startsWith('.')) return;

    const resolvedPath = path.resolve(path.dirname(dir), "src/" + modulePath + '.ts');
    const code = fs.readFileSync(resolvedPath, 'utf-8');
    imp.getNamedImports().forEach(named => {
      const name = named.getName();
      // const alias = named.getAliasNode()?.getText() || null; ?????
      const storeRegex = new RegExp(`\\bshare\\s+${name}\\b`);
      if (storeRegex.test(code)) {
        reactiveVars.add(name);
      }
    });
  });

  sourceFile.forEachDescendant((node: Node) => {
    const kind = node.getKind();
    
    if (kind === SyntaxKind.PropertyAccessExpression) {
      const pae = node.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const parent = pae.getParent();
      if (parent && parent.isKind(SyntaxKind.BinaryExpression)) {
        const bin = parent.asKindOrThrow(SyntaxKind.BinaryExpression);
        const op = bin.getOperatorToken().getKind();

        if (op === SyntaxKind.EqualsToken && bin.getLeft() === pae) {
          let root: Node = pae;
          while (root.isKind(SyntaxKind.PropertyAccessExpression)) {
              root = root.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getExpression();
          }
          if (root.isKind(SyntaxKind.Identifier) && reactiveVars.has(root.getText())) {  
            const oldText = pae.getText();
            pae.replaceWithText(oldText + ".value");
            return;
          }
        }
      }
    }
    
    if (node.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const objLit = node.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

      objLit.getProperties().forEach(prop => {
        if (!prop.isKind(SyntaxKind.PropertyAssignment)) return;
        const kind = prop.getKind();
        
        const assignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
        const name = assignment.getName();

        if (name === "style") {
          const styleExpr = assignment.getInitializer();
          if (!styleExpr) return;

          styleExpr.forEachDescendant(desc => {
            (desc as any)._skipReactiveValueExpansion = true;
          });
          (styleExpr as any)._skipReactiveValueExpansion = true;
          return;
        }
      });
    }

    if (kind === SyntaxKind.TemplateExpression) {
      if (!isInsideHtmlCall(node)) return;
      const parts: string[] = [];
      const templateNode = node as TemplateExpression;
      const headText = templateNode.getHead().getText().slice(1, -2);
      if (headText) parts.push(JSON.stringify(headText));
      templateNode.getTemplateSpans().forEach(span => {
        const exprNode = span.getExpression();

        function unwrapReactiveIdentifiers(n: Node) {
          n.forEachDescendant(child => {
            if (child.getKind() === SyntaxKind.Identifier) {
              const name = child.getText();
              if (reactiveVars.has(name) || computeVars.has(name)) {
                child.replaceWithText(name + ".value");
              }
            }
          });
          return n.getText();
        }

        const exprText = unwrapReactiveIdentifiers(exprNode);
        parts.push(exprText);

        const lit = span.getLiteral().getText().slice(1, -1);
        if (lit) parts.push(JSON.stringify(lit));
      });

      node.replaceWithText(`[${parts.join(", ")}]`);
      return;
    }

    if (node.getKind() === SyntaxKind.BinaryExpression) {
      if (!isInsideHtmlCall(node)) return;
      const bin = node.asKindOrThrow(SyntaxKind.BinaryExpression);
      if (bin.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
        const parts = flattenPlus(node);
        
        const transformed = parts.map((part) => {
          return part.getText();
        });

        node.replaceWithText(`[${transformed.join(", ")}]`);
      }
    }

    if (kind === SyntaxKind.Identifier) {
      const name = node.getText();
      if (!reactiveVars.has(name) && !computeVars.has(name) && !reactiveObjects.has(name)) return;
      if (isInsideStyle(node)) return; 
      // Check if it is part of a property access (obj.x)
      const parent = node.getParent();
      if (
        parent &&
        parent.getKind() === SyntaxKind.PropertyAccessExpression &&
        (reactiveVars.has(name) || computeVars.has(name))
      ) {
        const pae = parent as PropertyAccessExpression;
        const rootName = pae.getExpression().getText();
        const lastProp = pae.getName();
        console.log(lastProp)
        if (reactiveVars.has(rootName) && arrayMethods.has(lastProp)) {
          pae.replaceWithText(`${rootName}.value.${lastProp}`);
          return;
        } else if (
          reactiveVars.has(rootName) &&
          reactiveObjects.has(rootName)
        ) {
          pae.replaceWithText(`${rootName}.${lastProp}.value`);
          return;
        }
      }

      if (
        reactiveVars.has(name) &&
        reactiveArrays.has(name)
      ) {
        const parent = node.getParent();
      
        // Skip if it's a variable declaration
        if (parent?.getKind() === SyntaxKind.VariableDeclaration) return;
      
        // Skip if it's the "root" array in For() or IfElse()
        if (parent?.getKind() === SyntaxKind.CallExpression) {
          const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
          const funcName = call.getExpression().getText();
          if (["For", "IfElse"].includes(funcName) && call.getArguments()[0] === node) return;
        }
      
        // Skip if it's already a property access ending with .value
        if (
          parent?.isKind(SyntaxKind.PropertyAccessExpression) &&
          parent.getName() === "value"
        ) return;

        node.replaceWithText(name + ".value");
        return;
      }

      if (isWriteContext(node)) {
        node.replaceWithText(name + ".value");
        return;
      }

      if (parent && parent.getKind() === SyntaxKind.CallExpression) {
        const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
        const expr = call.getExpression().getText();
        if (expr === "console.log" || !isHtmlTag(expr)) {
          node.replaceWithText(name + ".value");
          return;
        }
      }
    }
  });

  return sourceFile.getFullText().replaceAll(".value.value", ".value");
}
