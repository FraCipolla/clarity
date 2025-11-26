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

async function getLayoutsForPage(pagePath: string, routesRoot: string) {
  const layouts: Array<() => Promise<{ default: (child: HTMLElement) => HTMLElement }>> = [];

  let dir = path.dirname(pagePath);
  const segments: string[] = [];

  // Collect folder segments up to routes root
  while (dir !== routesRoot && dir.startsWith(routesRoot)) {
    segments.unshift(dir); 
    dir = path.dirname(dir);
  }

  // For each folder, check if __layout.cl.ts exists
  for (const folder of segments) {
    const layoutFile = path.join(folder, '__layout.cl.ts');
    if (!fs.existsSync(layoutFile)) continue;

    const layoutModule = await import(layoutFile);
    if (layoutModule.layout === false) continue; // skip this layout
    layouts.push(() => import(layoutFile));
  }

  return layouts;
}


export async function processRoutes(appDir: string) {
  const routesDir = path.join(appDir, "src/routes");
  const mainFile = path.join(appDir, "src/main.cl.ts");

  const entries = getRouteEntries(routesDir);

  const routesStrArr = [];

  for (const e of entries) {
    const pageImport = `() => import("${e.file.replace(".cl.ts", ".cl")}")`;

    // Await the async function
    const layoutImportsArray = await getLayoutsForPage(path.join(routesDir, e.file), routesDir);

    // Convert layout functions to string imports
    const layoutImportsStr = layoutImportsArray
      .map((f, i) => `() => import("${e.file.replace(".cl.ts", ".cl")}")`)
      .join(", ");

    routesStrArr.push(`  "${e.route}": { page: ${pageImport}, layouts: [${layoutImportsStr}] }`);
  }

  const routesStr = routesStrArr.join(",\n");

  // Inject into main.cl.ts
  let mainContent = fs.readFileSync(mainFile, "utf-8");
  mainContent = mainContent.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes: Record<string, RouteEntry> = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
