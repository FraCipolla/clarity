// src/main.cl.ts
import { RouterView } from "@fracipolla/clarity";

// ROUTES_START
export const routes = {
  "/__layout": () => import("./routes/__layout.cl"),
  "/about": () => import("./routes/about.cl"),
  "/": () => import("./routes/index.cl")
};
// ROUTES_END

document.body.appendChild(RouterView(routes));