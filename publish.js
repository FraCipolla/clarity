#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ---------------- Config ----------------
const rootDir = process.cwd();
const pkgPath = path.join(rootDir, 'package.json');
const distDir = path.join(rootDir, 'dist');

// ---------------- Helper ----------------
function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ---------------- Step 1: Check package.json ----------------
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found. Exiting.');
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
if (!pkg.name) {
  console.error('package.json must have a name. Exiting.');
  process.exit(1);
}

// ---------------- Step 2: Build TypeScript ----------------
console.log('Building TypeScript...');
run('tsc');

// ---------------- Step 3: Optional version bump ----------------
if (process.argv.includes('--patch')) {
  run('npm version patch');
} else if (process.argv.includes('--minor')) {
  run('npm version minor');
} else if (process.argv.includes('--major')) {
  run('npm version major');
}

// ---------------- Step 4: Pack the dist folder ----------------
console.log('Packing npm package...');
const tarballName = execSync('npm pack', { cwd: rootDir }).toString().trim();
console.log(`Package created: ${tarballName}`);

// ---------------- Step 5: Publish ----------------
if (process.argv.includes('--publish')) {
  console.log('Publishing to npm...');
  run('npm publish');
} else {
  console.log('Skipping publish. Use --publish to actually publish.');
}

console.log('Done.');
