const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve('dist/index.html'), 'utf8');

const forbidden = [
  'motion-vendor',
  'map-vendor',
  'radix-vendor',
  'form-vendor',
  'zod-vendor',
  'authn-vendor',
  'auth-profile',
  'auth-shared'
];

console.log('=== FORBIDDEN CHUNK SCAN IN dist/index.html ===');
let forbiddenCount = 0;
for (const term of forbidden) {
  const found = html.includes(term);
  if (found) {
    console.error(`FAIL: Found forbidden pattern "${term}" in dist/index.html`);
    forbiddenCount++;
  } else {
    console.log(`PASS: No "${term}" found`);
  }
}

console.log('\n=== PRELOADED CHUNKS AUDIT ===');
const regex = /(?:href|src)="\/assets\/([^" ]+\.js)"/g;
let match;
let totalBytes = 0;
const chunks = [];

while ((match = regex.exec(html)) !== null) {
  const chunkName = match[1];
  const chunkPath = path.resolve('dist/assets', chunkName);
  const size = fs.statSync(chunkPath).size;
  totalBytes += size;
  chunks.push({ chunk: chunkName, sizeBytes: size, sizeKb: (size / 1024).toFixed(2) + ' KB' });
}

console.table(chunks);
const totalKb = totalBytes / 1024;
console.log(`Total preloaded JS size: ${totalBytes} bytes (${totalKb.toFixed(2)} KB)`);

if (forbiddenCount === 0) {
  console.log('CLEAN: Zero forbidden chunks found in dist/index.html');
} else {
  console.error(`VIOLATION: ${forbiddenCount} forbidden chunks present!`);
}

if (totalKb <= 500) {
  console.log('CLEAN: Total preloaded JS size satisfies <= 500 KB constraint');
} else {
  console.error('VIOLATION: Total preloaded JS size exceeds 500 KB limit!');
}
