// src/runtime/RouterView.ts
import { reactive, effect } from "./reactive.js";

export const currentRoute = reactive(window.location.hash || "#/");

window.addEventListener("hashchange", () => {
  currentRoute.value = window.location.hash || "#/";
});

export function RouterView(
  routes: Record<string, () => Promise<{ default: HTMLElement }>>
) {
  const container = document.createElement("div");

  effect(async () => {
    container.innerHTML = "";
    const routeEntry = routes[currentRoute.value];
    if (!routeEntry) {
      container.textContent = "404 Not Found";
      return;
    }

    const node = (await routeEntry()).default;
    container.appendChild(node);
  });

  return container;
}
