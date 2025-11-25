// src/RouterView.ts
import { reactive, effect } from "./reactive.js";
import { routes } from "virtual:generated-routes";

export const currentRoute = reactive(window.location.hash || "#/");

// Listen for route changes
window.addEventListener("hashchange", () => {
  currentRoute.value = window.location.hash || "#/";
});

export function RouterView() {
  const container = document.createElement("div");

  effect(async () => {
    container.innerHTML = ""; // clear previous page
    const routeEntry = routes[currentRoute.value];
    if (!routeEntry) {
      container.textContent = "404 Not Found";
      return;
    }

    // Load the page component
    const pageModule = await routeEntry.page(); // call the function, returns a Promise<{default: ()=>HTMLElement}>
    let node = pageModule.default();  

    // Wrap with layouts (cascade: outer -> inner)
    for (const layoutPath of routeEntry.layouts) {
        const layoutModule = await layoutPath();  // call the function
        const layoutFn = layoutModule.default;    // get the wrapping function
        node = layoutFn(node);                    // wrap the node
    }

    container.appendChild(node);
  });

  return container;
}
