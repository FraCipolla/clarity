import { Node, Project, SyntaxKind, VariableDeclaration, TemplateExpression, BinaryExpression, PrefixUnaryExpression, PostfixUnaryExpression, SyntaxList } from "ts-morph";

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
      const parts = [];
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

    if (kind === SyntaxKind.Identifier) {
      const name = node.getText();
      if (!reactiveVars.has(name) && !computeVars.has(name)) return;

      const parent = node.getParent();

      if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
        const varDecl = parent as VariableDeclaration;
        if (varDecl.getNameNode() === node) return;
      }

      let isWrite = false;
      if (parent) {
        const pk = parent.getKind();

        if (pk === SyntaxKind.BinaryExpression) {
          const bin = parent as BinaryExpression;
          const op = bin.getOperatorToken().getKind();
          // =, +=, -=, *=, /=, etc.
          const writeOps = new Set([
            SyntaxKind.EqualsToken,
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
          ]);
          if (bin.getLeft() === node && writeOps.has(op)) isWrite = true;
        } else if (pk === SyntaxKind.PrefixUnaryExpression || pk === SyntaxKind.PostfixUnaryExpression) {
          const unary = parent as PrefixUnaryExpression | PostfixUnaryExpression;
          const op = unary.getOperatorToken();
          const incrementOps = new Set([SyntaxKind.PlusPlusToken, SyntaxKind.MinusMinusToken]);
          if (incrementOps.has(op)) isWrite = true;
        }

        if (pk === SyntaxKind.CallExpression) {
          const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
          const expr = call.getExpression().getText();
          if (expr === "console.log") {
            node.replaceWithText(name + ".value");
            return;
          }
        }
      }

      if (isWrite) {
        node.replaceWithText(name + ".value");
      }
    }
  });

  return sourceFile.getFullText();
}
