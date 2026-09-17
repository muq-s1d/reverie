// Renders the README illustrations into .github/readme/*.webp (2x, transparent rounded corners).
//
//   node tools/readme-art/render.mjs            # needs `pnpm install` (uses the app's playwright + react-icons)
//   node tools/readme-art/render.mjs --html     # also writes preview.html next to this script
//
// Colours and mood icons come from the app itself, so the art stays in sync with src/mood/.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const app = join(root, 'apps/readest-app');
const require = createRequire(join(app, 'package.json'));
const { chromium } = require('playwright');
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement } = require('react');
const pi = require('react-icons/pi');

// Read MOODS / MOOD_COLORS / icon names from the app source instead of duplicating them.
const moodsSrc = readFileSync(join(app, 'src/mood/moods.ts'), 'utf8');
const COLORS = Object.fromEntries(
  [...moodsSrc.matchAll(/^\s+'?([A-Za-z/]+)'?: '(#[0-9a-f]{6})',$/gm)].map((m) => [m[1], m[2]]),
);
const iconSrc = readFileSync(join(app, 'src/mood/components/MoodIcon.tsx'), 'utf8');
const ICONS = Object.fromEntries(
  [...iconSrc.matchAll(/^\s+'?([A-Za-z/]+)'?: \{ icon: (Pi\w+),/gm)].map((m) => [m[1], m[2]]),
);
const MOODS = Object.keys(COLORS);
if (MOODS.length !== 15 || Object.keys(ICONS).length !== 15) throw new Error('mood parse failed');
const icon = (mood, size) => renderToStaticMarkup(createElement(pi[ICONS[mood]], { size }));

// Wave that stays flat, then ripples faster and taller toward the end (the app icon, stretched out).
function wave(x0, x1, y, flat, amp, cycles) {
  const pts = [];
  for (let k = 0; k <= 400; k++) {
    const x = x0 + ((x1 - x0) * k) / 400;
    const t = Math.max(0, (x - flat) / (x1 - flat));
    const a = amp * Math.min(1, 0.25 + t);
    pts.push(`${x.toFixed(1)},${(y - a * Math.sin(2 * Math.PI * cycles * t ** 1.6)).toFixed(1)}`);
  }
  return pts.join(' ');
}
const stops = (from = 0) =>
  [`<stop offset="0" stop-color="#FAFAFA"/>`, `<stop offset="${from}" stop-color="#FAFAFA"/>`]
    .concat(MOODS.filter((m) => m !== 'Neutral').map((m, i, a) =>
      `<stop offset="${(from + ((1 - from) * (i + 1)) / a.length).toFixed(3)}" stop-color="${COLORS[m]}"/>`))
    .join('');

const appIcon = readFileSync(join(app, 'src-tauri/icons/icon.svg'), 'utf8').replace(/width="1024" height="1024"/, 'width="100%" height="100%"');

// A little eighth note, sitting slightly higher or lower like a note on a staff.
const note = (dy) => `<svg width="20" height="30" viewBox="0 0 20 30" style="transform:translateY(${dy}px)">
  <rect x="12.2" y="3" width="2.6" height="17" fill="currentColor"/>
  <path d="M14.8 3 C18.6 5.4 20.4 8 18.6 13.4 C17.8 9.6 16.4 8.4 14.8 7.8 Z" fill="currentColor"/>
  <ellipse cx="8.5" cy="20.5" rx="6" ry="4.4" transform="rotate(-22 8.5 20.5)" fill="currentColor"/>
</svg>`;

const banner = `
<div id="banner" class="art sans" style="width:1280px;height:480px">
  <svg class="bg" width="1280" height="480">
    <defs>
      <linearGradient id="wg" gradientUnits="userSpaceOnUse" x1="560" x2="1240">${stops(0.18)}</linearGradient>
      <radialGradient id="glow" cx="0.78" cy="0.5" r="0.6"><stop offset="0" stop-color="#6366f1" stop-opacity=".28"/><stop offset=".55" stop-color="#c2677d" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    </defs>
    ${[170, 240, 310].map((y, i) => `<polyline fill="none" stroke="url(#wg)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" points="${wave(560, 1220, y, 690, 26 + i * 2, 4.2)}"/>`).join('')}
  </svg>
  <div class="banner-text">
    <div class="appicon">${appIcon}</div>
    <h1>Reverie</h1>
    <p>An e-reader that plays music<br>matching the mood of your book.</p>
    <div class="notes">
      ${[['Peace/Calm', '100% offline', 0], ['Wonder/Awe', '15 moods', -6], ['Excitement', '60 tracks', 4]]
        .map(([m, label, dy]) => `<span style="--c:${COLORS[m]}">${note(dy)}${label}</span>`)
        .join('')}
    </div>
  </div>
</div>`;

const passages = [
  ['Mystery', [88, 72, 94]],
  ['Fear', [80, 92, 60]],
  ['Joy', [94, 70, 84]],
];
const timeline = ['Neutral', 'Mystery', 'Mystery', 'Fear', 'Tension/Suspense', 'Joy', 'Joy', 'Peace/Calm', 'Romance', 'Sadness'];
const how = `
<div id="how" class="art sans" style="width:1280px;height:440px">
  <div class="steps">
    <div class="step">
      <div class="scene">
        <svg viewBox="0 0 240 170" width="240" height="170">
          <path d="M120 150 C96 136 58 132 22 140 L22 30 C58 22 96 26 120 40 Z" fill="#F3E6CF"/>
          <path d="M120 150 C144 136 182 132 218 140 L218 30 C182 22 144 26 120 40 Z" fill="#FBF3E4"/>
          ${[50, 66, 82, 98, 114].map((y, i) => `<path d="M36 ${y + 2 - i} Q70 ${y - 5 - i} 106 ${y + 3}" stroke="#C9B89A" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M134 ${y + 3} Q170 ${y - 5 - i} 204 ${y + 2 - i}" stroke="#D8C9AE" stroke-width="5" stroke-linecap="round" fill="none"/>`).join('')}
          <path d="M170 132 V168 L180 158 L190 168 V134" fill="${COLORS.Anger}"/>
        </svg>
      </div>
      <h2>Open a book</h2>
      <p>EPUB or PDF. It opens straight away.</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <div class="scene">
        <div class="passages">
          ${passages.map(([m, w]) => `<div class="passage" style="--c:${COLORS[m]}"><div class="lines">${w.map((p) => `<i style="width:${p}%"></i>`).join('')}</div><b>${icon(m, 18)}${m}</b></div>`).join('')}
        </div>
      </div>
      <h2>It finds the mood</h2>
      <p>Passage by passage, on your device.</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <div class="scene">
        <svg viewBox="0 0 260 170" width="260" height="170">
          <defs><linearGradient id="mw" gradientUnits="userSpaceOnUse" x1="10" x2="250">${stops(0.05)}</linearGradient></defs>
          ${[46, 78].map((y) => `<polyline fill="none" stroke="url(#mw)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" points="${wave(12, 248, y, 12, 14, 3)}"/>`).join('')}
          ${timeline.map((m, i) => `<rect x="${12 + i * 24}" y="124" width="22" height="14" rx="3" fill="${COLORS[m]}"/>`).join('')}
          <rect x="${12 + 5 * 24 + 10}" y="114" width="4" height="34" rx="2" fill="#FAFAFA"/>
        </svg>
      </div>
      <h2>Hear it change</h2>
      <p>Music crossfades as the story does.</p>
    </div>
  </div>
</div>`;

// Mood ring: one smooth gradient through all 15 mood colours, icons sitting in the band.
const RING = { size: 460, band: 78, icon: 30 };
const conic = MOODS.map((m, i) => `${COLORS[m]} ${(((i + 0.5) / MOODS.length) * 360).toFixed(1)}deg`)
  .concat(`${COLORS[MOODS[0]]} 360deg`)
  .join(', ');
// Dark icons read well on the bright moods, light ones on the deep moods.
const iconInk = (hex) => {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#0B0B0E' : '#FAFAFA';
};
const ringIcons = MOODS.map((m, i) => {
  const a = ((i + 0.5) / MOODS.length) * 360 - 90;
  const r = (RING.size - RING.band) / 2;
  const x = RING.size / 2 + r * Math.cos((a * Math.PI) / 180) - RING.icon / 2;
  const y = RING.size / 2 + r * Math.sin((a * Math.PI) / 180) - RING.icon / 2;
  return `<div class="ring-icon" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;color:${iconInk(COLORS[m])}" title="${m}">${icon(m, RING.icon)}</div>`;
}).join('');
const moodsRing = `
<div id="moods" class="art sans" style="width:1280px;height:600px">
  <svg class="bg" width="1280" height="600">
    <defs><radialGradient id="rglow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#6366f1" stop-opacity=".22"/>
      <stop offset=".6" stop-color="#c2677d" stop-opacity=".08"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <rect width="1280" height="600" fill="url(#rglow)"/>
  </svg>
  <div class="ring-wrap">
    <div class="ring" style="--conic:${conic}">
      <div class="ring-glow"></div>
      <div class="ring-band"></div>
      ${ringIcons}
      <div class="ring-center"><b>15</b><span>moods</span><em>4 tracks each</em></div>
    </div>
  </div>
</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,700&display=swap">
<style>
  body { margin: 0; padding: 24px; background: transparent; display: flex; flex-direction: column; gap: 24px; }
  .art { position: relative; border-radius: 28px; overflow: hidden; background: #0A0A10; color: #F7F5FA;
         font-family: 'Outfit', system-ui, sans-serif; font-weight: 300; }
  /* Dreamy ground: soft colour clouds, then a fine grain so the blends do not look flat. */
  .art::before { content: ''; position: absolute; inset: -18%; filter: blur(72px); opacity: .7;
    background:
      radial-gradient(38% 46% at 18% 24%, #6366f1 0%, transparent 70%),
      radial-gradient(34% 44% at 76% 18%, #c2677d 0%, transparent 72%),
      radial-gradient(40% 50% at 62% 88%, #10b981 0%, transparent 74%),
      radial-gradient(34% 40% at 94% 62%, #f5c842 0%, transparent 72%),
      radial-gradient(44% 52% at 36% 76%, #8b5cf6 0%, transparent 72%); }
  .art::after { content: ''; position: absolute; inset: 0; opacity: .2; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .art > * { position: relative; }
  .serif h1, .serif .ring-center b { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; }
  .sans h1, .sans .ring-center b { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 700; }
  .bg { position: absolute; inset: 0; }
  .banner-text { position: absolute; left: 72px; top: 58px; display: flex; flex-direction: column; }
  .appicon { width: 84px; height: 84px; border-radius: 18px; box-shadow: 0 0 0 1.5px rgba(255,255,255,.14), 0 8px 30px rgba(99,102,241,.25); }
  h1 { font-size: 118px; line-height: 1; letter-spacing: -0.02em; margin: 12px 0 14px; }
  .serif h1 { font-size: 124px; letter-spacing: 0; }
  .banner-text p { font-size: 27px; font-weight: 300; line-height: 1.4; color: #D6D2E0; margin: 0 0 26px; }
  .notes { display: flex; align-items: center; gap: 34px; }
  .notes span { display: flex; align-items: center; gap: 9px; font-size: 21px; font-weight: 400;
                color: #EDEAF4; text-shadow: 0 1px 6px rgba(0,0,0,.4); }
  .notes svg { color: var(--c); filter: drop-shadow(0 0 10px color-mix(in srgb, var(--c) 60%, transparent)); }
  .steps { display: flex; align-items: stretch; gap: 8px; padding: 40px 36px; height: 100%; box-sizing: border-box; }
  .step { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center;
          background: rgba(14,14,22,.62); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,.07);
          border-radius: 26px; padding: 26px 20px; }
  .scene { height: 230px; display: flex; align-items: center; justify-content: center; }
  .step h2 { font-size: 30px; font-weight: 500; line-height: 1.1; letter-spacing: -0.01em; margin: 6px 0 8px; }
  .step p { font-size: 19px; color: #A9A9B6; margin: 0; }
  .arrow { align-self: center; font-size: 40px; color: #54545F; }
  .passages { display: flex; flex-direction: column; gap: 12px; width: 300px; }
  .passage { display: flex; align-items: center; gap: 12px; background: rgba(36,36,48,.75); border-radius: 12px; padding: 10px 14px; }
  .lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .lines i { display: block; height: 6px; border-radius: 3px; background: #3A3A46; }
  .passage b { display: flex; align-items: center; gap: 6px; font-size: 16px; color: var(--c); min-width: 96px; }
  .ring-wrap { position: relative; height: 100%; display: flex; align-items: center; justify-content: center; }
  .ring { position: relative; width: 460px; height: 460px; }
  .ring::before { content: ''; position: absolute; inset: 78px; border-radius: 50%; background: rgba(10,10,16,.82); }
  .ring-band, .ring-glow { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, var(--conic));
    -webkit-mask: radial-gradient(closest-side, transparent 0 65.5%, #000 66% 100%); }
  .ring-glow { filter: blur(26px); opacity: .75; transform: scale(1.04); }
  .ring-icon { position: absolute; width: 30px; height: 30px; opacity: .85; }
  .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-center b { font-size: 112px; line-height: 1; letter-spacing: -0.02em; }
  .serif .ring-center b { font-size: 128px; }
  .ring-center span { font-size: 32px; font-weight: 300; color: #D6D2E0; letter-spacing: .04em; margin-top: 2px; }
  .ring-center em { font-style: normal; font-size: 19px; color: #908CA0; margin-top: 12px; }
</style></head><body>${banner}${how}${moodsRing}</body></html>`;

const out = join(root, '.github/readme');
mkdirSync(out, { recursive: true });
if (process.argv.includes('--html')) writeFileSync(join(here, 'preview.html'), html);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1340, height: 1400 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
// WebP keeps these gradient + grain images around 300 KB instead of 3 MB, alpha included.
for (const id of ['banner', 'how', 'moods']) {
  const png = await page.locator(`#${id}`).screenshot({ omitBackground: true });
  const webp = await page.evaluate(
    (dataUrl) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c.toDataURL('image/webp', 0.82).split(',')[1]);
        };
        img.src = dataUrl;
      }),
    `data:image/png;base64,${png.toString('base64')}`,
  );
  writeFileSync(join(out, `${id}.webp`), Buffer.from(webp, 'base64'));
  console.log(`wrote .github/readme/${id}.webp`);
}
await browser.close();
