// src/runtime/RouterView.ts
import { reactive, effect } from "./reactive.js";

export interface RouteEntry {
  page: () => Promise<{ default: HTMLElement }>;                 // pages
  layouts?: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>>; // layouts
  noLayout?: boolean;
}

export const currentRoute = reactive(window.location.hash || "#/");

export function RouterView(routes: Record<string, RouteEntry>) {
  console.log(routes)
  const container = document.createElement("div");
  effect(async () => {
    console.log(currentRoute.value)
    container.innerHTML = "";
    const routeEntry = routes[currentRoute.value];
    if (!routeEntry) {
      container.textContent = "404 Not Found";
      return;
    }

    // Load page
    let node = (await routeEntry.page()).default;

    // Apply layouts if any
    if (routeEntry.layouts) {
      for (const layoutImport of routeEntry.layouts) {
        const layoutModule = await layoutImport();
        node = layoutModule.default(node); // wrap the page node
      }
    }

    container.appendChild(node);
  });

  return container;
}

