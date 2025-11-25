// src/preprocess/add-routes.ts
import fs from "fs";
import path from "path";

export function addRoutesToMain(appDir: string) {
  const mainFile = path.join(appDir, "src/main.cl.ts");
  const routesDir = path.join(appDir, "src/routes");

  if (!fs.existsSync(routesDir)) return;

  const files = fs.readdirSync(routesDir).filter(f => f.endsWith(".cl.ts"));

  const routesEntries = files.map(f => {
    const route = f === "index.cl.ts" ? "/" : "/" + f.replace(".cl.ts", "");
    return `  "${route}": () => import("./routes/${f}")`;
  });

  let content = fs.readFileSync(mainFile, "utf-8");

  // Replace everything between ROUTES_START/ROUTES_END markers
  content = content.replace(
    /\/\/ ROUTES_START[\s\S]*?\/\/ ROUTES_END/,
    `// ROUTES_START\nexport const routes = {\n${routesEntries.join(",\n")}\n};\n// ROUTES_END`
  );

  fs.writeFileSync(mainFile, content, "utf-8");
}
