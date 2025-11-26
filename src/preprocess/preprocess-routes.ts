// src/preprocess/preprocess-routes.ts
import fs from "fs";
import path from "path";

function getRouteEntries(routesDir: string) {
  if (!fs.existsSync(routesDir)) return [];

  return fs.readdirSync(routesDir)
    .filter(f => f.endsWith(".cl.ts"))
    .map(f => {
      const routePath = f === "index.cl.ts" ? "/" : "/" + f.replace(".cl.ts", "");
      return {
        route: routePath,
        file: `./routes/${f}`
      };
    });
}

/**
 * Injects routes object into main.cl.ts between ROUTES_START/ROUTES_END
 */
export function processRoutes(appDir: string) {
  const routesDir = path.join(appDir, "src/routes");
  const mainFile = path.join(appDir, "src/main.cl.ts");

  // Wrap pages
  const entries = getRouteEntries(routesDir);
  // entries.forEach(e => wrapPageIfNeeded(path.join(routesDir, path.basename(e.file))));

  // Build routes object as string
  const routesStr = entries.map(e => `  "${e.route}": () => import("${e.file.replace(".cl.ts", ".cl")}")`).join(",\n");

  // Inject into main.cl.ts
  let mainContent = fs.readFileSync(mainFile, "utf-8");
  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
