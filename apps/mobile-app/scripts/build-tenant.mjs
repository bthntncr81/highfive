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

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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

// Zorunlu alan kontrolü (referans highfive hariç)
const required = ['tenantId', 'appName', 'slug', 'scheme', 'bundleId', 'apiUrl', 'easProjectId'];
const missing = required.filter((k) => !t[k] || String(t[k]).startsWith('REPLACE_'));
if (missing.length && t.subdomain !== 'highfive') {
  console.error(`❌ Eksik/placeholder alanlar: ${missing.join(', ')}`);
  process.exit(1);
}

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
  OTORDER_API_URL: t.apiUrl ?? '',
  OTORDER_WS_URL: t.wsUrl ?? '',
  OTORDER_EAS_PROJECT_ID: t.easProjectId ?? '',
  OTORDER_UPDATES_URL: t.updatesUrl ?? '',
  OTORDER_OWNER: t.owner ?? '',
};

console.log(`\n🏷️  Tenant: ${t.appName} (${t.subdomain})`);
console.log(`   bundle=${t.bundleId} · renk=${t.primaryColor} · api=${t.apiUrl}`);
console.log(`   profile=${profile} · platform=${platform}\n`);

const easArgs = ['build', '--profile', profile, '--platform', platform, '--non-interactive'];
console.log(`$ OTORDER_*=… eas ${easArgs.join(' ')}`);

if (!run) {
  console.log('\n(DRY) Gerçek build için sonuna --run ekleyin. Çözümlenen env:');
  for (const [k, v] of Object.entries(env)) if (k.startsWith('OTORDER_')) console.log(`   ${k}=${v}`);
  process.exit(0);
}

const res = spawnSync('eas', easArgs, { cwd: appDir, env, stdio: 'inherit' });
process.exit(res.status ?? 0);
