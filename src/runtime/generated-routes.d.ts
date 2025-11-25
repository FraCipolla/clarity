// src/runtime/generated-routes.d.ts

interface RouteEntry {
  page: () => Promise<{ default: () => HTMLElement }>;
  layouts: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>>;
  noLayout?: boolean;
}

declare module "virtual:generated-routes" {
  export const routes: Record<string, RouteEntry>;
}
