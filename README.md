# Clarity Framework

**Clarity** is a lightweight, zero-boilerplate UI framework that delivers exceptional performance by compiling a simple functional DSL directly to tagged template literals and managing state via fine-grained Signals. **No Virtual DOM, only pure speed.**

## 💡 Core Philosophy

Clarity achieves native-like performance by shifting the heavy lifting from the browser's runtime to the **build phase**.

| Feature | Mechanism | Benefit |
| :--- | :--- | :--- |
| **Syntax** | Functional Hyperscript DSL (`div()`, `h1()`) | Pure functional composition, great TypeScript integration. |
| **Compilation** | **TypeScript Compiler API (TSC Transformer)** | Translates DSL calls directly into optimized JavaScript and HTML. |
| **Rendering** | Tagged Template Literals (`html\`...\`\`) | Fast initial DOM creation by leveraging native browser parsing. |
| **Reactivity** | **Signals** | Surgical DOM updates (patching) without the need for VDOM diffing. |

-----

## Getting Started

To start a new project using Clarity, you need Node.js, TypeScript, and a way to execute your custom compiler pipeline.

### Step 1: Project Setup

Create your project directory and install necessary tools.

```bash
mkdir clarity-app && cd clarity-app
npm init -y
npm install typescript @types/node ts-node --save-dev
# Install your core framework files (Signals, DSL, Runtime, etc.) 
# These will be implemented in Step 4.
```

Create a `tsconfig.json` file:

```bash
npx tsc --init
```

### Step 2: Write the Core Code (Conceptual)

Your final project will require three main components:

1.  **`src/signals.ts`**: The reactivity engine (`createSignal`, `createEffect`).
2.  **`src/dsl.ts`**: The functional tag definitions (`div`, `h1`).
3.  **`src/transformer.ts`**: The core logic that converts `div(...)` calls into `html\`...\`\` strings.

### Step 3: Configure the Build Command

Since Clarity requires a custom build step (the TSC Transformer), you'll use a Node script to run the compilation:

```json
// package.json snippet
"scripts": {
  "build": "node scripts/run-compiler.js",
  "start": "npm run build && node dist/index.js" 
}
```

*(The `run-compiler.js` script will execute the TSC API and inject your custom transformer.)*

-----

## 🎨 Clarity DSL: The Functional Syntax

Clarity uses a powerful functional syntax that offers maximum clarity and eliminates the need for empty props objects (`{}`) when not required.

### Syntax Rule: Props are Optional

A tag function accepts arguments based on type:

| Case | Syntax | Interpretation by Compiler |
| :--- | :--- | :--- |
| **Props and Children** | `div({ id: 'main' }, h1('Title'))` | First argument is **Props**. |
| **Only Children** | `div(h1('Title'), p('Text'))` | First argument is a **Child**. Props are implicitly `{}`. |
| **Only Props** | `div({ onclick: handler })` | Props are present, children are absent. |

### Example Component: `Counter.ts`

This demonstrates the clean composition and use of Signals.

```typescript
import { createSignal } from '../core/signals'; 
import { div, button, p } from '../core/dsl'; // Your compiled tag functions

export const Counter = () => {
  const [count, setCount] = createSignal(0);

  const increment = () => setCount(count() + 1);

  // Functional component composition: clear separation of concerns
  return div(
    { class: 'counter-widget' }, // Props
    p({}, `Current count: ${count()}`), // Child 1: Reads signal
    button(
      { onclick: increment }, // Child 2: Triggers update
      'Click to Increment' 
    )
  );
};
```

### Example Component: Props with Default Values

Props can be defined as optional in the interface, and assigned a default value inside the functional component using standard JavaScript destructuring.

```typescript
// Component: Title.ts
interface TitleProps {
  text: string;
  level?: 1 | 2; // Optional prop
}

const Title = (props: TitleProps) => {
  // 💡 Assigns default value if props.level is undefined
  const { text, level = 1 } = props; 

  if (level === 1) {
    return h1({}, text);
  }
  // ... else return h2, etc.
  return div({}, text); 
};
```

-----

## 🧠 Advanced Concepts: TypeScript Generics

Clarity strongly encourages the use of TypeScript Generics for **type safety**, especially when defining custom components and signals.

### 1\. Custom Component Type Safety

Use Generics to ensure consumers of your component pass the correct properties. The TSC removes these in the build, but they are crucial for developer experience.

```typescript
// Define your Props interface
interface ListProps<T> {
  items: T[]; // The list can handle any type T
}

// The custom component uses the Generic
export function ItemList<T>(props: ListProps<T>) {
  // ... Component logic using props.items
  return div({}, 'List rendered'); 
}
```

### 2\. Signal Type Safety

Generics are used to strictly type the data held by your reactive signals.

```typescript
// Ensures 'user' can only hold an object of type UserProfile or null
const [user, setUser] = createSignal<UserProfile | null>(null); 
```

The TSC Transformer relies on the clarity of this functional structure to perform the most critical step: generating the optimized Template Literal code.
