import fs from 'fs';
import path from 'path';

export interface RouteInfo {
  page: string;       // path to page file
  layouts: string[];  // array of layout files (outer → inner)
  noLayout?: boolean; // optional flag if page opts out of layouts
}

export function scanRoutes(dir: string, baseRoute = ""): Record<string, RouteInfo> {
  const routeMap: Record<string, RouteInfo> = {};
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      Object.assign(routeMap, scanRoutes(fullPath, baseRoute + "/" + item.name));
    } else if (item.isFile() && item.name.endsWith(".cl.ts")) {
      const name = item.name.replace(".cl.ts", "");
      const routePath = name === "index" ? baseRoute || "/" : baseRoute + "/" + name;

      // detect if page exports noLayout
      const content = fs.readFileSync(fullPath, "utf-8");
      const noLayout = /\bexport\s+const\s+noLayout\s*=\s*true\b/.test(content);

      routeMap[routePath] = {
        page: `./${path.relative(process.cwd(), fullPath).replace(/\\/g, "/")}`,
        layouts: collectLayouts(dir),
        noLayout
      };
    }
  }

  return routeMap;
}

// helper to collect layouts (outer → inner)
function collectLayouts(dir: string): string[] {
  const layouts: string[] = [];
  let currentDir = dir;
  while (currentDir.startsWith(process.cwd())) {
    const layoutPath = path.join(currentDir, "__layout.cl.ts");
    if (fs.existsSync(layoutPath)) layouts.unshift(`./${path.relative(process.cwd(), layoutPath).replace(/\\/g, "/")}`);
    currentDir = path.dirname(currentDir);
  }
  return layouts;
}
