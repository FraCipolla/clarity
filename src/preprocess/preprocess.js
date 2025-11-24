import { Project, SyntaxKind } from "ts-morph";
import fs from "fs";
import path from "path";

const srcDir = "playground";
const outDir = ".preprocessed";

const skipUnwrapCalls = new Set(["Grid"]);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// ----- Step 0: Preprocess reactive/computed declarations -----
function preprocessReactiveDeclarations(code) {
  const reactiveVars = new Set();
  const computeVars = new Set();
  const lines = code.split("\n");
  const outputLines = [];

  let collecting = false;
  let buffer = [];
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
          // Single-line declaration
          if (type === "reactive") {
            reactiveVars.add(currentVar);
            outputLines.push(`let ${currentVar} = reactive(${rest.slice(0, -1)});`);
          } else {
            computeVars.add(currentVar);
            outputLines.push(`let ${currentVar} = computed(() => ${rest.slice(0, -1)});`);
          }
        } else {
          // Multi-line declaration
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

  return { code: outputLines.join("\n"), reactiveVars, computeVars };
}

// ----- Step 1: Process each file -----
fs.readdirSync(srcDir).forEach(file => {
  if (!file.endsWith(".ts")) return;

  const inputPath = path.join(srcDir, file);
  const outputPath = path.join(outDir, file);

  const originalCode = fs.readFileSync(inputPath, "utf-8");
  const { code: preprocessedCode, reactiveVars, computeVars } = preprocessReactiveDeclarations(originalCode);
  const tempPath = path.join(outDir, "__temp.ts");
  fs.writeFileSync(tempPath, preprocessedCode, "utf-8");

  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(tempPath);

  // ----- Step 2: Traverse AST -----
  sourceFile.forEachDescendant(node => {
    const kind = node.getKind();

  // 1️⃣ Template literals → array expressions
  // Inside sourceFile.forEachDescendant:
  if (kind === SyntaxKind.TemplateExpression) {
    const parts = [];
    const headText = node.getHead().getText().slice(1, -1);
    if (headText) parts.push(JSON.stringify(headText));

    node.getTemplateSpans().forEach(span => {
      const exprNode = span.getExpression();

      // Recursively unwrap reactive identifiers inside this expression
      function unwrapReactiveIdentifiers(n) {
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


    // 2️⃣ Identifiers outside template literals → unwrap .value for reactive vars
    if (kind === SyntaxKind.Identifier) {
      const name = node.getText();
      if (!reactiveVars.has(name) && !computeVars.has(name)) return;
      // if (computeVars.has(name)) return; // computed vars never get .value

      let parent = node.getParent();
      let inTemplate = false;
      while (parent) {
        if (parent.getKind() === SyntaxKind.CallExpression) {
          const callExpr = parent.asKindOrThrow(SyntaxKind.CallExpression);
          const funcName = callExpr.getExpression().getText();
          if (skipUnwrapCalls.has(funcName)) return;
        };
        if (parent.getKind() === SyntaxKind.TemplateExpression) {
          inTemplate = true;
          break;
        }
        parent = parent.getParent();
      }
      if (inTemplate) return;

      const p = node.getParent();

      if (p.getKind() === SyntaxKind.VariableDeclaration && p.getNameNode() === node) return;
      if (p.getKind() === SyntaxKind.ArrayLiteralExpression) return;
      if (
        p.getKind() === SyntaxKind.PropertyAssignment &&
        p.getParent().getKind() === SyntaxKind.ObjectLiteralExpression
      ) return;
      if (p.getKind() === SyntaxKind.SpreadElement) return;
      node.replaceWithText(name + ".value");
    }
  });
  
  // ----- Step 3: Save final processed file -----
  sourceFile.saveSync();
  const finalCode = fs.readFileSync(tempPath, "utf-8");
  fs.writeFileSync(outputPath, finalCode, "utf-8");

  console.log("Preprocessed:", file);
  fs.unlinkSync(tempPath);
});