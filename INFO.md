## Esempio Minimale del TSC Transformer

L'obiettivo è trasformare il codice utente (DSL) in un Template Literal marcato, senza modificarlo in modo semantico (per semplicità, ignoreremo l'iniezione dei segnali).

### 1\. File di Definizione del DSL (Punto d'Ingresso)

**File:** `src/dsl.ts`

Questo è solo un file di *placeholder* per la tipizzazione e l'importazione.

```typescript
// src/dsl.ts

// 💡 Definisce la firma del tuo DSL per l'IntelliSense
type Props = Record<string, any>;
type Node = string | number | boolean | any; // Un nodo figlio

// Le funzioni reali saranno SVUOTE. Saranno rimosse dal Transformer.
export const div = (props: Props, ...children: Node[]): Node => {
  throw new Error("Il DSL non deve essere chiamato in runtime!");
};

export const h1 = (props: Props, ...children: Node[]): Node => {
  throw new Error("Il DSL non deve essere chiamato in runtime!");
};

// Funzione placeholder per il runtime del Template Literal
export const html = (strings: TemplateStringsArray, ...values: any[]) => {
  // Questa sarà la tua libreria di runtime (Passo 3)
};
```

-----

### 2\. Il TSC Transformer (Il Compilatore Personalizzato)

**File:** `src/transformer.ts`

Questo modulo contiene la logica che analizza l'AST e sostituisce le chiamate a `div()` e `h1()` con i Template Literals.

```typescript
// src/transformer.ts
import * as ts from 'typescript';

// 1. Helper: Riconosce una chiamata al tuo DSL (es. div)
const isDSLCall = (node: ts.Node): node is ts.CallExpression => {
    if (!ts.isCallExpression(node)) return false;

    const identifier = ts.isIdentifier(node.expression) 
        ? node.expression 
        : ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name) 
            ? node.expression.name
            : null;
            
    if (!identifier) return false;
    
    // Controlla se il nome è 'div' o 'h1' (devi estendere la logica con gli imports)
    const tagName = identifier.text;
    return tagName === 'div' || tagName === 'h1';
};

// 2. Helper: Trasforma una chiamata DSL in una stringa HTML
const callToHtmlString = (node: ts.CallExpression, tagName: string): string => {
    // ⚠️ Logica Simplificata: Ignora props e gestisce solo il primo figlio
    const childNode = node.arguments[1]; // Presume che il figlio sia il secondo argomento
    
    let childContent = '';
    if (childNode) {
        // Estrai il contenuto del figlio (per semplicità, solo se è una stringa letterale)
        childContent = ts.isStringLiteral(childNode) ? childNode.text : `$\{${childNode.getText()}\}`;
    }

    return `<${tagName}>${childContent}</${tagName}>`;
};

// 3. La funzione principale del Transformer
export default function createTransformer(): ts.TransformerFactory<ts.SourceFile> {
    return (context) => (sourceFile) => {
        
        const visitor = (node: ts.Node): ts.Node => {
            
            if (isDSLCall(node)) {
                const tagName = (node.expression as ts.Identifier).text;
                const htmlString = callToHtmlString(node, tagName);

                // Crea un Template Literal marcato (html`<...htmlString...>`)
                const templateLiteral = ts.createNoSubstitutionTemplateLiteral(htmlString);
                
                return ts.createTaggedTemplateExpression(
                    ts.createIdentifier('html'), // Il tag: la funzione 'html' da dsl.ts
                    templateLiteral 
                );
            }
            
            // Continua a visitare i nodi figli ricorsivamente
            return ts.visitEachChild(node, visitor, context);
        };

        return ts.visitNode(sourceFile, visitor);
    };
}
```

-----

### 3\. Codice Utente (Input)

**File:** `example/input.ts`

Questo è il codice che l'utente scriverà.

```typescript
// example/input.ts
import { div, h1 } from '../src/dsl';

const count = () => 42; // Simula la lettura di un Segnale

// Il tuo DSL a funzioni pure
const App = div(
  { id: 'main-container' },
  h1({}, 'Ciao Mondo'),
  div({}, `Il conteggio è ${count()}`) // Espressione dinamica
);

// Il Transformer dovrà sostituire le chiamate a div e h1
```

-----

### 4\. Risultato del Transformer (Output JS)

Il TSC API genererà un file JS simile a questo, ma con i nodi AST corretti:

**File:** `example/output.js` (Generato dopo la trasformazione)

```javascript
// example/output.js (Approssimazione)
import { html } from '../src/dsl';

const count = () => 42;

// Il tuo Transformer ha convertito le chiamate nidificate!
const App = html`<div id="main-container"><h1>Ciao Mondo</h1><div>Il conteggio è ${count()}</div></div>`;

// Il runtime 'html' riceve questa Template Literal e crea/aggiorna il DOM.
```

-----

## 5\. Esecuzione (Come usare il Transformer)

Per eseguire il tuo transformer, devi creare uno script Node.js che chiami l'API di compilazione di TypeScript.

**File:** `scripts/run-compiler.js`

```javascript
// scripts/run-compiler.js
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const createTransformer = require('../src/transformer').default;

const inputFilePath = path.join(__dirname, '../example/input.ts');
const outputFilePath = path.join(__dirname, '../example/output.js');

const inputCode = fs.readFileSync(inputFilePath, 'utf8');

// Crea il compilatore
const program = ts.createProgram([inputFilePath], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    rootDir: path.join(__dirname, '..'),
    outDir: path.join(__dirname, '../dist'),
    jsx: ts.JsxEmit.None // Importante: non usare il JSX standard
});

const emitResult = program.emit(
    program.getSourceFile(inputFilePath),
    (fileName, data) => {
        // Funzione per scrivere il file
        fs.writeFileSync(outputFilePath, data); 
    },
    undefined, // CancellationToken
    false,     // OnlyDts
    { before: [createTransformer()] } // ⚠️ INIEZIONE DEL TUO TRANSFORMER QUI
);

if (emitResult.diagnostics.length > 0) {
    console.error("Errore durante la compilazione!");
    // ... gestisci gli errori
} else {
    console.log(`Compilazione completata. Output in ${outputFilePath}`);
}

// Esegui con: node scripts/run-compiler.js
```
