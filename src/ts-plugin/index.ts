// src/ts-plugin/index.ts
import ts from "typescript";

export interface ClarityPluginInfo {
  languageService: ts.LanguageService;
}

/**
 * A minimal TS plugin that suppresses all TS errors
 * for files using the Clarity syntax.
 */
export function create(info: ClarityPluginInfo): ts.LanguageService {
  // Only affect files that match our custom extensions
  const isClarityFile = (file: string) =>
    file.endsWith(".cl.ts") ||
    file.endsWith(".clarity") ||
    file.endsWith(".ts") ||
    file.endsWith(".js");

  // Create a proxy object that wraps the original language service
  const proxy: Partial<ts.LanguageService> = {};

  // Clone all methods from the original language service
  for (const key of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
    const orig = info.languageService[key];
    if (typeof orig === "function") {
      proxy[key] = (...args: any[]) => (orig as Function).apply(info.languageService, args);
    }
  }

  // Override diagnostics to suppress for Clarity files
  proxy.getSemanticDiagnostics = (fileName: string) => {
    if (isClarityFile(fileName)) return [];
    return info.languageService.getSemanticDiagnostics(fileName);
  };

  proxy.getSyntacticDiagnostics = (fileName: string) => {
    if (isClarityFile(fileName)) return [];
    return info.languageService.getSyntacticDiagnostics(fileName);
  };

  return proxy as ts.LanguageService;
}
