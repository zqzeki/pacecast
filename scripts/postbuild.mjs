import { readdirSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const assetsDir = 'dist/client/assets';
const assets = readdirSync(assetsDir);

const cssFiles = assets.filter(f => f.endsWith('.css'));
const jsFiles = assets
  .filter(f => f.startsWith('index-') && f.endsWith('.js'))
  .sort((a, b) => statSync(join(assetsDir, a)).size - statSync(join(assetsDir, b)).size);

const entryJs = jsFiles[0];

if (!entryJs) {
  console.error('Could not find entry JS file');
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PaceCast — GPX Race Time Predictor</title>
    <meta name="description" content="Upload a GPX route and get a personalized race finish-time prediction based on elevation, your previous race, age, and gender." />
    ${cssFiles.map(f => `<link rel="stylesheet" href="/assets/${f}" />`).join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${entryJs}"></script>
  </body>
</html>`;

writeFileSync('dist/client/index.html', html);
console.log('Generated dist/client/index.html with entry: ' + entryJs);
