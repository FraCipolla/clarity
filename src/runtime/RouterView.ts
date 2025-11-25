import { reactive, effect } from "./reactive.js";

let routes: Record<string, any> = {};
try {
  routes = require("../generated-routes").routes;
} catch {}

export const currentRoute = reactive(window.location.hash || "#/");

window.addEventListener("hashchange", () => {
  currentRoute.value = window.location.hash || "#/";
});

export function RouterView() {
  const container = document.createElement("div");

  effect(async () => {
    container.innerHTML = "";
    const routeEntry = routes[currentRoute.value];
    if (!routeEntry) {
      container.textContent = "404 Not Found";
      return;
    }

    let node = (await routeEntry.page()).default();

    for (const layoutFnImport of routeEntry.layouts) {
      const layoutModule = await layoutFnImport();
      node = layoutModule.default(node);
    }

    container.appendChild(node);
  });

  return container;
}
