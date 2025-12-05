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
    SyntaxList,
    Identifier,
    SourceFile,
    CallExpression,
    IfStatement,
    ForOfStatement,
    TypeChecker,
    ArrayLiteralExpression
} from "ts-morph";

import { isHtmlTag } from "../runtime/dom.js";
import * as fs from "fs";
import * as path from "path";

const RUNTIME_HELPERS_MAP: Record<string, string> = {
    '__cl_set': '__cl_set',
    '__if': '__if',
    '__each': '__each',
};

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

function unwrapReactiveIdentifiersInExpression(n: Node, reactiveVars: Set<string>, computeVars: Set<string>): string {
    let text = n.getText();
    n.forEachDescendant(child => {
        if (child.getKind() === SyntaxKind.Identifier) {
            const name = child.getText();
            if (reactiveVars.has(name) || computeVars.has(name)) {
                // Simple string replacement for unwrap inside expression
                text = text.replace(new RegExp(`\\b${name}\\b`, 'g'), `${name}.value`);
            }
        }
    });
    return text;
}


function isUsedInHtmlContent(node: Node): boolean {
  let currentNode: Node | undefined = node;
  while(currentNode) {
    const currentParent = currentNode.getParent();
    if (currentParent?.isKind(SyntaxKind.CallExpression) && isHtmlTag(currentParent.getExpression().getText())) {
      const args = currentParent.asKindOrThrow(SyntaxKind.CallExpression).getArguments();
    
      if (args.includes(currentNode as any)) {
         return true;
      }
    }

    if (currentParent?.isKind(SyntaxKind.ArrayLiteralExpression) || 
        currentParent?.isKind(SyntaxKind.BinaryExpression) ||
        currentParent?.isKind(SyntaxKind.ParenthesizedExpression) ||
        currentParent?.isKind(SyntaxKind.TemplateExpression)
      ) {
      currentNode = currentParent;
    } else {
      break;
    }
  }
  return false;
}

function getClarityCallType(node: Node | undefined): { type: string, isArray: boolean, isObject: boolean } | null {
    if (!node || !node.isKind(SyntaxKind.CallExpression)) return null;

    const call = node.asKindOrThrow(SyntaxKind.CallExpression);
    const expression = call.getExpression();
    if (!expression.isKind(SyntaxKind.Identifier)) return null;
    
    const funcName = expression.getText();
    let type = '';
    
    if (funcName === 'reactive' || funcName === 'share') {
        type = 'reactive';
    } else if (funcName === 'computed') {
        type = 'computed';
    } else if (funcName === 'persistent') {
        type = 'persistent';
    } else if (funcName === 'session') {
        type = 'session';
    } else {
        return null;
    }

    let isArray = false;
    let isObject = false;

    if (type === 'reactive' || type === 'share') {
        const firstArg = call.getArguments()[0];
        isArray = firstArg?.isKind(SyntaxKind.ArrayLiteralExpression) ?? false;
        isObject = firstArg?.isKind(SyntaxKind.ObjectLiteralExpression) ?? false;
    } else if (type === 'computed') {
    } else {
        const secondArg = call.getArguments()[1];
        if (secondArg) {
            isArray = secondArg.isKind(SyntaxKind.ArrayLiteralExpression) ?? false;
            isObject = secondArg.isKind(SyntaxKind.ObjectLiteralExpression) ?? false;
        }
    }

    return { type, isArray, isObject };
}


const arrayMethods = new Set([
    "push", "pop", "shift", "unshift", "splice", "sort", "reverse", "map", "filter", "forEach", "length"
]);

export function preprocessCode(code: string, filePath: string): string {
    if (!filePath.endsWith(".cl.ts")) return code;

    const reactiveVars = new Set<string>();
    const reactiveArrays = new Set<string>();
    const reactiveObjects = new Set<string>();
    const computeVars = new Set<string>();
    const runtimeHelpersUsed = new Set<string>();

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
                    
                    if (type === "reactive" || type === "share") {
                        const trimmed = value?.trim();
                        if (trimmed?.startsWith("[") && trimmed.endsWith("]")) {
                            reactiveArrays.add(currentVar);
                        } else if (trimmed?.startsWith("{") && trimmed.endsWith("}")) {
                            reactiveObjects.add(currentVar);
                        }
                        reactiveVars.add(currentVar);
                        outputLines.push(`let ${currentVar} = reactive(${value});`);
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
                
                if (type === "reactive" || type === "share") {
                    const trimmed = value?.trim();
                    if (trimmed?.startsWith("[") && trimmed.endsWith("]")) {
                        reactiveArrays.add(currentVar);
                    } else if (trimmed?.startsWith("{") && trimmed.endsWith("}")) {
                        reactiveObjects.add(currentVar);
                    }
                    reactiveVars.add(currentVar);
                    outputLines.push(`const ${currentVar} = reactive(${value});`);
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

    let tempCode = outputLines.join("\n");
    const project = new Project();
    const sourceFile = project.createSourceFile("__temp.ts", tempCode, { overwrite: true });
    
    // --- 2.A. AST Variable Collection (Handling standard TS declarations: const todos = reactive([...])) ---
    sourceFile.forEachDescendant(node => {
        if (node.isKind(SyntaxKind.VariableDeclaration)) {
            const declaration = node.asKindOrThrow(SyntaxKind.VariableDeclaration);
            const varName = declaration.getName();

            // Skip if already tracked by the regex step
            if (reactiveVars.has(varName) || computeVars.has(varName)) return;

            // Check if the initializer is a call to a Clarity helper function (reactive, computed, etc.)
            const result = getClarityCallType(declaration.getInitializer());

            if (result) {
                if (result.type === 'reactive' || result.type === 'share' || result.type === 'persistent' || result.type === 'session') {
                    reactiveVars.add(varName);
                    if (result.isArray) reactiveArrays.add(varName);
                    if (result.isObject) reactiveObjects.add(varName);
                } else if (result.type === 'computed') {
                    computeVars.add(varName);
                }
            }
        }
    });

    // 2.B. Import Handling for Shared Variables
    const dir = path.dirname(filePath);
    sourceFile.getImportDeclarations().forEach((imp: ImportDeclaration) => {
        const modulePath = imp.getModuleSpecifierValue();
        if (!modulePath.startsWith('.')) return;

        const resolvedPath = path.resolve(path.dirname(dir), "src/" + modulePath + '.ts');
        if (fs.existsSync(resolvedPath)) {
             const code = fs.readFileSync(resolvedPath, 'utf-8');
             imp.getNamedImports().forEach(named => {
                 const name = named.getName();
                 const storeRegex = new RegExp(`\\bshare\\s+${name}\\b`);
                 if (storeRegex.test(code)) {
                     reactiveVars.add(name);
                 }
             });
        }
    });

    // 3. AST Traversal and Rewriting
    sourceFile.forEachDescendant((node: Node) => {
        const kind = node.getKind();
        const parent = node.getParent();

        // --- A. Write Context Rewrites (using __cl_set) ---

        // A.1. Simple/Compound Assignment (LHS of BinaryExpression)
        if (parent?.isKind(SyntaxKind.BinaryExpression)) {
            const bin = parent.asKindOrThrow(SyntaxKind.BinaryExpression);
            const opKind = bin.getOperatorToken().getKind();
            const identifierText = node.isKind(SyntaxKind.Identifier) ? node.getText() : null;

            if (bin.getLeft() === node && identifierText && reactiveVars.has(identifierText)) {
                
                if (bin.getParent()?.isKind(SyntaxKind.VariableDeclaration)) return;

                runtimeHelpersUsed.add('__cl_set');
                
                const assignmentOperators = new Set([
                    SyntaxKind.EqualsToken, 
                    SyntaxKind.PlusEqualsToken, 
                    SyntaxKind.MinusEqualsToken,
                    SyntaxKind.AsteriskEqualsToken,
                    SyntaxKind.SlashEqualsToken,
                    SyntaxKind.PercentEqualsToken,
                ]);

                if (opKind === SyntaxKind.EqualsToken) {
                    // FIX: Unwrap reactive variables in the RHS to ensure we read the value, not the Signal object.
                    const unwrappedRHS = unwrapReactiveIdentifiersInExpression(bin.getRight(), reactiveVars, computeVars);
                    bin.replaceWithText(`__cl_set(${identifierText}, ${unwrappedRHS})`);
                    return;
                } else if (assignmentOperators.has(opKind)) {
                    const operator = bin.getOperatorToken().getText().replace("=", ""); 
                    const rightSideText = bin.getRight().getText();
                    // For compound assignment, we rely on the internal .value injection to handle the full expression.
                    const newValueExpr = `${identifierText}.value ${operator} ${rightSideText}`;
                    bin.replaceWithText(`__cl_set(${identifierText}, ${newValueExpr})`);
                    return;
                }
            }
        }

        // A.2. Unary Operations (Prefix/Postfix)
        if (parent?.isKind(SyntaxKind.PrefixUnaryExpression) || parent?.isKind(SyntaxKind.PostfixUnaryExpression)) {
            const unary = parent as PrefixUnaryExpression | PostfixUnaryExpression;
            const opKind = unary.getOperatorToken(); 
            const identifierText = node.isKind(SyntaxKind.Identifier) ? node.getText() : null;

            if (identifierText && reactiveVars.has(identifierText)) {
                const operand = unary.getOperand();
                if (operand.isKind(SyntaxKind.Identifier) && operand.getText() === identifierText) {
                    
                    runtimeHelpersUsed.add('__cl_set');

                    if (opKind === SyntaxKind.PlusPlusToken) { 
                        unary.replaceWithText(`__cl_set(${identifierText}, ${identifierText}.value + 1)`);
                        return;
                    } else if (opKind === SyntaxKind.MinusMinusToken) { 
                        unary.replaceWithText(`__cl_set(${identifierText}, ${identifierText}.value - 1)`);
                        return;
                    }
                }
            }
        }

        // --- B. Template Control Flow & Iteration ---
        
        // B.1. Check for explicit calls to runtime control flow functions
        if (node.isKind(SyntaxKind.CallExpression)) {
            const call = node.asKindOrThrow(SyntaxKind.CallExpression);
            const expression = call.getExpression();

            if (expression.isKind(SyntaxKind.Identifier)) {
                const name = expression.getText();
                if (name === '__if') {
                    runtimeHelpersUsed.add('__if');
                } else if (name === '__each') {
                    runtimeHelpersUsed.add('__each');
                }
            }
        }

        // B.2. Array.prototype.forEach Rewrite (DX improvement)
        if (node.isKind(SyntaxKind.CallExpression)) {
            const call = node.asKindOrThrow(SyntaxKind.CallExpression);
            const expression = call.getExpression();

            if (expression.isKind(SyntaxKind.PropertyAccessExpression)) {
                const pae = expression.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
                const propName = pae.getName(); // 'forEach'
                const objName = pae.getExpression().getText(); // e.g., 'todos'

                // Only apply rewrite if iterating over a reactive array INSIDE an HTML call
                if (propName === 'forEach' && reactiveArrays.has(objName) && isInsideHtmlCall(call)) {
                    const callback = call.getArguments()[0]; 
                    
                    // Check if the argument is a callback function
                    if (callback && (callback.isKind(SyntaxKind.ArrowFunction) || callback.isKind(SyntaxKind.FunctionExpression))) {
                        runtimeHelpersUsed.add('__each');
                        
                        // Ensure the reactive variable is correctly wrapped in a getter function 
                        const callbackText = callback.getText();
                        call.replaceWithText(`__each(() => ${objName}.value, ${callbackText})`);
                        return;
                    }
                }
            }
        }

        // --- C. Read Context Rewrites ---

        // Template Literals (Rewritten to return an Array of children, with reactive parts as computed Signals)
        if (kind === SyntaxKind.TemplateExpression) {
            if (!isInsideHtmlCall(node)) return;
            const parts: string[] = [];
            const templateNode = node as TemplateExpression;
            
            // Get the head text (first part of the literal).
            const headText = templateNode.getHead().getText().slice(1, -2);
            if (headText) parts.push(JSON.stringify(headText));
            
            templateNode.getTemplateSpans().forEach(span => {
                const exprNode = span.getExpression();

                // 1. Unwrap reactive identifiers inside the expression
                const exprText = unwrapReactiveIdentifiersInExpression(exprNode, reactiveVars, computeVars);
                
                // 2. Wrap the dynamic expression in a computed call: computed(() => (expression))
                // This ensures the VNode structure Array<Child> is met: [string, Signal<string>, string]
                parts.push(`computed(() => (${exprText}))`);

                // 3. Get the literal text (parts between expressions).
                const lit = span.getLiteral().getText().slice(1, -1);
                if (lit) parts.push(JSON.stringify(lit));
            });

            // Output the VNode array literal. This is the correct, type-safe VNode structure for interleaved content.
            node.replaceWithText(`[${parts.join(", ")}]`);
            return;
        }

        // Binary Expression (PlusToken) - Keep as single string getter (safer for concatenation)
        if (kind === SyntaxKind.BinaryExpression) {
            if (!isInsideHtmlCall(node)) return;
            const bin = node.asKindOrThrow(SyntaxKind.BinaryExpression);
            if (bin.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
                const parts = flattenPlus(node);
                // Unwrap reactive identifiers in each part before joining
                const transformed = parts.map((part) => {
                    const text = unwrapReactiveIdentifiersInExpression(part, reactiveVars, computeVars);
                    // Wrap in parentheses for safe concatenation
                    return `(${text})`; 
                });
                
                // Concatenate into a single string expression inside the getter function.
                // This resolves complex concatenation to a single string child.
                node.replaceWithText(`() => ${transformed.join(" + ")}`);
                return;
            }
        }

        // C.1. Property Access Expression Unwrap (To catch properties of loop variables that are Signals)
        if (kind === SyntaxKind.PropertyAccessExpression) {
            const pae = node.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            
            if (isUsedInHtmlContent(pae)) {
                const expressionText = pae.getExpression().getText();
                const propertyName = pae.getName();

                // If the root is not a globally tracked reactive var (i.e., it's a local loop variable like 'item'),
                // and it's not a known array method, we assume the property needs unwrapping.
                if (!reactiveVars.has(expressionText) && !computeVars.has(expressionText)) {
                    if (!arrayMethods.has(propertyName)) {
                        pae.replaceWithText(`${pae.getText()}.value`);
                        return;
                    }
                }
            }
        }


        // C.2. Identifier (Final catch-all .value injection)
        if (kind === SyntaxKind.Identifier) {
            const name = node.getText();
            if (!reactiveVars.has(name) && !computeVars.has(name) && !reactiveObjects.has(name)) return;
            
            // Skip declarations
            if (parent?.isKind(SyntaxKind.VariableDeclaration)) return;

            // 0. UNIVERSAL SKIP: Skip unwrap if the signal is the first argument to __if or __each.
            if (parent?.isKind(SyntaxKind.CallExpression)) {
                const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
                const funcName = call.getExpression().getText();
                
                // If it's __if(signal, ...) or __each(signal, ...)
                if ((funcName === "__if" || funcName === "__each") && call.getArguments()[0] === node) {
                    return; // Pass the raw signal for dependency tracking
                }
            }

            // Reactive Property Access (e.g., todos.length or todos.push())
            if (
                parent &&
                parent.getKind() === SyntaxKind.PropertyAccessExpression &&
                (reactiveVars.has(name) || computeVars.has(name))
            ) {
                const pae = parent as PropertyAccessExpression;
                const rootName = pae.getExpression().getText();
                const lastProp = pae.getName();
                
                // Array methods / length: unwrap (items.push -> items.value.push)
                if (reactiveVars.has(rootName) && reactiveArrays.has(rootName) && arrayMethods.has(lastProp)) {
                    if (pae.getParent()?.isKind(SyntaxKind.CallExpression) || lastProp === "length") {
                         pae.replaceWithText(`${rootName}.value.${lastProp}`);
                         return;
                    }
                } 
                // Object Deep Access: unwrap (obj.x -> obj.x.value)
                else if (reactiveVars.has(rootName) && reactiveObjects.has(rootName)) {
                    // This case is typically handled by C.1 if used as content, or we fall through to the general unwrap.
                }
            }

            // Direct Array Access Read (must unwrap to get to the underlying array)
            if (reactiveVars.has(name) && reactiveArrays.has(name)) {
                // If it's a reactive array variable being read directly (e.g., in an array method call outside VNode context), unwrap it.
                if (!parent?.isKind(SyntaxKind.PropertyAccessExpression)) {
                    node.replaceWithText(name + ".value");
                    return;
                }
            }
            
            // 1. Skip unwrap if inside style
            if (isInsideStyle(node)) return; 
            
            // 2. Check if inside PropertyAssignment (attribute value). If so, skip unwrap (preserve signal proxy).
            let isInsidePropertyAssignment = false;
            let p = parent;
            while(p) {
                if (p.isKind(SyntaxKind.PropertyAssignment)) {
                    isInsidePropertyAssignment = true;
                    break;
                }
                // Stop at the VNode CallExpression level
                if (p.isKind(SyntaxKind.CallExpression) && isHtmlTag(p.getExpression().getText())) break;
                p = p.getParent();
            }
            if (isInsidePropertyAssignment) return; // Skip unwrap for attributes

            // 3. Skip unwrap if the identifier is a direct VNode content argument.
            if (parent?.isKind(SyntaxKind.CallExpression)) {
                const call = parent.asKindOrThrow(SyntaxKind.CallExpression);
                if (isHtmlTag(call.getExpression().getText())) {
                    const args = call.getArguments();
                    
                    if (args.includes(node as any)) {
                        // Found a raw signal used directly as VNode content. Do NOT unwrap.
                        return;
                    }
                }
            }

            // 4. General unwrap for all other expressions/logic
            node.replaceWithText(name + ".value");
            return;
        }
    });

    // 4. Inject Conditional Imports
    const helpersToImport = Array.from(runtimeHelpersUsed)
        .map(key => RUNTIME_HELPERS_MAP[key])
        .filter(Boolean);

    if (helpersToImport.length > 0) {
        // Updated import path based on user preference
        const importStatement = `import { ${helpersToImport.join(", ")} } from "@fracipolla/clarity";`;
        
        const lastImport = sourceFile.getImportDeclarations().pop();
        
        if (lastImport) {
            sourceFile.insertText(lastImport.getEnd(), `\n\n${importStatement}`);
        } else {
            sourceFile.insertText(0, `${importStatement}\n\n`);
        }
    }

    return sourceFile.getFullText().replaceAll(".value.value", ".value");
}