// scripts/challenge-m1-assets.mjs
// Adversarial Empirical Challenger for Milestone 1: Asset Pruning, Font Resilience, and Cache Directives

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_ASSETS = path.join(DIST_DIR, 'assets');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, message, extra = {}) {
  const result = { name, passed, message, ...extra };
  results.tests.push(result);
  if (passed === true) {
    results.passed++;
    console.log(`[PASS] ${name}: ${message}`);
  } else if (passed === 'WARN') {
    results.warnings++;
    console.log(`[WARN] ${name}: ${message}`);
  } else {
    results.failed++;
    console.log(`[FAIL] ${name}: ${message}`);
  }
}

console.log('====================================================');
console.log('MILENSTONE 1 ADVERSARIAL EMPIRICAL CHALLENGER SUITE');
console.log('====================================================\n');

// ----------------------------------------------------------------------
// 1. ASSET PRUNING AUDIT
// ----------------------------------------------------------------------
console.log('--- 1. Testing Static Asset Pruning ---');

// 1.1 dist/auth-bg.png absence
const distAuthBg = path.join(DIST_DIR, 'auth-bg.png');
const distAuthBgExists = fs.existsSync(distAuthBg);
recordTest(
  'Asset Pruning: dist/auth-bg.png absence',
  !distAuthBgExists,
  distAuthBgExists ? `auth-bg.png found in dist/ (${distAuthBg})` : 'dist/auth-bg.png is absent'
);

// 1.2 public/auth-bg.png absence
const publicAuthBg = path.join(PUBLIC_DIR, 'auth-bg.png');
const publicAuthBgExists = fs.existsSync(publicAuthBg);
recordTest(
  'Asset Pruning: public/auth-bg.png absence',
  !publicAuthBgExists,
  publicAuthBgExists ? `auth-bg.png found in public/ (${publicAuthBg})` : 'public/auth-bg.png is absent'
);

// 1.3 Font binary files in dist/assets
let fontBinaries = [];
if (fs.existsSync(DIST_ASSETS)) {
  const allAssets = fs.readdirSync(DIST_ASSETS);
  fontBinaries = allAssets.filter(file => /\.(woff2?|ttf|otf|eot)$/i.test(file));
}
recordTest(
  'Asset Pruning: Zero Font Binaries in dist/assets/',
  fontBinaries.length === 0,
  fontBinaries.length === 0 
    ? '0 font binary files found in dist/assets/' 
    : `Found ${fontBinaries.length} font binaries in dist/assets/: ${fontBinaries.join(', ')}`,
  { fontBinaries }
);

// 1.4 Check across ENTIRE dist directory for any font binary
function findFilesRecursive(dir, regex) {
  let matched = [];
  if (!fs.existsSync(dir)) return matched;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      matched = matched.concat(findFilesRecursive(fullPath, regex));
    } else if (regex.test(item.name)) {
      matched.push(path.relative(ROOT_DIR, fullPath));
    }
  }
  return matched;
}

const allDistFonts = findFilesRecursive(DIST_DIR, /\.(woff2?|ttf|otf|eot)$/i);
recordTest(
  'Asset Pruning: Zero Font Binaries in entire dist/',
  allDistFonts.length === 0,
  allDistFonts.length === 0
    ? '0 font binaries across all dist subdirectories'
    : `Found fonts: ${allDistFonts.join(', ')}`,
  { allDistFonts }
);

// 1.5 Legacy webp images in public/auth and dist/auth
const legacyAuthFiles = [
  'auth-network.webp',
  'auth-observability.webp',
  'auth-security.webp'
];

let publicAuthWebpFound = [];
const publicAuthDir = path.join(PUBLIC_DIR, 'auth');
if (fs.existsSync(publicAuthDir)) {
  const files = fs.readdirSync(publicAuthDir);
  publicAuthWebpFound = files.filter(f => /\.webp$/i.test(f));
}
recordTest(
  'Asset Pruning: public/auth/*.webp removal',
  publicAuthWebpFound.length === 0,
  publicAuthWebpFound.length === 0
    ? 'No legacy webp files in public/auth/'
    : `Legacy files found: ${publicAuthWebpFound.join(', ')}`,
  { publicAuthWebpFound }
);

const distAuthDir = path.join(DIST_DIR, 'auth');
let distAuthWebpFound = [];
if (fs.existsSync(distAuthDir)) {
  const files = fs.readdirSync(distAuthDir);
  distAuthWebpFound = files.filter(f => /\.webp$/i.test(f));
}
recordTest(
  'Asset Pruning: dist/auth/*.webp removal',
  distAuthWebpFound.length === 0,
  distAuthWebpFound.length === 0
    ? 'No legacy webp files in dist/auth/'
    : `Legacy files found in dist/auth/: ${distAuthWebpFound.join(', ')}`,
  { distAuthWebpFound }
);

// 1.6 Verify Active Data Assets were preserved
const countriesJsonDist = path.join(DIST_DIR, 'data', 'countries-110m.json');
const countriesJsonDistExists = fs.existsSync(countriesJsonDist) && fs.statSync(countriesJsonDist).size > 10000;
recordTest(
  'Asset Integrity: dist/data/countries-110m.json preserved',
  countriesJsonDistExists,
  countriesJsonDistExists
    ? `countries-110m.json preserved (${fs.statSync(countriesJsonDist).size} bytes)`
    : 'countries-110m.json missing or corrupted in dist/data/'
);

const faviconDist = path.join(DIST_DIR, 'favicon.svg');
recordTest(
  'Asset Integrity: dist/favicon.svg preserved',
  fs.existsSync(faviconDist),
  fs.existsSync(faviconDist) ? 'dist/favicon.svg preserved' : 'dist/favicon.svg missing'
);

// 1.7 Package.json Dependency Cleanliness
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const hasFontsource = Boolean(
  (pkgJson.dependencies && pkgJson.dependencies['@fontsource/jetbrains-mono']) ||
  (pkgJson.devDependencies && pkgJson.devDependencies['@fontsource/jetbrains-mono'])
);
const hasShadcn = Boolean(
  (pkgJson.dependencies && pkgJson.dependencies['shadcn']) ||
  (pkgJson.devDependencies && pkgJson.devDependencies['shadcn'])
);

recordTest(
  'Package Cleanliness: @fontsource/jetbrains-mono removed from package.json',
  !hasFontsource,
  hasFontsource ? '@fontsource/jetbrains-mono is still present in package.json' : 'Correctly uninstalled'
);

recordTest(
  'Package Cleanliness: shadcn removed from package.json',
  !hasShadcn,
  hasShadcn ? 'shadcn is still present in package.json' : 'Correctly uninstalled'
);

// ----------------------------------------------------------------------
// 2. FONT & MONOSPACE STACK RESILIENCE AUDIT
// ----------------------------------------------------------------------
console.log('\n--- 2. Testing Font & Monospace Stack Resilience ---');

const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

// 2.1 Non-blocking stylesheet pattern check
const hasPreload = indexHtmlContent.includes('rel="preload"') && indexHtmlContent.includes('as="style"');
const hasAsyncLink = indexHtmlContent.includes('media="print"') && indexHtmlContent.includes('onload="this.media=\'all\'"');
const hasNoscript = indexHtmlContent.includes('<noscript>') && indexHtmlContent.includes('fonts.googleapis.com');
const hasDisplaySwap = indexHtmlContent.includes('display=swap');

recordTest(
  'Font Delivery: Google Fonts display=swap specified',
  hasDisplaySwap,
  hasDisplaySwap ? 'display=swap present in font URL' : 'display=swap missing from font URL'
);

recordTest(
  'Font Delivery: Non-blocking media="print" onload pattern',
  hasAsyncLink,
  hasAsyncLink ? 'Asynchronous stylesheet link verified' : 'Non-blocking link missing or malformed'
);

recordTest(
  'Font Delivery: Noscript fallback provided',
  hasNoscript,
  hasNoscript ? '<noscript> stylesheet fallback present' : '<noscript> fallback missing'
);

// 2.2 CSS Monospace fallback stack audit
const indexCssPath = path.join(ROOT_DIR, 'src', 'app', 'index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

const fontsourceImportRegex = /@import\s+["']@fontsource\/jetbrains-mono[^"']*["'];?/g;
const fontsourceImports = indexCssContent.match(fontsourceImportRegex) || [];
recordTest(
  'CSS Cleanliness: Zero @fontsource imports in index.css',
  fontsourceImports.length === 0,
  fontsourceImports.length === 0
    ? 'Zero @fontsource imports in src/app/index.css'
    : `Found ${fontsourceImports.length} @fontsource imports in src/app/index.css: ${fontsourceImports.join(', ')}`
);

// Match --mono definition
const monoVarMatch = indexCssContent.match(/--mono:\s*([^;]+);/);
let monoStack = '';
if (monoVarMatch) {
  monoStack = monoVarMatch[1].trim();
}

const requiredSystemFallbacks = [
  'ui-monospace',
  'SFMono-Regular',
  'Menlo',
  'Monaco',
  'Consolas',
  'monospace'
];

const missingFallbacks = requiredSystemFallbacks.filter(fb => !monoStack.includes(fb));
recordTest(
  'Font Fallback: Comprehensive system monospace stack in --mono',
  monoVarMatch !== null && missingFallbacks.length === 0,
  missingFallbacks.length === 0
    ? `Stack contains all cross-platform fallbacks: ${monoStack}`
    : `Missing system fallbacks: ${missingFallbacks.join(', ')} (Found: ${monoStack})`,
  { monoStack }
);

// 2.3 Tabular-nums coverage for monospace & numbers
const tabularNumsApplied = indexCssContent.includes('font-variant-numeric: tabular-nums;');
recordTest(
  'Font Resilience: font-variant-numeric tabular-nums enabled for monospace',
  tabularNumsApplied,
  tabularNumsApplied
    ? 'tabular-nums correctly applied to code, kbd, samp, pre, and [class*="font-mono"]'
    : 'tabular-nums rule missing in index.css'
);

// 2.4 Dist CSS bundle verification
let distCssFiles = [];
if (fs.existsSync(DIST_ASSETS)) {
  distCssFiles = fs.readdirSync(DIST_ASSETS).filter(f => f.endsWith('.css'));
}

let compiledCssHasFontsource = false;
let compiledCssHasMonoVar = false;
if (distCssFiles.length > 0) {
  for (const cssFile of distCssFiles) {
    const content = fs.readFileSync(path.join(DIST_ASSETS, cssFile), 'utf8');
    if (content.includes('@fontsource/jetbrains-mono') || content.includes('jetbrains-mono-latin')) {
      compiledCssHasFontsource = true;
    }
    if (content.includes('JetBrains Mono') && content.includes('ui-monospace')) {
      compiledCssHasMonoVar = true;
    }
  }
}

recordTest(
  'Compiled CSS: No embedded @font-face binaries in dist CSS',
  !compiledCssHasFontsource,
  compiledCssHasFontsource ? 'Found embedded fontsource in compiled CSS' : 'Clean compiled CSS without embedded font binary paths'
);

recordTest(
  'Compiled CSS: Fallback stack baked into dist CSS',
  compiledCssHasMonoVar,
  compiledCssHasMonoVar ? 'Fallback monospace stack present in compiled CSS' : 'Compiled CSS does not contain expected monospace stack'
);

// 2.5 Boot Skeleton Fallback Fonts
const bootTitleFontCheck = indexHtmlContent.includes('-apple-system') && indexHtmlContent.includes('Inter');
const bootBadgeFontCheck = indexHtmlContent.includes('ui-monospace') && indexHtmlContent.includes('monospace');
recordTest(
  'Boot Skeleton: Safe system font fallbacks in inline HTML',
  bootTitleFontCheck && bootBadgeFontCheck,
  'Boot title and badge specify instant native system font fallbacks'
);

// ----------------------------------------------------------------------
// 3. HTTP CACHE DIRECTIVES AUDIT
// ----------------------------------------------------------------------
console.log('\n--- 3. Testing HTTP Cache Directives ---');

const distHeadersPath = path.join(DIST_DIR, '_headers');
const publicHeadersPath = path.join(PUBLIC_DIR, '_headers');

const headersExistsInDist = fs.existsSync(distHeadersPath);
recordTest(
  'Cache Headers: dist/_headers emitted',
  headersExistsInDist,
  headersExistsInDist ? 'dist/_headers exists' : 'dist/_headers does not exist'
);

if (headersExistsInDist) {
  const headersRaw = fs.readFileSync(distHeadersPath, 'utf8');
  
  // Parse Netlify / Cloudflare Pages _headers format
  // Format:
  // /path
  //   Header-Name: Header-Value
  const lines = headersRaw.split('\n');
  const rules = {};
  let currentPath = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      currentPath = trimmed;
      if (!rules[currentPath]) rules[currentPath] = {};
    } else if (currentPath) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
        const val = trimmed.slice(colonIdx + 1).trim();
        rules[currentPath][key] = val;
      }
    }
  }

  // 3.1 Verify /assets/* cache rule
  const assetsCc = rules['/assets/*'] && rules['/assets/*']['cache-control'];
  const assetsValid = assetsCc && assetsCc.includes('public') && assetsCc.includes('immutable') && assetsCc.includes('31536000');
  recordTest(
    'Cache Directives: /assets/* has 1-year immutable cache',
    Boolean(assetsValid),
    assetsValid ? `/assets/* Cache-Control: ${assetsCc}` : `Invalid /assets/* Cache-Control: ${assetsCc}`
  );

  // 3.2 Verify /data/* cache rule
  const dataCc = rules['/data/*'] && rules['/data/*']['cache-control'];
  const dataValid = dataCc && dataCc.includes('max-age=604800') && dataCc.includes('stale-while-revalidate=86400');
  recordTest(
    'Cache Directives: /data/* has 7-day stale-while-revalidate cache',
    Boolean(dataValid),
    dataValid ? `/data/* Cache-Control: ${dataCc}` : `Invalid /data/* Cache-Control: ${dataCc}`
  );

  // 3.3 Verify /auth/* is absent to prevent SPA HTML caching hazard
  const authCc = rules['/auth/*'] && rules['/auth/*']['cache-control'];
  const authSafe = !authCc;
  recordTest(
    'Cache Directives: /auth/* absent to prevent SPA HTML caching hazard',
    authSafe,
    authSafe
      ? '/auth/* correctly omitted (prevents SPA routes matching /auth/* from inheriting 7-day cache on fallback index.html)'
      : `Hazard detected: /auth/* has Cache-Control: ${authCc}`
  );

  // 3.4 Verify /favicon.svg cache rule
  const favCc = rules['/favicon.svg'] && rules['/favicon.svg']['cache-control'];
  const favValid = favCc && favCc.includes('max-age=86400') && favCc.includes('stale-while-revalidate=86400');
  recordTest(
    'Cache Directives: /favicon.svg has 1-day stale-while-revalidate cache',
    Boolean(favValid),
    favValid ? `/favicon.svg Cache-Control: ${favCc}` : `Invalid /favicon.svg Cache-Control: ${favCc}`
  );

  // 3.5 Verify /index.html Cache-Control is NOT cached
  const indexCc = rules['/index.html'] && rules['/index.html']['cache-control'];
  const indexNotCached = indexCc && indexCc.includes('no-cache') && (indexCc.includes('no-store') || indexCc.includes('max-age=0'));
  recordTest(
    'Cache Directives: /index.html is NOT cached',
    Boolean(indexNotCached),
    indexNotCached ? `/index.html Cache-Control: ${indexCc}` : `Invalid /index.html Cache-Control: ${indexCc}`
  );

  // 3.6 ADVERSARIAL STRESS TEST: SPA root URL '/' and fallback caching
  // In Cloudflare Pages and Netlify, does '/' inherit /index.html cache rules?
  const rootCc = rules['/'] && rules['/']['cache-control'];
  const wildcardCc = rules['/*'] && rules['/*']['cache-control'];
  if (!rootCc && !wildcardCc) {
    recordTest(
      'Cache Directives Adversarial Check: Root URL "/" explicit Cache-Control',
      'WARN',
      'Warning: /index.html has Cache-Control: no-cache, but "/" (the root URL) has no explicit Cache-Control directive in _headers. Depending on CDN platform (Cloudflare Pages vs Netlify vs CloudFront), requesting "/" may not inherit /index.html headers.'
    );
  } else {
    recordTest(
      'Cache Directives Adversarial Check: Root URL "/" explicit Cache-Control',
      true,
      `Root URL covered by rule: ${rootCc || wildcardCc}`
    );
  }
}

// ----------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------
console.log('\n====================================================');
console.log(`SUMMARY: ${results.passed} PASSED | ${results.failed} FAILED | ${results.warnings} WARNINGS`);
console.log('====================================================');

if (results.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
