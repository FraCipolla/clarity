Clarity Language - README
Overview

Clarity is a small, lightweight programming language / DSL for building HTML interfaces with reactive variables, minimal syntax, and full TypeScript compatibility.

Key points:

Components are plain functions returning HTML-like structures.

Variables can be made reactive using reactive.

Reactive side-effects are handled via effect.

DOM references use ref().

Async functions work natively.

Imports and npm packages are used like normal JavaScript/TypeScript.

Table of Contents

Installation and Project Setup

Core Concepts

Components

Reactive Variables

Effects

Refs

Async Functions

Canvas

Cookies

Root Mount

Imports and Packages

Example App

1. Installation and Project Setup

Initialize project:

mkdir clarity-app && cd clarity-app
npm init -y
npm install typescript @types/node ts-node --save-dev


Create tsconfig.json:

npx tsc --init


Create project structure:

clarity-app/
├─ src/
│  ├─ core/
│  │  ├─ reactive.ts
│  │  ├─ effect.ts
│  │  └─ ref.ts
│  ├─ components/
│  └─ App.ts
├─ scripts/
│  └─ run-compiler.js
├─ package.json


Add build and start scripts to package.json:

"scripts": {
  "build": "node scripts/run-compiler.js",
  "start": "npm run build && node dist/index.js"
}

2. Core Concepts
2.1 Components

Components are functions returning HTML elements:

function Header() {
  return div(
    p("Welcome"),
    button({ onclick: () => console.log("Clicked") }, "Click me")
  );
}

2.2 Reactive Variables

Declare reactive variables with reactive. Access them like normal variables.

function Counter() {
  reactive count = 0;

  return div(
    p("Count: ", count),
    button({ onclick: () => count++ }, "Increment")
  );
}


Reactive variables automatically update any part of the UI where they are used.

You can assign to them normally: count = 10.

2.3 Effects

effect runs a function whenever reactive variables inside it change. It can also return a cleanup function.

effect(() => {
  console.log("Count changed:", count);
});


If no reactive variables are used, effect runs once (like onMount).

Useful for side-effects: async fetches, WebSockets, DOM updates, etc.

2.4 Refs

Use ref() to access DOM elements directly, e.g., for canvas or imperative updates:

const canvasRef = ref();

effect(() => {
  if (!canvasRef) return;
  const ctx = canvasRef.getContext("2d");
  ctx.fillStyle = "red";
  ctx.fillRect(0, 0, 100, 100);
});

3. Async Functions

Async functions are standard JavaScript async functions. They work naturally with reactive variables:

button(async () => {
  const res = await fetch("/api/data");
  data = await res.json();
}, "Load Data");


No special syntax is needed.

4. Canvas

Use canvas with a ref() and draw imperatively in an effect. Reactive variables can control the drawing:

reactive size = 50;
const canvasRef = ref();

effect(() => {
  const ctx = canvasRef.getContext("2d");
  ctx.clearRect(0, 0, 300, 200);
  ctx.fillRect(0, 0, size, size);
});

5. Cookies

Cookies are accessible using standard JS document.cookie, or you can wrap them in a reactive helper:

function useCookie(name: string, defaultValue = "") {
  reactive value = defaultValue;

  effect(() => {
    const match = document.cookie.match(new RegExp(name + "=([^;]+)"));
    if (match) value = match[1];
  });

  function setCookie(newValue: string) {
    document.cookie = `${name}=${newValue}; path=/`;
    value = newValue;
  }

  return [value, setCookie];
}

// Usage
const [theme, setTheme] = useCookie("theme", "light");

6. Root Mount

To start your app, mount your root component:

import { App } from "./App";
import { start } from "./core/runtime";

start(App, "#root");


start() waits for the DOM to be ready and renders the root component.

7. Imports and Packages

Use normal JS/TS imports:

import { reactive, effect, ref } from "./core";
import { format } from "date-fns";


npm packages are supported and installed via package.json.

The compiler leaves imports intact; bundlers like esbuild/Vite can handle them.

8. Example App
// src/App.ts
import { div, p, button, canvas } from "./core/dsl";
import { reactive, effect, ref } from "./core";

function App() {
  reactive count = 0;
  reactive size = 50;
  const canvasRef = ref();

  effect(() => {
    console.log("Count changed:", count);
  });

  effect(() => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    ctx.clearRect(0, 0, 300, 200);
    ctx.fillRect(0, 0, size, size);
  });

  return div(
    p("Count: ", count),
    button({ onclick: () => count++ }, "Increment"),
    button({ onclick: () => size += 10 }, "Increase Box"),
    canvas({ width: 300, height: 200, ref: canvasRef })
  );
}

// src/index.ts
import { start } from "./core/runtime";
import { App } from "./App";

start(App, "#root");


Reactive variables update UI automatically.

Async functions, canvas drawing, and effects are fully supported.

Imports and npm packages work like normal JavaScript.
