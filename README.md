# Clarity

Clarity is a lightweight reactive programming framework for building reactive DOM applications. Inspired by frameworks like Vue and Svelte, Clarity provides reactive variables, computed properties, and declarative DOM rendering with minimal overhead.

---

## Overview

Clarity allows you to create reactive applications using a simple, declarative syntax:

```ts
div(
  p("Hello"),
  button({ onclick: () => count++ }, "Increment")
)
```
It supports reactive state, computed properties, effects, and persistent stores.

---

## Core Concepts
### 1. Reactive Variables
- Declared with reactive:
```
reactive count = 0;
```

- Tracks reads and writes automatically.
- Accessed internally with .value, but the preprocessor handles unwrapping in read contexts.
- Nested objects are reactive:
```
reactive obj = { x: 1, y: { z: 2 } };
```
- Arrays are not reactive yet – mutating them does not trigger updates.

---

### 2. Computed Variables

Declared with computed:
```
computed doubleCount = count * 2;
```
- Computed callbacks automatically unwrap dependencies’ .value:
```
let doubleCount = computed(() => count.value * 2);
```
- Updates automatically when reactive dependencies change.

---

### 3. Template Literals

- Reactive variables are automatically unwrapped inside templates:
```
p(`Counter: ${count}`);
```
Preprocessed to:
```
p(["Counter: ", count.value]);
```
- Nested property access works too:
```
reactive obj = { x: 1 };
p(`Value: ${obj.x}`);
```
Preprocessed to:
```
p(["Value: ", obj.x.value]);
```

---

### 4. DOM Rendering
- Use div(), p(), button(), etc.
- Attributes and styles can be reactive:
```
div({ style: { borderColor: color } }, "Test");
```
- color can be reactive or computed, automatically updating the DOM.
- Reactive children lists are not implemented yet. Dynamic arrays of DOM children require array reactivity.

---

### 5. Effects
- Use effect() to run functions when reactive dependencies change:
```
effect(() => console.log(count));
```
- The preprocessor automatically appends .value in read contexts.

---

### 6. Stores and Global Variables

Clarity supports reactive variables that can be shared or persisted:

| Keyword   | Description                                        |
| --------- | -------------------------------------------------- |
| `global`  | In-memory reactive variable shared across modules. |
| `store`   | Reactive variable persisted to `localStorage`.     |
| `session` | Reactive variable persisted to `sessionStorage`.   |


**Example:**
```
store count = 0;        // synced with localStorage
global theme = "dark";  // shared in-memory
```
- Imported reactive variables are tracked to avoid shadowing.
- Local declarations cannot override imported globals/stores.

---

## Preprocessor Responsibilities
1. Detect reactive, computed, global, store, and session variables.
2. Rewrite reads/writes with .value where needed.
3. Handle property accesses (obj.x) and nested objects.
4. Expand template literals and DOM children.
5. Mark store/session variables for automatic persistence.

## Missing Features / Future Work

1. Array Reactivity – currently, array mutations do not trigger updates.
2. Reactive Children Lists – dynamically generated DOM children need array reactivity.
3. Destructuring Reactive Objects – e.g., let { x } = obj; is currently not reactive.
4. Global / Store Restore Across Pages – load persisted store/session values automatically.
5. Shadowing Prevention – prevent redeclaration of imported reactive variables.
6. Advanced Computed Dependency Tracking – optimize recalculation and avoid unnecessary effects.

---

Example Usage
```
reactive count = 0;
computed doubleCount = count * 2;

div(
  p(`Counter: ${count}`),
  p(`Double: ${doubleCount}`),
  button({ onclick: () => count++ }, "Increment")
);

store theme = "light";
div({ style: { backgroundColor: theme } }, "Theme box");
```

---

## Notes
- Clarity uses Proxies for reactivity.
- Computed values automatically track dependencies.
- The preprocessor ensures all necessary .value unwraps.
- Deeply nested objects are reactive.
- Currently, arrays are not reactive and destructuring is limited.