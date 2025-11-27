import { reactive, effect } from "./reactive.js";

export interface RouteEntry {
  page: (params?: Record<string, string>) => Promise<{ 
    default: HTMLElement | ((params?: Record<string,string>) => HTMLElement); 
    layout?: boolean | Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>> 
  }>;
  layouts?: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>>;
  noLayout?: boolean;
  _pattern?: RegExp;
  _keys?: string[];
}

export const currentRoute = reactive(window.location.pathname);

window.addEventListener("popstate", () => {
  currentRoute.value = window.location.pathname;
});

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

function compilePattern(route: string) {
  const keys: string[] = [];
  let pattern = route.replace(/([.+?^${}()|\\])/g, "\\$1");
  pattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  pattern = "^" + pattern.replace(/\/+$/, "") + "/?$";
  return { regex: new RegExp(pattern), keys };
}

function matchRoute(path: string, routes: Record<string, RouteEntry>) {
  for (const route in routes) {
    const entry = routes[route];
    if (!entry._pattern) {
      const { regex, keys } = compilePattern(route);
      entry._pattern = regex;
      entry._keys = keys;
    }

    const match = path.match(entry._pattern!);
    if (!match) continue;

    const params: Record<string,string> = {};
    entry._keys!.forEach((key, idx) => params[key] = match[idx+1]);
    return { entry, params };
  }
  return null;
}

export function RouterView(routes: Record<string, RouteEntry>) {
  const container = document.createElement("div");

  async function runRoute() {
    container.innerHTML = "";

    const result = matchRoute(currentRoute.value, routes);
    if (!result) {
      container.textContent = "404 Not Found";
      return;
    }

    const { entry: routeEntry, params } = result;
    const pageModule = await routeEntry.page(params);

    if (pageModule.layout === false) routeEntry.noLayout = true;

    let node: HTMLElement;
    if (typeof pageModule.default === "function") {
      node = pageModule.default(params);
    } else {
      node = pageModule.default;
    }

    let layoutsToApply: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>> = [];
    if (!routeEntry.noLayout) {
      if (Array.isArray(pageModule.layout)) layoutsToApply = pageModule.layout;
      else if (routeEntry.layouts) layoutsToApply = routeEntry.layouts;
    }

    for (const layoutImport of layoutsToApply) {
      const layoutModule = await layoutImport();
      node = layoutModule.default(node);
    }

    container.appendChild(node);
  }

  effect(() => runRoute());
  return container;
}
