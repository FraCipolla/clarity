// RouterView.ts
import { reactive, effect } from "./reactive.js";

export interface RouteEntry {
  page: () => Promise<{ default: HTMLElement }>;
  layouts?: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>>;
  noLayout?: boolean;
}

interface PageModule {
  default: HTMLElement;
  layout?: boolean;
}

export const currentRoute = reactive(window.location.pathname);

window.addEventListener("popstate", () => {
  currentRoute.value = window.location.pathname;
});

export function RouterView(routes: Record<string, RouteEntry>) {
  const container = document.createElement("div");

  async function runRoute() {
    container.innerHTML = "";

    const routeEntry = routes[currentRoute.value];
    if (!routeEntry) {
      container.textContent = "404 Not Found";
      return;
    }

    const pageModule = (await routeEntry.page()) as PageModule;

    if (pageModule.layout === false) {
      routeEntry.noLayout = true;
    }

    let node = pageModule.default;

    // Apply layouts if any
    if (!routeEntry.noLayout && routeEntry.layouts) {
      for (const layoutImport of routeEntry.layouts) {
        const layoutModule = await layoutImport();
        node = layoutModule.default(node);
      }
    }

    container.appendChild(node);
  }

  effect(() => { runRoute(); });

  return container;
}

export function go(path: string) {
  history.pushState(null, "", path);
  currentRoute.value = path;
}

function initLinkInterceptor() {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    if (href.startsWith("http") || href.startsWith("#")) return;

    event.preventDefault();
    go(href);
  });
}

initLinkInterceptor();