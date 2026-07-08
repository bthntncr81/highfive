// otorder.com vitrin carouseli asset üretimi:
//  1) Her örnek markanın wordmark'ı — landing'inin KENDİ fontu ve rengiyle,
//     şeffaf PNG (kart zemini marka renginde olacağı için).
//  2) Canlı sitelerin uzun ekran görüntüleri (1280x2000) — ortadaki kartta
//     yavaşça kayan "otomatik site önizlemesi" olarak kullanılır.
// Çalıştır: node apps/saas-landing/scripts/gen-showcase-assets.mjs [--logos] [--shots]
import puppeteer from 'puppeteer-core';
import { mkdirSync, copyFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/showcase');
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const doLogos = args.length === 0 || args.includes('--logos');
const doShots = args.length === 0 || args.includes('--shots');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();

// ── 1) Wordmark'lar ─────────────────────────────────────────────────────────
// Her giriş kendi Google Font'unu import eder; markup landing nav'ındakiyle birebir.
const MARKS = [
  {
    file: 'ustadoner.png',
    fonts: 'Anton',
    html: `<div style="font-family:'Anton',sans-serif;font-size:96px;letter-spacing:0.04em;color:#f4ede3">USTA<span style="color:#ff5a1c"> DÖNER</span></div>`,
  },
  {
    file: 'sushisel.png',
    fonts: 'Marcellus',
    html: `<div style="display:flex;align-items:center;gap:26px">
      <span style="display:grid;place-items:center;width:104px;height:104px;background:#E23D28;color:#fff;font-size:60px;font-weight:700;font-family:sans-serif">鮨</span>
      <span style="font-family:'Marcellus',serif;font-size:88px;letter-spacing:0.22em;color:#1b1b20">SUSHISEL</span>
    </div>`,
  },
  {
    file: 'pidem.png',
    fonts: 'Baloo+2:wght@700',
    html: `<div style="font-family:'Baloo 2',cursive;font-weight:700;font-size:92px;line-height:1;color:#F3C64E">Pidem Karadeniz</div>`,
  },
  {
    file: 'mokka.png',
    fonts: 'Unbounded:wght@900',
    html: `<div style="font-family:'Unbounded',sans-serif;font-weight:900;font-size:84px;color:#F6EFE5">MOKKA<span style="color:#C57B45">.</span></div>`,
  },
  {
    file: 'serbet.png',
    fonts: 'Yeseva+One',
    html: `<div style="font-family:'Yeseva One',serif;font-size:100px;color:#93C572">Şerbet</div>`,
  },
];

if (doLogos) {
  for (const m of MARKS) {
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>@import url('https://fonts.googleapis.com/css2?family=${m.fonts}&display=swap');
html,body{margin:0;background:transparent}
.wrap{display:inline-flex;align-items:center;padding:16px 20px}</style>
</head><body><div class="wrap" id="w">${m.html}</div></body></html>`;
    await page.setViewport({ width: 1400, height: 320, deviceScaleFactor: 2 });
    await page.setContent(doc, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 900));
    const el = await page.$('#w');
    await el.screenshot({ path: `${outDir}/${m.file}`, omitBackground: true });
    console.log('✓ logo', m.file);
  }
  // Hazır logolar: smashè (gerçek marka) + HighFive (beyaz el logosu)
  copyFileSync(resolve(here, '../../landing/public/smashe/logo-white.png'), `${outDir}/smashe.png`);
  copyFileSync(resolve(here, '../../landing/public/logow.png'), `${outDir}/highfive.png`);
  console.log('✓ logo smashe.png + highfive.png (kopya)');
}

// ── 2) Canlı site ekran görüntüleri ─────────────────────────────────────────
const SHOTS = [
  ['smashe', 'https://smashe.otorder.com/'],
  ['ustadoner', 'https://ustadoner.otorder.com/'],
  ['sushisel', 'https://sushisel.otorder.com/'],
  ['pidem', 'https://pidem.otorder.com/'],
  ['mokka', 'https://mokka.otorder.com/'],
  ['serbet', 'https://serbet.otorder.com/'],
  ['highfive', 'https://highfivepps.com/'],
];

if (doShots) {
  for (const [key, url] of SHOTS) {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    // Lazy görselleri tetikle: sayfayı aşağı kaydırıp başa dön
    await page.evaluate(async () => {
      await new Promise((done) => {
        let y = 0;
        const t = setInterval(() => {
          y += 700;
          window.scrollTo(0, y);
          if (y >= 2400) { clearInterval(t); window.scrollTo(0, 0); done(null); }
        }, 120);
      });
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({
      path: `${outDir}/shot-${key}.jpg`,
      type: 'jpeg',
      quality: 78,
      clip: { x: 0, y: 0, width: 1280, height: 2000 },
      captureBeyondViewport: true,
    });
    console.log('✓ shot', key);
  }
}

await browser.close();
console.log('out:', outDir);
