"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const srcDir = "playground";
const outDir = ".preprocessed";
if (!fs.existsSync(outDir))
    fs.mkdirSync(outDir);
// -----------------------------
// Step 0: Preprocess reactive/computed declarations
// -----------------------------
function preprocessReactiveDeclarations(code) {
    const reactiveVars = new Set();
    const computeVars = new Set();
    const lines = code.split("\n");
    const outputLines = [];
    let collecting = false;
    let buffer = [];
    let currentVar = "";
    let type = "";
    for (const line of lines) {
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
                    }
                    else {
                        computeVars.add(currentVar);
                        outputLines.push(`let ${currentVar} = computed(() => ${rest.slice(0, -1)});`);
                    }
                }
                else {
                    collecting = true;
                    buffer = [rest];
                }
            }
            else {
                outputLines.push(line);
            }
        }
        else {
            buffer.push(line);
            if (line.trim().endsWith(";")) {
                const value = buffer.join("\n").replace(/;$/, "");
                if (type === "reactive") {
                    reactiveVars.add(currentVar);
                    outputLines.push(`let ${currentVar} = reactive(${value});`);
                }
                else {
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
// -----------------------------
// Helper: collect child tags recursively
// -----------------------------
function collectChildTags(node) {
    const tags = [];
    node.forEachDescendant(c => {
        if (c.getKind() === ts_morph_1.SyntaxKind.CallExpression) {
            const callNode = c;
            const name = callNode.getExpression().getText();
            tags.push(name);
        }
    });
    return tags;
}
// -----------------------------
// Step 1: Process each file
// -----------------------------
fs.readdirSync(srcDir).forEach(file => {
    if (!file.endsWith(".ts"))
        return;
    const inputPath = path.join(srcDir, file);
    const outputPath = path.join(outDir, file);
    const originalCode = fs.readFileSync(inputPath, "utf-8");
    const { code: preprocessedCode, reactiveVars, computeVars } = preprocessReactiveDeclarations(originalCode);
    const tempPath = path.join(outDir, "__temp.ts");
    fs.writeFileSync(tempPath, preprocessedCode, "utf-8");
    const project = new ts_morph_1.Project();
    const sourceFile = project.addSourceFileAtPath(tempPath);
    // -----------------------------
    // Step 2: Traverse AST
    // -----------------------------
    sourceFile.forEachDescendant(node => {
        var _a;
        const kind = node.getKind();
        // --- Template literals → array conversion ---
        if (kind === ts_morph_1.SyntaxKind.TemplateExpression) {
            const templateNode = node;
            const parts = [];
            const headText = templateNode.getHead().getText().slice(1, -1);
            if (headText)
                parts.push(JSON.stringify(headText));
            templateNode.getTemplateSpans().forEach((span) => {
                const exprNode = span.getExpression();
                exprNode.forEachDescendant((child) => {
                    if (child.getKind() === ts_morph_1.SyntaxKind.Identifier) {
                        const name = child.getText();
                        if (reactiveVars.has(name) || computeVars.has(name)) {
                            child.replaceWithText(name + ".value");
                        }
                    }
                });
                parts.push(exprNode.getText());
                const lit = span.getLiteral().getText().slice(1, -1);
                if (lit)
                    parts.push(JSON.stringify(lit));
            });
            templateNode.replaceWithText(`[${parts.join(", ")}]`);
            return;
        }
        // --- Identifiers outside templates → unwrap reactive .value ---
        if (kind === ts_morph_1.SyntaxKind.Identifier) {
            const name = node.getText();
            if (!reactiveVars.has(name) && !computeVars.has(name))
                return;
            let parent = node.getParent();
            let inTemplate = false;
            while (parent) {
                if (parent.getKind() === ts_morph_1.SyntaxKind.TemplateExpression) {
                    inTemplate = true;
                    break;
                }
                parent = parent.getParent();
            }
            if (inTemplate)
                return;
            const p = node.getParent();
            if (!p)
                return;
            if (p.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration) {
                const decl = p;
                if (decl.getNameNode() === node)
                    return;
            }
            if (p.getKind() === ts_morph_1.SyntaxKind.ArrayLiteralExpression)
                return;
            if (p.getKind() === ts_morph_1.SyntaxKind.PropertyAssignment &&
                ((_a = p.getParent()) === null || _a === void 0 ? void 0 : _a.getKind()) === ts_morph_1.SyntaxKind.ObjectLiteralExpression)
                return;
            node.replaceWithText(name + ".value");
        }
        // --- Table validation ---
        if (kind === ts_morph_1.SyntaxKind.CallExpression) {
            const callNode = node;
            const callee = callNode.getExpression().getText();
            // if (!["table", "tr", "td", "th"].includes(callee)) return;
            const childrenArg = callNode.getArguments()[1];
            if (!childrenArg)
                return;
            const childTags = collectChildTags(childrenArg);
            if (callee === "table") {
                const invalid = childTags.filter(tag => tag !== "tr");
                if (invalid.length)
                    throw new Error(`Table contains invalid direct children: ${invalid.join(", ")}`);
            }
            if (callee === "tr") {
                const invalid = childTags.filter(tag => tag !== "td" && tag !== "th");
                if (invalid.length)
                    throw new Error(`tr contains invalid direct children: ${invalid.join(", ")}`);
            }
        }
    });
    // -----------------------------
    // Step 3: Save processed file
    // -----------------------------
    sourceFile.saveSync();
    const finalCode = fs.readFileSync(tempPath, "utf-8");
    fs.writeFileSync(outputPath, finalCode, "utf-8");
    console.log("Preprocessed:", file);
    fs.unlinkSync(tempPath);
});
