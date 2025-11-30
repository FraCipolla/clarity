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
  ObjectLiteralExpression,
  SyntaxList } from "ts-morph";

  import { isHtmlTag } from "../runtime/dom.js";

function appendValueIfReactive(node: Node, reactiveVars: Set<string>, computeVars: Set<string>) {
  if (node.getKind() === SyntaxKind.Identifier) {
    const name = node.getText();

    if (!reactiveVars.has(name) && !computeVars.has(name)) return;

    const parent = node.getParent();

    // Already part of a PropertyAccessExpression that ends with .value
    if (
      parent &&
      parent.getKind() === SyntaxKind.PropertyAccessExpression &&
      parent.getText().endsWith(".value")
    ) return;

    // Write context
    if (isWriteContext(node)) {
      node.replaceWithText(name + ".value");
      return;
    }

    // Console.log or read context
    node.replaceWithText(name + ".value");
  }

  if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
    const pae = node as PropertyAccessExpression;
    const fullText = pae.getText();

    // Skip if it already ends with .value
    if (fullText.endsWith(".value")) return;

    // Only append .value at the end of chain
    const lastProp = pae.getName();
    const rootExpr = pae.getExpression().getText();

    // If root is reactive
    if (reactiveVars.has(rootExpr) || computeVars.has(rootExpr)) {
      pae.replaceWithText(`${rootExpr}.${lastProp}.value`);
    }
  }
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
    ]);

    if (bin.getLeft() === node && WRITE_OPS.has(bin.getOperatorToken().getKind())) {
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

export function preprocessCode(code: string): string {
  const reactiveVars = new Set<string>();
  const computeVars = new Set<string>();
  const lines = code.split("\n");
  const outputLines: string[] = [];

  let collecting = false;
  let buffer: string[] = [];
  let currentVar = "";
  let type = "";

  for (let line of lines) {
    if (!collecting) {
      const match = line.match(/^\s*(reactive|computed)\s+([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) {
        type = match[1];
        currentVar = match[2];
        let rest = match[3];
        if (rest.trim().endsWith(";")) {
          const value = rest.replace(/;$/, "");
          const isObjectLiteral = value.startsWith("{") && value.endsWith("}");
          if (type === "reactive") {
            reactiveVars.add(currentVar);
            outputLines.push(`let ${currentVar} = reactive(${value});`);
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
          reactiveVars.add(currentVar);
          outputLines.push(`let ${currentVar} = reactive(${value});`);
        } else {
          computeVars.add(currentVar);
          outputLines.push(`let ${currentVar} = computed(() => ${value});`);
        }
        collecting = false;
        buffer = [];
      }
    }
  }

  const tempCode = outputLines.join("\n");
  const project = new Project();
  const sourceFile = project.createSourceFile("__temp.ts", tempCode, { overwrite: true });

  const skipUnwrapCalls = new Set(["Grid"]); // any special functions to skip

  sourceFile.forEachDescendant((node: Node) => {
    const kind = node.getKind();

    if (kind === SyntaxKind.TemplateExpression) {
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

    // ------------------ Handle identifiers ------------------
    if (kind === SyntaxKind.Identifier) {
      const name = node.getText();
      if (!reactiveVars.has(name) && !computeVars.has(name)) return;

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

        // Only append .value to the final property
        if (reactiveVars.has(rootName) || computeVars.has(rootName)) {
          pae.replaceWithText(`${rootName}.${lastProp}.value`);
        }
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
