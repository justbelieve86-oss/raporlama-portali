#!/usr/bin/env node

/**
 * Script to help replace console.log with logger
 * This is a helper script - manual review is still required
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.test.tsx'] });

let totalReplacements = 0;

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  let modified = false;
  
  // Skip if file doesn't import logger
  if (!content.includes("import { logger }") && !content.includes('from \'../lib/logger\'') && !content.includes('from \'@/lib/logger\'')) {
    // Only process if there are console.log statements
    if (content.includes('console.')) {
      console.log(`⚠️  ${file} has console.* but no logger import - manual review needed`);
    }
    return;
  }
  
  // Replace console.log with logger.log
  const logMatches = content.match(/console\.log\(/g);
  if (logMatches) {
    content = content.replace(/console\.log\(/g, 'logger.log(');
    modified = true;
    totalReplacements += logMatches.length;
  }
  
  // Replace console.warn with logger.warn
  const warnMatches = content.match(/console\.warn\(/g);
  if (warnMatches) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
    totalReplacements += warnMatches.length;
  }
  
  // Replace console.error with logger.error
  const errorMatches = content.match(/console\.error\(/g);
  if (errorMatches) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
    totalReplacements += errorMatches.length;
  }
  
  // Replace console.debug with logger.debug
  const debugMatches = content.match(/console\.debug\(/g);
  if (debugMatches) {
    content = content.replace(/console\.debug\(/g, 'logger.debug(');
    modified = true;
    totalReplacements += debugMatches.length;
  }
  
  // Replace console.info with logger.info
  const infoMatches = content.match(/console\.info\(/g);
  if (infoMatches) {
    content = content.replace(/console\.info\(/g, 'logger.info(');
    modified = true;
    totalReplacements += infoMatches.length;
  }
  
  if (modified) {
    console.log(`✅ Updated ${file}`);
    // Uncomment to actually write files (be careful!)
    // writeFileSync(file, content, 'utf-8');
  }
});

console.log(`\n📊 Total replacements: ${totalReplacements}`);
console.log('⚠️  This script only shows what would be replaced. Uncomment writeFileSync to actually apply changes.');

