// src/main.cl.ts
import { RouterView, RouteEntry } from "@fracipolla/clarity";

// ROUTES_START
export const routes: Record<string, RouteEntry> = {
};
// ROUTES_END

document.body.appendChild(RouterView(routes));