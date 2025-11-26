import fs from "fs";
import path from "path";

interface RouteEntry {
  route: string;
  file: string;
}

export function getRouteEntries(routesDir: string): RouteEntry[] {
  const entries: RouteEntry[] = [];

  function walk(dir: string, parentRoute = "") {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full, parentRoute + "/" + item.name);
      } else if (item.isFile() && item.name.endsWith(".cl.ts") && item.name !== "__layout.cl.ts") {
        let route = parentRoute + "/" + item.name.replace(".cl.ts", "");

        if (item.name === "index.cl.ts") {
          route = parentRoute || "/";
        }

        route = route.replace(/\\/g, "/");
        if (!route.startsWith("/")) route = "/" + route;

        const rel = path.relative(routesDir, full).replace(/\\/g, "/");
        const file = "./routes/" + rel;

        entries.push({ route, file });
      }
    }
  }

  walk(routesDir);
  return entries;
}

export function getLayoutsForPage(pageFullPath: string, routesDir: string): string[] {
  const layouts: string[] = [];

  let dir = path.dirname(pageFullPath);

  while (true) {
    if (!dir.startsWith(routesDir)) break;

    const layoutFile = path.join(dir, "__layout.cl.ts");
    if (fs.existsSync(layoutFile)) {
      const content = fs.readFileSync(layoutFile, "utf-8");
      if (/export\s+const\s+layout\s*=\s*false/.test(content) || /layout\s*=\s*false/.test(content)) {
        break;
      }

      const rel = path.relative(routesDir, layoutFile).replace(/\\/g, "/").replace(/\.ts$/, "");
      const importPath = `() => import("./routes/${rel}")`;
      layouts.push(importPath);
    }

    if (path.resolve(dir) === path.resolve(routesDir)) break;
    dir = path.dirname(dir);
  }

  return layouts;
}

export function processRoutes(appDir: string) {
  const routesDir = path.join(appDir, "src/routes");
  const mainFile = path.join(appDir, "src/main.cl.ts");

  const entries = getRouteEntries(routesDir);

  const routesStrPieces: string[] = [];

  for (const e of entries) {
    const relPath = e.file.replace(/^\.\/routes\//, "");
    const pageFullPath = path.join(routesDir, relPath);

    const pageImport = `() => import("${e.file.replace(".cl.ts", ".cl")}")`;

    const layoutImports = getLayoutsForPage(pageFullPath, routesDir);

    const layoutsList = layoutImports.length ? layoutImports.join(", ") : "";

    routesStrPieces.push(`  "${e.route}": { page: ${pageImport}, layouts: [${layoutsList}] }`);
  }

  const routesStr = routesStrPieces.join(",\n");

  let mainContent = fs.readFileSync(mainFile, "utf-8");
  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes: Record<string, RouteEntry> = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
