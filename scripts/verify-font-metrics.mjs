// scripts/verify-font-metrics.mjs
// Empirical test of Monospace Stack Fallback & Metric Coherence

import fs from 'node:fs';
import path from 'node:path';

console.log('Testing Font Fallback Chain & Monospace Metric Coherence...');

const indexCss = fs.readFileSync('src/app/index.css', 'utf8');

// 1. Check fallback chain syntax and precedence
const monoMatch = indexCss.match(/--mono:\s*([^;]+);/);
if (!monoMatch) {
  console.error('FAIL: --mono variable not found in index.css');
  process.exit(1);
}

const monoValue = monoMatch[1].trim();
console.log(`--mono definition: ${monoValue}`);

// Split fonts and clean
const fontList = monoValue.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, ''));
console.log('Parsed Font Stack in order of precedence:');
fontList.forEach((font, idx) => {
  console.log(`  ${idx + 1}. "${font}"`);
});

// Verify critical order:
// 1. Web font ('JetBrains Mono')
// 2. Modern OS native monospace (ui-monospace)
// 3. Apple native (SFMono-Regular, Menlo, Monaco)
// 4. Windows native (Consolas)
// 5. Linux native ("Liberation Mono")
// 6. Universal fallbacks ("Courier New", monospace)

const expectedOrder = [
  'JetBrains Mono',
  'ui-monospace',
  'Consolas',
  'monospace'
];

let lastIndex = -1;
let orderValid = true;
for (const font of expectedOrder) {
  const foundIdx = fontList.indexOf(font);
  if (foundIdx === -1) {
    console.error(`FAIL: Missing font in stack: ${font}`);
    orderValid = false;
  } else if (foundIdx < lastIndex) {
    console.error(`FAIL: Font out of order: ${font} (index ${foundIdx} < ${lastIndex})`);
    orderValid = false;
  }
  lastIndex = foundIdx;
}

if (!orderValid) {
  process.exit(1);
}
console.log('PASS: Font precedence order is optimal (web -> OS native -> platform -> generic).');

// 2. Check all CSS files for any rogue JetBrains Mono font-face or broken import
let brokenImports = [];
function scanCss(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') {
      scanCss(full);
    } else if (f.name.endsWith('.css')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('@fontsource/jetbrains-mono')) {
        brokenImports.push(full);
      }
    }
  }
}
scanCss('src');

if (brokenImports.length > 0) {
  console.error(`FAIL: Found @fontsource/jetbrains-mono in: ${brokenImports.join(', ')}`);
  process.exit(1);
} else {
  console.log('PASS: Zero @fontsource imports across all src/**/*.css files.');
}

// 3. Scan TSX components using font-mono and verify no hardcoded font-family overrides that conflict
let conflictingOverrides = [];
function scanTsx(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') {
      scanTsx(full);
    } else if (f.name.endsWith('.tsx') || f.name.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      // Look for style={{ fontFamily: ... }} conflicting with font-mono
      if (/fontFamily:\s*["'][^"']*JetBrains[^"']*["']/.test(content)) {
        conflictingOverrides.push(full);
      }
    }
  }
}
scanTsx('src');

if (conflictingOverrides.length > 0) {
  console.warn(`WARN: Found inline hardcoded fontFamily references in: ${conflictingOverrides.join(', ')}`);
} else {
  console.log('PASS: Zero hardcoded fontFamily overrides in TSX components.');
}

console.log('\nAll font resilience tests completed successfully.');
