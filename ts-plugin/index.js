// A minimal TS plugin that simply suppresses all TS errors
// for files using the Clarity syntax.

function create(info) {
  // Only affect files that match our custom extension or normal TS files
  const isClarityFile = (file) =>
    file.endsWith(".cl.ts") ||
    file.endsWith(".clarity") ||
    file.endsWith(".ts") ||
    file.endsWith(".js");

  const proxy = Object.create(null);

  // Clone all language service methods
  for (let k of Object.keys(info.languageService)) {
    const x = info.languageService[k];
    proxy[k] = (...args) => x.apply(info.languageService, args);
  }

  // Override diagnostics
  proxy.getSemanticDiagnostics = (file) => {
    if (isClarityFile(file)) return [];
    return info.languageService.getSemanticDiagnostics(file);
  };

  proxy.getSyntacticDiagnostics = (file) => {
    if (isClarityFile(file)) return [];
    return info.languageService.getSyntacticDiagnostics(file);
  };

  return proxy;
}

module.exports = { create };
