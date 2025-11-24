import { preprocessCode } from './preprocess/index.js';
import fs from 'fs';
import path from 'path';
export default function ClarityPlugin() {
    return {
        name: 'vite-plugin-clarity',
        enforce: 'pre',
        transform(code, id) {
            if (!id.endsWith('.ts') && !id.endsWith('.js'))
                return null;
            if (id.includes('node_modules'))
                return null;
            const transformed = preprocessCode(code);
            // ---- Debug: save preprocessed file ----
            const outDir = path.resolve('./.preprocessed');
            if (!fs.existsSync(outDir))
                fs.mkdirSync(outDir);
            const fileName = path.basename(id).replace(/\.[jt]s$/, '.ts');
            fs.writeFileSync(path.join(outDir, fileName), transformed);
            return {
                code: transformed,
                map: null
            };
        }
    };
}
//# sourceMappingURL=vite-plugin.js.map