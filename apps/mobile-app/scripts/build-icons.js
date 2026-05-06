// SVG logodan PNG icon ve splash üretir.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PRIMARY = '#bb1e10';     // app marka kırmızısı (palette ile aynı)
const ASSETS = path.join(__dirname, '..', 'assets');
const SVG = fs.readFileSync(path.join(ASSETS, 'logo.svg'), 'utf-8');

// 1) Beyaz logo varyantı (kırmızı zemin için) — HIGH ve FIVE harflerini beyaz yap
const whiteLogoSvg = SVG
  .replace(/fill="#CF1D00"/g, 'fill="#FFFFFF"')
  .replace(/stroke="#CF1D00"/g, 'stroke="#FFFFFF"')
  .replace(/fill="#FFFFFF"\s+stroke="#FFFFFF"/g, 'fill="#FFFFFF" stroke="#FFFFFF"');

// 2) Orijinal logo (kırmızı + beyaz)
const originalSvg = SVG;

async function makeIcon(size, outputName, { bg, logoSvg, padding = 0.18 }) {
  const inner = Math.round(size * (1 - padding * 2));
  const logoBuf = await sharp(Buffer.from(logoSvg))
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const base = bg
    ? sharp({
        create: { width: size, height: size, channels: 4, background: bg },
      })
    : sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      });

  await base
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(ASSETS, outputName));
  console.log(`✓ ${outputName} (${size}x${size})`);
}

(async () => {
  // App icon (iOS) — kırmızı zemin + beyaz logo, 1024x1024
  await makeIcon(1024, 'icon.png', {
    bg: PRIMARY,
    logoSvg: whiteLogoSvg,
    padding: 0.16,
  });

  // Adaptive icon (Android) — foreground görseli, transparent bg + beyaz logo
  // (background renk app.json'da setlenmiş)
  await makeIcon(1024, 'adaptive-icon.png', {
    bg: null,
    logoSvg: whiteLogoSvg,
    padding: 0.28, // Android adaptive için daha fazla padding (safe zone)
  });

  // Splash icon — beyaz zemin + orijinal renkli logo, 1242x1242
  await makeIcon(1242, 'splash-icon.png', {
    bg: { r: 255, g: 255, b: 255, alpha: 1 },
    logoSvg: originalSvg,
    padding: 0.18,
  });

  // Favicon (web)
  await makeIcon(64, 'favicon.png', {
    bg: PRIMARY,
    logoSvg: whiteLogoSvg,
    padding: 0.12,
  });

  // Bildirim icon'u (Android — sadece beyaz silüet)
  await makeIcon(512, 'notification-icon.png', {
    bg: null,
    logoSvg: whiteLogoSvg,
    padding: 0.20,
  });

  // Header'larda kullanmak için: transparan zemin + orijinal renkli logo
  // (Yatay aspect — width 800, height auto)
  const yatay = await sharp(Buffer.from(originalSvg))
    .resize(1200, null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(yatay).toFile(path.join(ASSETS, 'logo-color.png'));
  console.log('✓ logo-color.png (yatay, transparan)');

  // Header'larda beyaz zemin koyu tema için: beyaz versiyonu
  const yatayWhite = await sharp(Buffer.from(whiteLogoSvg))
    .resize(1200, null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(yatayWhite).toFile(path.join(ASSETS, 'logo-white.png'));
  console.log('✓ logo-white.png (yatay, transparan, beyaz)');

  console.log('Done.');
})();
