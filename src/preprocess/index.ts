import { Node, Project, SyntaxKind, VariableDeclaration,TemplateExpression } from "ts-morph";

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
      const match = line.match(/^(reactive|computed)\s+([a-zA-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) {
        type = match[1];
        currentVar = match[2];
        let rest = match[3];
        if (rest.trim().endsWith(";")) {
          if (type === "reactive") {
            reactiveVars.add(currentVar);
            outputLines.push(`let ${currentVar} = reactive(${rest.slice(0, -1)});`);
          } else {
            computeVars.add(currentVar);
            outputLines.push(`let ${currentVar} = computed(() => ${rest.slice(0, -1)});`);
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

  // ----- AST transformations -----
  const skipUnwrapCalls = new Set(["Grid"]);

  sourceFile.forEachDescendant((node: Node) => {
    const kind = node.getKind();

    if (kind === SyntaxKind.TemplateExpression) {
      const parts = [];
      const templateNode = node as TemplateExpression;
      const headText = templateNode.getHead().getText().slice(1, -1);
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

      let parent = node.getParent();
      let inTemplate = false;
      while (parent) {
        if (parent.getKind() === SyntaxKind.TemplateExpression) {
          inTemplate = true;
          break;
        }
        parent = parent.getParent();
      }
      if (inTemplate) return;

      const p = node.getParent();
      if (p) {
          if (p.getKind() === SyntaxKind.VariableDeclaration) {
            const varDecl = p as VariableDeclaration;
            if (varDecl.getNameNode() === node) return;
          }
          if (p.getKind() === SyntaxKind.ArrayLiteralExpression) return;
          const parent = p.getParent();
          if (
            p.getKind() === SyntaxKind.PropertyAssignment && parent &&
            parent.getKind() === SyntaxKind.ObjectLiteralExpression
          ) return;
          if (p.getKind() === SyntaxKind.SpreadElement) return;
      }

      node.replaceWithText(name + ".value");
    }
  });

  return sourceFile.getFullText();
}
