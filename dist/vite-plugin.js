import fs from 'fs';
import path from 'path';
import { preprocessCode } from './preprocess/index.js';
import { scanRoutes } from "./preprocess/routing.js";
export default function ClarityPlugin(options = {}) {
    const { debug = false, extensions = ['.cl.ts', '.cl.js'], routesDir = './src/routes' } = options;
    // Virtual module id
    const virtualModuleId = 'virtual:generated-routes';
    const resolvedVirtualModuleId = '\0' + virtualModuleId;
    return {
        name: 'vite-plugin-clarity',
        enforce: 'pre',
        resolveId(id) {
            if (id === virtualModuleId)
                return resolvedVirtualModuleId;
            return null;
        },
        async load(id) {
            if (id === resolvedVirtualModuleId) {
                const routesMap = scanRoutes(routesDir);
                // generate JS code for the route map
                const code = `
          export const routes = {
            ${Object.entries(routesMap).map(([route, info]) => {
                    const layoutsArray = (info.noLayout ? [] : info.layouts).map(l => `() => import('${l}')`);
                    return `'${route}': { page: () => import('${info.page}'), layouts: [${layoutsArray.join(', ')}], noLayout: ${info.noLayout || false} }`;
                }).join(',\n')}
          };
        `;
                return code;
            }
            return null;
        },
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
        },
        handleHotUpdate({ file, server }) {
            if (file.startsWith(path.resolve(routesDir))) {
                const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                }
            }
        }
    };
}
//# sourceMappingURL=vite-plugin.js.map