// Phase 2: in-browser (WASM) speed test. Chromium ≈ the app on Linux/Windows, WebKit ≈ macOS.
//   node tools/mood-model/bench.mjs chromium|webkit [model dir under out/] [q8|fp32]
// Serves with COOP/COEP like Readest does (src/middleware.ts), so WASM threads are available.
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';

const [browserName = 'chromium', modelDir = 'model', dtype = 'q8'] = process.argv.slice(2);
const root = new URL('.', import.meta.url).pathname;
const require = createRequire(`${root}../../apps/readest-app/package.json`);
const playwright = require('playwright');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });
  createReadStream(file).pipe(res);
}).listen(0);
const { port } = server.address();

const browser = await playwright[browserName].launch();
const page = await browser.newPage();
page.on('console', (m) => console.log(`  [page] ${m.text()}`));
page.on('pageerror', (e) => console.log(`  [page error] ${e.message}`));
await page.goto(`http://localhost:${port}/bench.html?model=${modelDir}&dtype=${dtype}`);
const result = await page.waitForFunction(() => window.benchResult, null, { timeout: 10 * 60_000 });
console.log(`${browserName} ${modelDir} ${dtype}:`, await result.jsonValue());
await browser.close();
server.close();
