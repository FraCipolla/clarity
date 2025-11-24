import ts from "typescript";
import fs from "fs";
import path from "path";
import reactiveTransformer from "./transform.js";

const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.build.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(config, ts.sys, "./");

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options
});

const emitResult = program.emit(undefined, writeFile, undefined, false, {
  before: [reactiveTransformer(program)]
});

function writeFile(fileName, text) {
  const outPath = path.resolve("./dist", path.basename(fileName));
  fs.writeFileSync(outPath, text);
}

if (emitResult.emitSkipped) {
  console.error("Emit failed");
}
