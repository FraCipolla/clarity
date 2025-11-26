// src/preprocess/preprocess-routes.ts
import fs from "fs";
import path from "path";

interface RouteEntry {
  route: string;
  file: string;
}

export function getRouteEntries(routesDir: string): RouteEntry[] {
  const entries: RouteEntry[] = [];

  function walk(dir: string, parentRoute = "") {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const f of files) {
      const full = path.join(dir, f.name);

      if (f.isDirectory()) {
        walk(full, parentRoute + "/" + f.name);
      } else if (f.isFile() && f.name.endsWith(".cl.ts") && f.name !== "__layout.cl.ts") {
        let route = parentRoute + "/" + f.name.replace(".cl.ts", "");

        if (f.name === "index.cl.ts") {
          route = parentRoute || "/";
        }

        entries.push({
          route: route.replace(/\\/g, "/"),
          file: "./routes/" + path.relative(routesDir, full).replace(/\\/g, "/")
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

  while (dir.length >= routesDir.length) {
    const layoutFile = path.join(dir, "__layout.cl.ts");

    if (fs.existsSync(layoutFile)) {
      const content = fs.readFileSync(layoutFile, "utf-8");

      if (/layout\s*=\s*false/.test(content)) break;

      const relative = "./routes/" + 
        path.relative(routesDir, layoutFile)
        .replace(/\\/g, "/")
        .replace(".ts", "");

      layouts.push(`() => import("${relative}")`);
    }

    if (dir === routesDir) break;
    dir = path.dirname(dir);
  }

  return layouts.reverse();
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
    `// ROUTES_START\nexport const routes: Record<string, RouteEntry> = {\n${routesStr}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, mainContent, "utf-8");
}
