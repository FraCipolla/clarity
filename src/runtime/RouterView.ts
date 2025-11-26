// src/runtime/RouterView.ts
import { reactive, effect } from "./reactive.js";

export interface RouteEntry {
  page: () => Promise<{ default: HTMLElement }>;                 // pages
  layouts?: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>>; // layouts
  noLayout?: boolean;
}

export const currentRoute = reactive(window.location.pathname || "#/");

window.addEventListener("hashchange", () => {
  console.log("HASH CHANGED!", window.location.pathname);
  currentRoute.value = window.location.pathname || "#/";
});

export function RouterView(routes: Record<string, RouteEntry>) {
  const container = document.createElement("div");

  async function runRoute() {
    console.log(currentRoute.value);
    container.innerHTML = "";

    const routeEntry = routes[currentRoute.value];
    if (!routeEntry) {
      container.textContent = "404 Not Found";
      return;
    }

    let node = (await routeEntry.page()).default;

    if (routeEntry.layouts) {
      for (const layoutImport of routeEntry.layouts) {
        const layoutModule = await layoutImport();
        node = layoutModule.default(node);
      }
    }

    container.appendChild(node);
  }
  effect(() => runRoute());

  return container;
}

