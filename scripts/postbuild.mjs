import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const distClient = 'dist/client';
const assetsDir = join(distClient, 'assets');
const manifestPath = join(distClient, '.vite', 'manifest.json');

// Read manifest to find entry and CSS files
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const cssFiles = new Set();
let entryJs = null;

for (const chunk of Object.values(manifest)) {
  if (chunk.isEntry && chunk.file?.endsWith('.js')) {
    entryJs = chunk.file;
  }
  if (chunk.file?.endsWith('.css')) cssFiles.add(chunk.file);
  if (chunk.css) chunk.css.forEach(f => cssFiles.add(f));
  if (chunk.assets) chunk.assets.forEach(f => { if (f.endsWith('.css')) cssFiles.add(f); });
}

// Also check src/client.tsx entry in manifest
const clientEntry = manifest['src/client.tsx'];
if (clientEntry) {
  entryJs = clientEntry.file;
  if (clientEntry.css) clientEntry.css.forEach(f => cssFiles.add(f));
}

if (!entryJs) {
  // Fallback: smallest index-*.js
  const jsFiles = readdirSync(assetsDir)
    .filter(f => f.startsWith('index-') && f.endsWith('.js'))
    .sort((a, b) => statSync(join(assetsDir, a)).size - statSync(join(assetsDir, b)).size);
  entryJs = jsFiles[0] ? `assets/${jsFiles[0]}` : null;
}

if (!entryJs) { console.error('No entry JS found'); process.exit(1); }

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PaceCast — GPX Race Time Predictor</title>
    <meta name="description" content="Upload a GPX route and get a personalized race finish-time prediction based on elevation, your previous race, age, and gender." />
    ${[...cssFiles].map(f => `<link rel="stylesheet" href="/${f}" />`).join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entryJs}"></script>
  </body>
</html>`;

writeFileSync(join(distClient, 'index.html'), html);
console.log('Generated dist/client/index.html — entry: ' + entryJs);
