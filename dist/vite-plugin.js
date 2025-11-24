import fs from 'fs';
import path from 'path';
import { preprocessCode } from './preprocess/index.js';
export default function ClarityPlugin(options = {}) {
    const { debug = false, extensions = ['.cl.ts', '.cl.js'] } = options;
    return {
        name: 'vite-plugin-clarity',
        enforce: 'pre',
        async transform(code, id) {
            const ext = path.extname(id);
            if (!extensions.includes(ext) && !id.endsWith('.ts') && !id.endsWith('.js'))
                return null;
            if (id.includes('node_modules'))
                return null;
            const transformed = preprocessCode(code);
            if (debug) {
                const outDir = path.resolve('./.preprocessed');
                if (!fs.existsSync(outDir))
                    fs.mkdirSync(outDir, { recursive: true });
                const fileName = path.basename(id).replace(/\.[jt]s$/, '.ts');
                fs.writeFileSync(path.join(outDir, fileName), transformed, 'utf-8');
            }
            return {
                code: transformed,
                map: null
            };
        }
    };
}
//# sourceMappingURL=vite-plugin.js.map