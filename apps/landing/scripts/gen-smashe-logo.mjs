// Smashè gerçek marka logosu üretimi — kullanıcının verdiği logoyla aynı aile:
// bold rounded script "smashè" (Pacifico) + altında ince "club" (Poppins 300).
// Şeffaf zeminli beyaz + royal mavi varyantlar (navbar beyaz zemin / hero mavi zemin).
// Çalıştır: node apps/landing/scripts/gen-smashe-logo.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/smashe');
mkdirSync(outDir, { recursive: true });

const SMASHE_BLUE = '#1747D1';

const html = (color, withClub = true) => `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Poppins:wght@300&display=swap');
html,body{margin:0;padding:0;background:transparent;}
.wrap{width:800px;height:${withClub ? 300 : 220}px;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.mark{font-family:'Pacifico',cursive;font-size:150px;line-height:1;color:${color};letter-spacing:-2px;}
.club{font-family:'Poppins',sans-serif;font-weight:300;font-size:34px;letter-spacing:14px;color:${color};margin-top:2px;text-indent:14px;}
</style></head><body>
<div class="wrap"><div class="mark">smashè</div>${withClub ? '<div class="club">club</div>' : ''}</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 300, deviceScaleFactor: 2 });

const jobs = [
  { file: 'logo-white.png', color: '#ffffff', club: true, h: 300 },
  { file: 'logo-blue.png', color: SMASHE_BLUE, club: true, h: 300 },
  { file: 'wordmark-white.png', color: '#ffffff', club: false, h: 220 },
];
for (const j of jobs) {
  await page.setViewport({ width: 800, height: j.h, deviceScaleFactor: 2 });
  await page.setContent(html(j.color, j.club), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${outDir}/${j.file}`, omitBackground: true });
  console.log('✓', j.file);
}
await browser.close();
console.log('out:', outDir);
