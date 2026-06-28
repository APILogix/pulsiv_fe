// One-shot generator: bundles the TS theme definitions and writes
// src/styles/themes.css. Run with: node scripts/gen-themes.mjs
import esbuild from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const tmpOut = path.join(root, 'node_modules', '.tmp', 'gen-themes-bundle.mjs');

mkdirSync(path.dirname(tmpOut), { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'src', 'themes', '_generate.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tmpOut,
});

const mod = await import(pathToFileURL(tmpOut).href);

const outFile = path.join(root, 'src', 'styles', 'themes.css');
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, mod.css, 'utf8');

console.log(`Wrote ${outFile} (${mod.css.length} bytes)`);
