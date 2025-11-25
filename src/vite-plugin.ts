// vite-plugin-clarity.ts
import type { Plugin } from "vite";
import path from "path";
import fs from "fs";
import { preprocessCode } from "./preprocess/index.js";
import { buildGeneratedRoutes } from "./preprocess/build-routes.js";

export interface ClarityPluginOptions {
  debug?: boolean;
  extensions?: string[];
}

export default function ClarityPlugin(options: ClarityPluginOptions = {}): Plugin {
  const { debug = false, extensions = [".cl.ts", ".cl.js"] } = options;

  return {
    name: "vite-plugin-clarity",
    enforce: "pre",

    // --------------------------
    // Build routes before Vite starts
    // --------------------------
    async configResolved(config) {
      const appDir = config.root || process.cwd();
      const routesFile = path.join(appDir, "src/generated-routes.ts");

      // Build routes
      buildGeneratedRoutes(appDir);

      if (debug) {
        console.log("[Clarity] Routes generated at:", routesFile);
      }
    },

    // --------------------------
    // Transform Clarity files
    // --------------------------
    async transform(code: string, id: string) {
      const ext = path.extname(id);
      if (!extensions.includes(ext) && !id.endsWith(".ts") && !id.endsWith(".js")) return null;
      if (id.includes("node_modules")) return null;

      const transformed = preprocessCode(code);

      if (debug) {
        const outDir = path.resolve("./.preprocessed");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const fileName = path.basename(id).replace(/\.[jt]s$/, ".ts");
        fs.writeFileSync(path.join(outDir, fileName), transformed, "utf-8");
      }

      return {
        code: transformed,
        map: null,
      };
    },
  };
}
