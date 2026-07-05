// Gerçek ürün ekran görüntüleri — saas-landing için (sistem Chrome'u, puppeteer-core).
// Çalıştırma: node capture-screens.mjs  (önkoşul: API:3000, POS:4200, KDS:4201, order-site:4318)
import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync } from 'node:fs';

const TOKEN = readFileSync('/tmp/demo-token.txt', 'utf8').trim();
const TENANT_ID = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64').toString()).tenantId;
const OUT = 'apps/saas-landing/public/media';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--hide-scrollbars', '--force-device-scale-factor=2'],
});

async function shot({ name, url, width, height, scale = 2, headers, storage, waitFor, extraWaitMs = 1200, prep }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  if (headers) await page.setExtraHTTPHeaders(headers);
  if (storage) {
    await page.evaluateOnNewDocument((kv) => {
      for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
    }, storage);
  }
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => console.log(`  ! ${name}: waitFor '${waitFor}' görünmedi, yine de çekiliyor`));
  if (prep) await page.evaluate(prep);
  await new Promise((r) => setTimeout(r, extraWaitMs));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png (${width}x${height}@${scale}x)`);
  await page.close();
}

// 1) POS — masa haritası
await shot({
  name: 'pos-tables',
  url: 'http://localhost:4200/tables',
  width: 1280, height: 800,
  storage: { token: JSON.stringify(TOKEN) },
  waitFor: 'text/Masalar',
});

// 2) KDS — mutfak ekranı (auth'suz endpoint; tenant X-Tenant-ID ile çözülür)
await shot({
  name: 'kds-board',
  url: 'http://localhost:4201/',
  width: 1280, height: 800,
  headers: { 'X-Tenant-ID': TENANT_ID },
  extraWaitMs: 2500,
});

// 3) Müşteri sipariş sitesi — telefon boyutu, menü
await shot({
  name: 'order-site',
  url: 'http://localhost:4318/menu',
  width: 390, height: 844, scale: 3,
  headers: { 'X-Tenant-ID': TENANT_ID },
  extraWaitMs: 3000,
});

await browser.close();
console.log('tamam →', OUT);
