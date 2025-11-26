// src/preprocess/preprocess-routes.ts
import fs from "fs";
import path from "path";

function getRouteEntries(routesDir: string) {
  if (!fs.existsSync(routesDir)) return [];

  return fs.readdirSync(routesDir)
    .filter(f => f.endsWith(".cl.ts") && f !== "__layout.cl.ts")
    .map(f => {
      const routePath = f === "index.cl.ts" ? "/" : "/" + f.replace(".cl.ts", "");
      return {
        route: routePath,
        file: `./routes/${f}`
      };
    });
}

function getLayoutsForPage(filePath: string, routesDir: string) {
  const layouts: string[] = [];
  let dir = path.dirname(filePath);

  while (dir.startsWith(routesDir)) {
    const layoutFile = path.join(dir, "__layout.cl.ts");
    if (fs.existsSync(layoutFile)) {
      // Convert absolute path to relative import
      layouts.unshift(`() => import("${path.relative(process.cwd(), layoutFile).replace(/\\/g, "/").replace(".ts","")}")`);
    }
    dir = path.dirname(dir);
  }

  return layouts;
}

export function processRoutes(appDir: string) {
  const routesDir = path.join(appDir, "src/routes");
  const mainFile = path.join(appDir, "src/main.cl.ts");

  const entries = getRouteEntries(routesDir);
  
  const routesStr = entries.map(e => {
    const pageImport = `() => import("${e.file.replace(".cl.ts", ".cl")}")`;
    const layoutImports = getLayoutsForPage(path.join(routesDir, e.file), routesDir);
    return `  "${e.route}": { page: ${pageImport}, layouts: [${layoutImports.join(", ")}] }`;
  }).join(",\n");

  // Inject into main.cl.ts
  let mainContent = fs.readFileSync(mainFile, "utf-8");
  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes: Record<string, RouteEntry> = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
