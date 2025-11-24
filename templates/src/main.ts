import { reactive, effect, div, p, button } from "clarity";
import ClarityPlugin from "clarity/vite-plugin";

// Example reactive variable
reactive count = 0;

// Page structure using your transformed template literals syntax
const page = div(
  {},
  p(`Count: ${count}`),
  button({ onclick: () => count.value++ }, "Increment")
);

document.body.appendChild(page);

// Logging effect
effect(() => console.log("Count updated:", count.value));
