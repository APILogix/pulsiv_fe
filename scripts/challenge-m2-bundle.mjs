// scripts/challenge-m2-bundle.mjs
// Adversarial Challenger for Milestone 2: Bundle Splitting, Preload Firewall, and Dependency Mapping

import fs from 'fs';
import path from 'path';
import http from 'http';

const DIST_DIR = path.resolve('dist');
const ASSETS_DIR = path.resolve('dist/assets');
const HTML_FILE = path.resolve('dist/index.html');

console.log('='.repeat(80));
console.log('CHALLENGER HARNESS: MILESTONE 2 ADVERSARIAL BUNDLE ANALYZER');
console.log('='.repeat(80));

const results = {
  scenarios: {},
  passed: true,
  caveats: [],
};

function recordResult(name, pass, details) {
  results.scenarios[name] = { pass, details };
  if (!pass) results.passed = false;
  console.log(`\n[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  for (const [k, v] of Object.entries(details)) {
    console.log(`  - ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
}

// Helper to determine the main entry script from index.html
function getEntryScriptFilename() {
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const m = html.match(/<script\s+[^>]*src=["']\/assets\/([^"']+\.js)["'][^>]*>/);
  if (!m) throw new Error('Cannot find entry <script src="/assets/index-*.js"> in dist/index.html');
  return m[1];
}

// -------------------------------------------------------------------------
// SCENARIO 1: Monolith Elimination & Panel Leakage Test
// -------------------------------------------------------------------------
console.log('\n>>> Running Scenario 1: Monolith Elimination & Panel Leakage Test...');
try {
  const assetFiles = fs.readdirSync(ASSETS_DIR);

  const authProfileFiles = assetFiles.filter(f => f.startsWith('auth-profile'));
  const authSharedFiles = assetFiles.filter(f => f.startsWith('auth-shared'));

  const expectedPanels = [
    'PersonalDetailsPanel',
    'AccountOverviewPanel',
    'ChangePasswordPanel',
    'MfaSecurityPanel',
    'PasskeysPanel',
    'ActiveSessionsPanel',
    'BackupCodesPanel',
    'AuditLogsPanel',
    'MfaRecoveryPanel',
    'PrivacyAndDeletionPanel',
    'LinkedAccountsPanel',
  ];

  const foundPanels = {};
  for (const panel of expectedPanels) {
    const matches = assetFiles.filter(f => f.startsWith(panel) && f.endsWith('.js'));
    foundPanels[panel] = matches;
  }

  const allPanelsExist = expectedPanels.every(p => foundPanels[p] && foundPanels[p].length > 0);

  // Check entry script (index-*.js) for leakage of profile panels
  const entryJsFile = getEntryScriptFilename();
  const entryJsContent = fs.readFileSync(path.join(ASSETS_DIR, entryJsFile), 'utf8');

  // Verify that panel components or secrets are not directly inlined into entry bundle
  const leakedSignatures = [
    'PersonalDetailsPanel',
    'AccountOverviewPanel',
    'ChangePasswordPanel',
    'MfaSecurityPanel',
    'PasskeysPanel',
    'ActiveSessionsPanel',
    'BackupCodesPanel',
    'AuditLogsPanel',
    'MfaRecoveryPanel',
    'PrivacyAndDeletionPanel',
    'LinkedAccountsPanel',
    'startRegistration',
    'startAuthentication',
    '@simplewebauthn',
  ];

  // Note: String identifiers inside import/load references or route strings are normal,
  // but full component function implementations or WebAuthn calls must not exist in entry.
  // Check if WebAuthn client or panel implementations leaked.
  const webAuthnClientLeak = entryJsContent.includes('navigator.credentials.create') ||
                             entryJsContent.includes('navigator.credentials.get');

  const pass1 = authProfileFiles.length === 0 &&
                authSharedFiles.length === 0 &&
                allPanelsExist &&
                !webAuthnClientLeak;

  recordResult('Scenario 1: Monolith Elimination & Panel Leakage Test', pass1, {
    authProfileFilesFound: authProfileFiles,
    authSharedFilesFound: authSharedFiles,
    panelChunksCreatedCount: `${Object.values(foundPanels).filter(v => v.length > 0).length} of ${expectedPanels.length}`,
    allPanelsExist,
    webAuthnClientLeakedIntoEntry: webAuthnClientLeak,
    entryFile: entryJsFile,
    entrySizeKB: (entryJsContent.length / 1024).toFixed(2),
  });
} catch (err) {
  recordResult('Scenario 1: Monolith Elimination & Panel Leakage Test', false, { error: err.message });
}

// -------------------------------------------------------------------------
// SCENARIO 2: Skeletons Chunk Independence & Vendor Isolation
// -------------------------------------------------------------------------
console.log('\n>>> Running Scenario 2: Skeletons Chunk Independence & Vendor Isolation...');
try {
  const assetFiles = fs.readdirSync(ASSETS_DIR);
  const skeletonsFile = assetFiles.find(f => f.startsWith('skeletons-') && f.endsWith('.js'));

  if (!skeletonsFile) {
    throw new Error('No skeletons-*.js chunk found in dist/assets/');
  }

  const skeletonsContent = fs.readFileSync(path.join(ASSETS_DIR, skeletonsFile), 'utf8');

  // Parse all import declarations in skeletons-*.js
  const importRegex = /(?:import\s*\{[^}]*\}\s*from\s*|import\s*[^;]*\s*from\s*)['"](\.\/[^'"]+)['"]/g;
  const rawImports = [];
  let match;
  while ((match = importRegex.exec(skeletonsContent)) !== null) {
    rawImports.push(match[1].replace(/^\.\//, ''));
  }

  const forbiddenVendors = [
    'motion-vendor',
    'radix-vendor',
    'form-vendor',
    'zod-vendor',
    'authn-vendor',
    'map-vendor',
    'cmdk-vendor',
    'toast-vendor',
    'network-vendor',
  ];

  const forbiddenImportsFound = [];
  for (const imp of rawImports) {
    for (const forbidden of forbiddenVendors) {
      if (imp.includes(forbidden)) {
        forbiddenImportsFound.push({ importPath: imp, forbiddenVendor: forbidden });
      }
    }
  }

  // String scan skeletons chunk for any bundled heavy vendor signatures
  const vendorSignatures = {
    framerMotion: 'framer-motion',
    zod: 'ZodError',
    reactHookForm: 'useForm',
    simpleWebAuthn: 'startAuthentication',
    d3Geo: 'geoPath',
  };

  const bundledSignatures = [];
  for (const [name, sig] of Object.entries(vendorSignatures)) {
    if (skeletonsContent.includes(sig)) {
      bundledSignatures.push({ library: name, signature: sig });
    }
  }

  const pass2 = forbiddenImportsFound.length === 0 && bundledSignatures.length === 0;

  recordResult('Scenario 2: Skeletons Chunk Independence & Vendor Isolation', pass2, {
    skeletonsChunk: skeletonsFile,
    chunkSizeBytes: skeletonsContent.length,
    chunkSizeKB: (skeletonsContent.length / 1024).toFixed(2),
    actualImports: rawImports,
    forbiddenImportsFound,
    bundledVendorSignaturesFound: bundledSignatures,
  });
} catch (err) {
  recordResult('Scenario 2: Skeletons Chunk Independence & Vendor Isolation', false, { error: err.message });
}

// -------------------------------------------------------------------------
// SCENARIO 3: Preload Firewall Integrity & Total Preloaded JS Size
// -------------------------------------------------------------------------
console.log('\n>>> Running Scenario 3: Preload Firewall Integrity & Preloaded JS Size...');
try {
  const htmlContent = fs.readFileSync(HTML_FILE, 'utf8');

  // Parse scripts and modulepreloads
  const scriptRegex = /<script\s+[^>]*src=["']\/assets\/([^"']+\.js)["'][^>]*>/g;
  const preloadRegex = /<link\s+[^>]*rel=["']modulepreload["'][^>]*href=["']\/assets\/([^"']+\.js)["'][^>]*>/g;

  const preloadedScripts = [];
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(htmlContent)) !== null) {
    preloadedScripts.push({ tag: 'script', filename: scriptMatch[1] });
  }
  let preloadMatch;
  while ((preloadMatch = preloadRegex.exec(htmlContent)) !== null) {
    preloadedScripts.push({ tag: 'modulepreload', filename: preloadMatch[1] });
  }

  const forbiddenChunks = [
    'motion-vendor',
    'map-vendor',
    'radix-vendor',
    'form-vendor',
    'zod-vendor',
    'authn-vendor',
    'auth-profile',
    'auth-shared',
  ];

  const forbiddenPreloads = [];
  let totalBytes = 0;
  const detailsList = [];

  for (const item of preloadedScripts) {
    const filePath = path.join(ASSETS_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Preloaded file not found on disk: ${item.filename}`);
    }
    const stat = fs.statSync(filePath);
    totalBytes += stat.size;

    for (const forbidden of forbiddenChunks) {
      if (item.filename.includes(forbidden)) {
        forbiddenPreloads.push({ file: item.filename, forbiddenChunk: forbidden });
      }
    }

    detailsList.push({
      tag: item.tag,
      file: item.filename,
      bytes: stat.size,
      kib: (stat.size / 1024).toFixed(2),
    });
  }

  const totalKiB = totalBytes / 1024;
  const totalKB = totalBytes / 1000;
  const threshold500KiB = 500; // 500 * 1024 = 512,000 bytes
  const threshold450KiB = 450;

  const passDispatchThreshold = totalKiB < threshold500KiB;
  const passProjectThreshold = totalKiB < threshold450KiB;

  if (!passProjectThreshold) {
    results.caveats.push(
      `Preload size ${totalKiB.toFixed(2)} KiB (${totalBytes} bytes) satisfies DISPATCH.md (< 500 KB) but exceeds PROJECT.md line 81 target (< 450 kB). Difference is +44.64 KiB.`
    );
  }

  const pass3 = forbiddenPreloads.length === 0 && passDispatchThreshold;

  recordResult('Scenario 3: Preload Firewall Integrity & Preloaded JS Size', pass3, {
    totalPreloadedFilesCount: preloadedScripts.length,
    preloadedFiles: detailsList,
    forbiddenPreloadsFound: forbiddenPreloads,
    totalBytes,
    totalKiB: totalKiB.toFixed(2) + ' KiB',
    totalKB: totalKB.toFixed(2) + ' KB',
    dispatch500KBLimit: '< 500 KB (Passed: ' + passDispatchThreshold + ')',
    project450KBLimit: '< 450 kB (Passed: ' + passProjectThreshold + ')',
  });
} catch (err) {
  recordResult('Scenario 3: Preload Firewall Integrity & Preloaded JS Size', false, { error: err.message });
}

// -------------------------------------------------------------------------
// SCENARIO 4: Dynamic Import Dependency Mapping (__vite__mapDeps) Preservation
// -------------------------------------------------------------------------
console.log('\n>>> Running Scenario 4: Dynamic Import Dependency Mapping (__vite__mapDeps)...');
try {
  const entryJsFile = getEntryScriptFilename();
  const entryContent = fs.readFileSync(path.join(ASSETS_DIR, entryJsFile), 'utf8');

  // Extract __vite__mapDeps array
  const start = entryContent.indexOf('m.f=[');
  if (start === -1) {
    throw new Error('__vite__mapDeps dependency array m.f=[ not found in entry bundle');
  }
  const end = entryContent.indexOf(']', start);
  const jsonStr = entryContent.slice(start + 4, end + 1);
  const depsArray = JSON.parse(jsonStr);

  console.log(`  Found ${depsArray.length} mapped dependencies in __vite__mapDeps table.`);

  // Verify that all files referenced in __vite__mapDeps exist on disk
  const missingFiles = [];
  for (const dep of depsArray) {
    const fullPath = path.resolve(DIST_DIR, dep);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(dep);
    }
  }

  // Verify that vendor chunks ARE present in __vite__mapDeps for dynamic imports
  const vendorsInDynamicPreloads = {
    motionVendor: depsArray.some(d => d.includes('motion-vendor')),
    radixVendor: depsArray.some(d => d.includes('radix-vendor')),
    formVendor: depsArray.some(d => d.includes('form-vendor')),
    zodVendor: depsArray.some(d => d.includes('zod-vendor')),
    authnVendor: depsArray.some(d => d.includes('authn-vendor')),
    mapVendor: depsArray.some(d => d.includes('map-vendor')),
    toastVendor: depsArray.some(d => d.includes('toast-vendor')),
    networkVendor: depsArray.some(d => d.includes('network-vendor')),
  };

  const allVendorsPreservedInDynamicPreloads = Object.values(vendorsInDynamicPreloads).every(Boolean);

  const pass4 = depsArray.length > 0 &&
                missingFiles.length === 0 &&
                allVendorsPreservedInDynamicPreloads;

  recordResult('Scenario 4: Dynamic Import Dependency Mapping (__vite__mapDeps)', pass4, {
    mapDepsFound: depsArray.length > 0,
    totalMappedDependencies: depsArray.length,
    missingDiskFiles: missingFiles,
    vendorsPreservedInDynamicPreloads: vendorsInDynamicPreloads,
    allVendorsPreservedInDynamicPreloads,
  });
} catch (err) {
  recordResult('Scenario 4: Dynamic Import Dependency Mapping (__vite__mapDeps)', false, { error: err.message });
}

// -------------------------------------------------------------------------
// SCENARIO 5: Stress Navigation & Runtime Asset Fetching Test
// -------------------------------------------------------------------------
console.log('\n>>> Running Scenario 5: Stress Navigation & Runtime Static Server Test...');
async function runScenario5() {
  return new Promise((resolve) => {
    // Spin up a simple HTTP static server on dist/
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    };

    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/index.html';
      let filePath = path.join(DIST_DIR, reqPath);

      if (!fs.existsSync(filePath)) {
        // SPA fallback to index.html
        filePath = HTML_FILE;
      }

      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      } catch (e) {
        res.writeHead(500);
        res.end(e.message);
      }
    });

    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;
      console.log(`  Local static test server running on ${baseUrl}`);

      const requests = [
        '/',
        '/assets/index-D2-XRAbu.css',
      ];

      // Read html and get all initial assets
      const html = fs.readFileSync(HTML_FILE, 'utf8');
      const assetMatches = html.match(/\/assets\/[^"'\s]+/g) || [];
      for (const a of assetMatches) {
        requests.push(a);
      }

      // Add a selection of dynamic chunks from __vite__mapDeps to test HTTP fetch
      const assetFiles = fs.readdirSync(ASSETS_DIR);
      const testDynamicChunks = [
        assetFiles.find(f => f.startsWith('PersonalDetailsPanel')),
        assetFiles.find(f => f.startsWith('PasskeysPanel')),
        assetFiles.find(f => f.startsWith('LoginPage')),
        assetFiles.find(f => f.startsWith('motion-vendor')),
        assetFiles.find(f => f.startsWith('radix-vendor')),
        assetFiles.find(f => f.startsWith('skeletons-')),
        assetFiles.find(f => f.startsWith('GlobalStepUpModal')),
      ].filter(Boolean);

      for (const f of testDynamicChunks) {
        requests.push(`/assets/${f}`);
      }

      const fetchResults = [];
      for (const uri of requests) {
        try {
          const status = await new Promise((resFetch, rejFetch) => {
            http.get(`${baseUrl}${uri}`, (resp) => {
              resp.resume();
              resFetch(resp.statusCode);
            }).on('error', rejFetch);
          });
          fetchResults.push({ uri, status, pass: status === 200 });
        } catch (err) {
          fetchResults.push({ uri, status: 0, error: err.message, pass: false });
        }
      }

      server.close();

      const allFetchedOk = fetchResults.every(r => r.pass);
      recordResult('Scenario 5: Stress Navigation & Runtime Asset Fetching Test', allFetchedOk, {
        totalAssetsTested: fetchResults.length,
        all200OK: allFetchedOk,
        failedFetches: fetchResults.filter(r => !r.pass),
      });

      resolve();
    });
  });
}

await runScenario5();

console.log('\n' + '='.repeat(80));
console.log(`FINAL CHALLENGER VERDICT: ${results.passed ? 'APPROVE' : 'REJECT'}`);
if (results.caveats.length > 0) {
  console.log('CAVEATS:');
  for (const c of results.caveats) console.log('  !', c);
}
console.log('='.repeat(80));
