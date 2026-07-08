#!/usr/bin/env node
// ============================================================================
// build-tenant.mjs — bir tenant için markalı Expo/EAS build (Kurumsal paket).
// ============================================================================
// tenants/<subdomain>.json okunur → OTORDER_* env set edilir (app.config.ts bunları
// baz app.json üzerine uygular) → `eas build` çağrılır.
//
// Kullanım:
//   node scripts/build-tenant.mjs tenants/pizzacimehmet.json production android
//   node scripts/build-tenant.mjs tenants/pizzacimehmet.json preview all --run
// --run bayrağı olmadan DRY: yalnız çözümlenen env + komut yazılır (eas çağrılmaz).

import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(__dirname, '..');

const [, , tenantPath, profileArg, platformArg, ...rest] = process.argv;
if (!tenantPath) {
  console.error('Kullanım: node scripts/build-tenant.mjs <tenants/x.json> [profile] [platform] [--run]');
  process.exit(1);
}
const profile = profileArg && !profileArg.startsWith('--') ? profileArg : 'production';
const platform = platformArg && !platformArg.startsWith('--') ? platformArg : 'all';
const run = [profileArg, platformArg, ...rest].includes('--run');

const t = JSON.parse(readFileSync(resolve(process.cwd(), tenantPath), 'utf8'));

// Zorunlu alan kontrolü (referans highfive hariç) — DRY modda yalnız uyarı,
// gerçek build (--run) engellenir (örn. smashe: EAS projesi henüz açılmadı).
const required = ['tenantId', 'appName', 'slug', 'scheme', 'bundleId', 'apiUrl', 'easProjectId'];
const missing = required.filter((k) => !t[k] || String(t[k]).startsWith('REPLACE_'));
if (missing.length && t.subdomain !== 'highfive') {
  if (run) {
    console.error(`❌ Eksik/placeholder alanlar: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.warn(`⚠️  Eksik/placeholder alanlar (build --run ile engellenir): ${missing.join(', ')}`);
}

// Görsel yolları: json'da açık alan varsa o; yoksa assetsDir'den türet; yoksa boş
// (boş env = app.config.ts baz app.json değerini kullanır).
const assetPath = (explicit, file) =>
  explicit ?? (t.assetsDir ? `./${t.assetsDir}/${file}` : '');

const env = {
  ...process.env,
  OTORDER_TENANT_ID: t.tenantId ?? '',
  OTORDER_SUBDOMAIN: t.subdomain ?? '',
  OTORDER_APP_NAME: t.appName ?? '',
  OTORDER_SLUG: t.slug ?? '',
  OTORDER_SCHEME: t.scheme ?? '',
  OTORDER_BUNDLE_ID: t.bundleId ?? '',
  OTORDER_ANDROID_PACKAGE: t.androidPackage ?? t.bundleId ?? '',
  OTORDER_PRIMARY_COLOR: t.primaryColor ?? '',
  OTORDER_ACCENT_COLOR: t.accentColor ?? '',
  OTORDER_BG_COLOR: t.bgColor ?? '',
  OTORDER_ICON: assetPath(t.icon, 'icon.png'),
  OTORDER_SPLASH: assetPath(t.splash, 'splash-icon.png'),
  OTORDER_ADAPTIVE_ICON: assetPath(t.adaptiveIcon, 'adaptive-icon.png'),
  OTORDER_NOTIFICATION_ICON: assetPath(t.notificationIcon, 'notification-icon.png'),
  OTORDER_API_URL: t.apiUrl ?? '',
  OTORDER_WS_URL: t.wsUrl ?? '',
  OTORDER_EAS_PROJECT_ID: t.easProjectId ?? '',
  OTORDER_UPDATES_URL: t.updatesUrl ?? '',
  OTORDER_OWNER: t.owner ?? '',
};

// assetsDir varsa: klasördeki tenant görselleri ./assets/ ÜZERİNE kopyalanır
// (app kodundaki statik require('../assets/...') çağrıları için).
const OVERLAY_FILES = ['icon.png', 'splash-icon.png', 'adaptive-icon.png', 'logo-white.png', 'logo-color.png', 'notification-icon.png'];
function overlayAssets() {
  if (!t.assetsDir) return;
  const srcDir = resolve(appDir, t.assetsDir);
  if (!existsSync(srcDir)) {
    console.error(`❌ assetsDir bulunamadı: ${srcDir}`);
    process.exit(1);
  }
  const copied = [];
  for (const f of OVERLAY_FILES) {
    const src = join(srcDir, f);
    if (existsSync(src)) {
      copyFileSync(src, join(appDir, 'assets', f));
      copied.push(f);
    }
  }
  if (copied.length) {
    console.log(`🖼️  assets overlaid (${t.assetsDir} → assets/: ${copied.join(', ')}) — git checkout ile geri al`);
  }
}

console.log(`\n🏷️  Tenant: ${t.appName} (${t.subdomain})`);
console.log(`   bundle=${t.bundleId} · renk=${t.primaryColor} · api=${t.apiUrl}`);
console.log(`   profile=${profile} · platform=${platform}\n`);

const easArgs = ['build', '--profile', profile, '--platform', platform, '--non-interactive'];
console.log(`$ OTORDER_*=… eas ${easArgs.join(' ')}`);

if (!run) {
  console.log('\n(DRY) Gerçek build için sonuna --run ekleyin. Çözümlenen env:');
  for (const [k, v] of Object.entries(env)) if (k.startsWith('OTORDER_')) console.log(`   ${k}=${v}`);
  if (t.assetsDir) console.log(`   (build öncesi ${t.assetsDir}/ → assets/ overlay yapılacak)`);
  process.exit(0);
}

overlayAssets();

const res = spawnSync('eas', easArgs, { cwd: appDir, env, stdio: 'inherit' });
process.exit(res.status ?? 0);
