import fs from "fs";
import path from "path";

interface RouteEntry {
  route: string;      // "/blog/:id"
  file: string;       // "./routes/blog/[id].cl"
  layouts: string[];  // array of import strings
}

// Detect if a file is a layout
function isLayoutFile(file: string) {
  return path.basename(file) === "__layout.cl.ts";
}

// Recursively get all route files
function getAllRoutes(dir: string, routesDir: string, parentRoute = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];

  if (!fs.existsSync(dir)) return entries;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...getAllRoutes(fullPath, routesDir, path.join(parentRoute, file)));
    } else if (file.endsWith(".cl.ts") && !isLayoutFile(file)) {
      let routePath = path.join(parentRoute, file.replace(".cl.ts", ""));
      if (file === "index.cl.ts") routePath = parentRoute || "/";
      routePath = routePath.replace(/\\/g, "/");
      if (!routePath.startsWith("/")) routePath = "/" + routePath;

      // Convert [id] -> :id
      routePath = routePath.replace(/\[(.+?)\]/g, ":$1");

      const layouts = getLayoutsForFile(fullPath, routesDir);

      entries.push({
        route: routePath,
        file: "./routes/" + path.relative(routesDir, fullPath).replace(/\\/g, "/").replace(".ts", ""),
        layouts,
      });
    }
  }

  return entries;
}

// Collect layouts from closest folder up to root
function getLayoutsForFile(filePath: string, routesDir: string): string[] {
  const layouts: string[] = [];
  let dir = path.dirname(filePath);

  while (dir.startsWith(routesDir)) {
    const layoutFile = path.join(dir, "__layout.cl.ts");
    if (fs.existsSync(layoutFile)) {
      const content = fs.readFileSync(layoutFile, "utf-8");
      if (/layout\s*=\s*false/.test(content)) break; // stop at layout=false

      const relImport = "./routes/" + path.relative(routesDir, layoutFile).replace(/\\/g, "/").replace(".ts", "");
      layouts.unshift(`() => import("${relImport}")`); // outermost first
    }
    dir = path.dirname(dir);
  }

  return layouts;
}

// Convert RouteEntry to main.cl.ts string
function routeFileToEntry(e: RouteEntry): string {
  const paramMatch = e.route.match(/:([a-zA-Z0-9_]+)/);
  if (paramMatch) {
    const paramName = paramMatch[1];
    const importPath = e.file.replace(`[${paramName}]`, `\${params.${paramName}}`);
    return `"${e.route}": { page: () => import("${e.file}"), layouts: [${e.layouts.join(", ")}] }`;
  } else {
    return `"${e.route}": { page: () => import("${e.file}"), layouts: [${e.layouts.join(", ")}] }`;
  }
}

// Main function
export function processRoutes(appDir: string) {
  const routesDir = path.join(appDir, "src/routes");
  const mainFile = path.join(appDir, "src/main.cl.ts");

  const entries = getAllRoutes(routesDir, routesDir);
  const routesStr = entries.map(routeFileToEntry).join(",\n");

  let mainContent = fs.readFileSync(mainFile, "utf-8");

  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes: Record<string, RouteEntry> = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
  console.log("Routes processed:", entries.map(e => e.route));
}
