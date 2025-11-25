// src/preprocess/preprocess-routes.ts
import fs from "fs";
import path from "path";

/**
 * Wraps page code in default export if it doesn't already export default,
 * preserving top-level imports and your `return div(...)` syntax.
 */
function wrapPageIfNeeded(filePath: string) {
  let content = fs.readFileSync(filePath, "utf-8");

  if (/export\s+default/.test(content)) return;

  // Split top-level imports from the rest
  const lines = content.split("\n");
  const importLines: string[] = [];
  const restLines: string[] = [];

  let foundNonImport = false;
  for (const line of lines) {
    if (!foundNonImport && line.trim().startsWith("import ")) {
      importLines.push(line);
    } else {
      foundNonImport = true;
      restLines.push(line);
    }
  }

  // Wrap the remaining code in an IIFE
  content = [
    ...importLines,
    "export default (() => {",
    ...restLines,
    "})();"
  ].join("\n");

  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Scans routes folder and builds a route map
 */
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
  entries.forEach(e => wrapPageIfNeeded(path.join(routesDir, path.basename(e.file))));

  // Build routes object as string
  const routesStr = entries.map(e => `  "${e.route}": () => import("${e.file}")`).join(",\n");

  // Inject into main.cl.ts
  let mainContent = fs.readFileSync(mainFile, "utf-8");
  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
