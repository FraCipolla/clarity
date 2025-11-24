import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { preprocessCode } from './preprocess/index.js';

export default function ClarityPlugin(): Plugin {
  const plugin: Plugin = {
    name: 'vite-plugin-clarity',
    enforce: 'pre',

    transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.js')) return null;
      if (id.includes('node_modules')) return null;

      const transformed = preprocessCode(code);

      const outDir = path.resolve('./.preprocessed');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
      const fileName = path.basename(id).replace(/\.[jt]s$/, '.ts');
      fs.writeFileSync(path.join(outDir, fileName), transformed);

      return {
        code: transformed,
        map: null
      };
    }
  };

  return plugin;
}
