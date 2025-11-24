import { reactive, effect, div, p, button } from "@fracipolla/clarity";

// Example reactive variable
reactive count = 0;

// Page structure using your transformed template literals syntax
const page = div(
  {},
  p(`Count: ${count}`),
  button({ onclick: () => count++ }, "Increment")
);

document.body.appendChild(page);

// Logging effect
effect(() => console.log("Count updated:", count));
