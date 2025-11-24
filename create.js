#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appName = process.argv[3];
if (!appName) {
  console.error("Usage: npx clarity create <app-name>");
  process.exit(1);
}

const templateDir = path.join(__dirname, "templates");
const targetDir = path.resolve(process.cwd(), appName);

if (fs.existsSync(targetDir)) {
  console.error(`Directory ${appName} already exists`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

function copyDir(src, dest) {
  fs.readdirSync(src).forEach((file) => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath);
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(templateDir, targetDir);

console.log(`Created ${appName} from Clarity template`);
console.log("Next steps:");
console.log(`  cd ${appName}`);
console.log("  npm install");
console.log("  npm run dev");
