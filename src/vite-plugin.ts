// vite-plugin-clarity.ts
import type { Plugin } from "vite";
import path from "path";
import fs from "fs";
import { preprocessCode } from "./preprocess/index.js";
import { processRoutes } from "./preprocess/preprocess-routes.js";
import { isHtmlTag } from "./runtime/dom.js";

export interface ClarityPluginOptions {
  debug?: boolean;
  extensions?: string[];
}

export default function ClarityPlugin(options: ClarityPluginOptions = {}): Plugin {
  const { debug = false, extensions = [".cl.ts", ".cl.js"] } = options;

  return {
    name: "vite-plugin-clarity",
    enforce: "pre",

    async buildStart() {
      const appDir = process.cwd();
      processRoutes(appDir);
    },

    async transform(code: string, id: string) {
      const ext = id.endsWith(".cl.ts");
      if (id.includes("node_modules")) return null;
      if (ext) {
        const transformed = preprocessCode(code, id);
        const root = process.cwd();
        const rel = path.relative(root, id);
        const out = path.resolve(root, ".preprocessed", rel);

        const outDir = path.dirname(out);
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = out.replace(/\.[cm]?jsx?$/, ".ts").replace(/\.cl\.ts$/, ".ts");

        fs.writeFileSync(outFile, transformed, "utf-8");
        
        return {
          code: transformed,
          map: null,
        };
      }
      return {
        code: code,
        map: null,
      };
    },
  };
}
