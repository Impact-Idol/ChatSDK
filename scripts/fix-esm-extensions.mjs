#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const extensions = new Set(['.js', '.d.ts']);

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...walk(path));
    } else if (extensions.has(path.endsWith('.d.ts') ? '.d.ts' : extname(path))) {
      files.push(path);
    }
  }
  return files;
}

function hasKnownExtension(specifier) {
  return /\.[a-zA-Z0-9]+$/.test(specifier);
}

function resolveRelativeSpecifier(file, specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return specifier;
  }
  if (hasKnownExtension(specifier)) {
    return specifier;
  }

  const base = resolve(file, '..', specifier);
  if (existsSync(`${base}.js`) || existsSync(`${base}.d.ts`)) {
    return `${specifier}.js`;
  }
  if (existsSync(join(base, 'index.js')) || existsSync(join(base, 'index.d.ts'))) {
    return `${specifier}/index.js`;
  }
  return specifier;
}

function rewriteFile(file) {
  const input = readFileSync(file, 'utf8');
  const output = input.replace(
    /\b(from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g,
    (match, prefix, specifier) => {
      const resolved = resolveRelativeSpecifier(file, specifier);
      const quote = match.endsWith('"') ? '"' : "'";
      return `${prefix}${quote}${resolved}${quote}`;
    }
  );

  if (output !== input) {
    writeFileSync(file, output);
  }
}

if (!existsSync(root)) {
  process.exit(0);
}

for (const file of walk(root)) {
  rewriteFile(file);
}
