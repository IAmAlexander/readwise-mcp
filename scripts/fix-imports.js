#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';

const importRegex = /import\s+(?:type\s+)?({[^}]+}|\*\s+as\s+[^;]+|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;

async function* getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        yield* getFiles(path);
      }
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      yield path;
    }
  }
}

function fixImportPath(importStatement, importPath) {
  // Don't modify package imports or absolute paths
  if (importPath.startsWith('@') || importPath.startsWith('/') || !importPath.startsWith('.')) {
    return importStatement;
  }

  // Check if it's a type-only import
  const isTypeImport = importStatement.includes('import type');

  // Handle imports from ../types.js or ./types.js
  if (importPath.endsWith('/types.js') || importPath === '../types.js' || importPath === './types.js') {
    const basePath = importPath.replace('.js', '');
    return isTypeImport
      ? importStatement.replace(importPath, `${basePath}/index`)
      : importStatement.replace(importPath, `${basePath}/index.js`);
  }

  // Handle other imports
  if (isTypeImport) {
    // Remove .js extension from type imports
    return importStatement.replace(/\.js['"]$/, '"');
  } else if (!importPath.endsWith('.js')) {
    // Add .js extension to runtime imports
    return importStatement.replace(/['"]$/, '.js"');
  }

  return importStatement;
}

async function fixImports(filePath) {
  const content = await readFile(filePath, 'utf8');
  let newContent = content;
  let match;

  // Reset regex
  importRegex.lastIndex = 0;

  // Find and fix all imports
  while ((match = importRegex.exec(content)) !== null) {
    const [fullImport, , importPath] = match;
    const fixedImport = fixImportPath(fullImport, importPath);
    if (fixedImport !== fullImport) {
      newContent = newContent.replace(fullImport, fixedImport);
    }
  }

  if (content !== newContent) {
    await writeFile(filePath, newContent, 'utf8');
    console.log(`Updated imports in ${filePath}`);
  }
}

async function main() {
  try {
    // Process both src and tests directories
    for (const dir of ['src', 'tests']) {
      for await (const file of getFiles(dir)) {
        await fixImports(file);
      }
    }
    console.log('Done fixing imports');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 