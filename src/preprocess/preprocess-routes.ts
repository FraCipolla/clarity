// src/preprocess/preprocess-routes.ts
import fs from "fs";
import path from "path";

interface RouteEntry {
  route: string;
  file: string;
}

export function getRouteEntries(routesDir: string): RouteEntry[] {
  const entries: RouteEntry[] = [];

  function walk(dir: string, parentRoute = '') {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath, path.join(parentRoute, file));
      } else if (file.endsWith('.cl.ts') && file !== '__layout.cl.ts') {
        let routePath = path.join(parentRoute, file.replace('.cl.ts', ''));
        if (file === 'index.cl.ts') routePath = parentRoute || '/';
        routePath = routePath.replace(/\\/g, '/');

        entries.push({
          route: routePath.startsWith('/') ? routePath : '/' + routePath,
          file: './routes/' + path.relative(routesDir, fullPath).replace(/\\/g, '/')
        });
      }
    }
  }

  walk(routesDir);
  return entries;
}


function getLayoutsForPage(pageFile: string, routesDir: string): string[] {
  const layouts: string[] = [];
  let dir = path.dirname(pageFile);

  const folders: string[] = [];
  while (dir.startsWith(routesDir)) {
    folders.unshift(dir);
    dir = path.dirname(dir);
  }

  for (const folder of folders) {
    const layoutFile = path.join(folder, "__layout.cl.ts");
    if (!fs.existsSync(layoutFile)) continue;

    const content = fs.readFileSync(layoutFile, "utf-8");
    if (/layout\s*=\s*false/.test(content)) continue;

    const relativeImport = "./" + path.relative(routesDir, layoutFile).replace(/\\/g, "/").replace(".ts", "");
    layouts.push(`() => import("${relativeImport}")`);
  }

  return layouts;
}


export function processRoutes(appDir: string) {
  const routesDir = path.join(appDir, "src/routes");
  const mainFile = path.join(appDir, "src/main.cl.ts");

  const entries: { route: string; file: string }[] = getRouteEntries(routesDir);
  // same recursive walker as before to fill entries

  const routesStr = entries.map(e => {
    const pageImport = `() => import("${e.file.replace(".cl.ts", ".cl")}")`;
    const layoutImports = getLayoutsForPage(path.join(routesDir, e.file), routesDir);
    return `  "${e.route}": { page: ${pageImport}, layouts: [${layoutImports.join(", ")}] }`;
  }).join(",\n");

  let mainContent = fs.readFileSync(mainFile, "utf-8");
  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
