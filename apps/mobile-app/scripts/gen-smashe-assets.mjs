#!/usr/bin/env node
// ============================================================================
// gen-smashe-assets.mjs — Smashé marka görsellerini üretir (assets-smashe/).
// ============================================================================
// Yöntem: HTML/CSS şablon → sistem Chrome (puppeteer-core) ile PNG screenshot.
// Kimlik: koyu lacivert #122a5c (koyu ton #0c1d42), beyaz, pöti kare (gingham)
// doku, Alfa Slab One (Americana tabela slab'ı) — apps/landing SmasheLanding.tsx referans.
//
// Çalıştırma: node apps/mobile-app/scripts/gen-smashe-assets.mjs
// (puppeteer-core repo kökü node_modules'ünden çözülür; Chrome path capture-screens.mjs ile aynı)

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'assets-smashe');
mkdirSync(OUT, { recursive: true });

const NAVY = '#122a5c';
const NAVY_DEEP = '#0c1d42';

// Ortak şablon — Alfa Slab One yüklenir (yoksa Georgia bold'a düşer).
const html = (body, { transparent = false, bg = NAVY, gingham = false } = {}) => `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body {
    background: ${transparent ? 'transparent' : bg};
    ${gingham ? `background-image:
      repeating-linear-gradient(0deg,  rgba(255,255,255,0.06) 0 26px, transparent 26px 52px),
      repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 26px, transparent 26px 52px);` : ''}
    display: flex; align-items: center; justify-content: center;
    -webkit-font-smoothing: antialiased;
  }
  .wm { font-family: 'Alfa Slab One', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; line-height: 1; }
  .georgia-bold { font-family: Georgia, serif; font-weight: 700; }
</style></head>
<body>${body}</body></html>`;

const SHOTS = [
  {
    name: 'icon.png', width: 1024, height: 1024,
    opts: { gingham: true },
    body: `<div style="text-align:center">
      <div class="wm" style="color:#fff; font-size:196px">SMASHÉ</div>
    </div>`,
  },
  {
    name: 'adaptive-icon.png', width: 1024, height: 1024,
    // Android adaptive icon güvenli alanı: merkez ~%66 — wordmark küçük tutulur.
    opts: {},
    body: `<div class="wm" style="color:#fff; font-size:128px">SMASHÉ</div>`,
  },
  {
    name: 'splash-icon.png', width: 1024, height: 1024,
    opts: {},
    body: `<div style="text-align:center">
      <div class="wm" style="color:#fff; font-size:168px">SMASHÉ</div>
      <div class="georgia-bold" style="color:rgba(255,255,255,0.75); font-size:44px; letter-spacing:0.28em; margin-top:36px; text-transform:uppercase">smash burger</div>
    </div>`,
  },
  {
    name: 'logo-white.png', width: 800, height: 220,
    opts: { transparent: true },
    body: `<div class="wm" style="color:#fff; font-size:150px">SMASHÉ</div>`,
  },
  {
    name: 'logo-color.png', width: 800, height: 220,
    opts: { transparent: true },
    body: `<div class="wm" style="color:${NAVY}; font-size:150px">SMASHÉ</div>`,
  },
  {
    name: 'notification-icon.png', width: 96, height: 96,
    // Android bildirim ikonu: şeffaf zeminde beyaz siluet.
    opts: { transparent: true },
    body: `<div class="wm" style="color:#fff; font-size:84px">S</div>`,
  },
];

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--hide-scrollbars'],
});

for (const { name, width, height, body, opts } of SHOTS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html(body, opts), { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({
    path: `${OUT}/${name}`,
    omitBackground: !!opts.transparent,
  });
  console.log(`✓ ${name} (${width}x${height}${opts.transparent ? ', şeffaf' : ''})`);
  await page.close();
}

await browser.close();
console.log(`\nÇıktı: ${OUT}`);
