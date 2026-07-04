// ============================================================================
// Config-driven Expo yapılandırması — TENANT BAŞINA MARKALI APP (Kurumsal paket).
// ============================================================================
// app.json BAZ (HighFive) olarak okunur; OTORDER_* env değişkenleri verilmişse
// marka alanları (isim/slug/scheme/bundle id/renk/API bağlaması/EAS) override edilir.
// Env yoksa çıktı birebir HighFive app.json'dur → mevcut build değişmez.
//
// Kullanım (bir tenant için build):
//   node scripts/build-tenant.mjs tenants/<subdomain>.json production
// script gerekli OTORDER_* env'lerini set edip `eas build`'i çağırır.

import type { ExpoConfig, ConfigContext } from 'expo/config';

const env = process.env;
const has = (k: string) => typeof env[k] === 'string' && env[k]!.length > 0;
const pick = (k: string, fallback: string | undefined) => (has(k) ? env[k]! : fallback);

export default ({ config }: ConfigContext): ExpoConfig => {
  const primary = pick('OTORDER_PRIMARY_COLOR', undefined);
  const bundleId = pick('OTORDER_BUNDLE_ID', config.ios?.bundleIdentifier);
  const androidPkg = pick('OTORDER_ANDROID_PACKAGE', pick('OTORDER_BUNDLE_ID', config.android?.package));

  const merged: ExpoConfig = {
    ...(config as ExpoConfig),
    name: pick('OTORDER_APP_NAME', config.name)!,
    slug: pick('OTORDER_SLUG', config.slug)!,
    scheme: pick('OTORDER_SCHEME', config.scheme as string),
    owner: pick('OTORDER_OWNER', config.owner),
    ios: {
      ...config.ios,
      bundleIdentifier: bundleId,
    },
    android: {
      ...config.android,
      package: androidPkg,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: config.android?.adaptiveIcon?.foregroundImage ?? './assets/adaptive-icon.png',
        backgroundColor: primary ?? config.android?.adaptiveIcon?.backgroundColor ?? '#bb1e10',
      },
    },
    splash: {
      ...config.splash,
      backgroundColor: primary ?? config.splash?.backgroundColor ?? '#bb1e10',
    },
    extra: {
      ...config.extra,
      apiUrl: pick('OTORDER_API_URL', (config.extra as any)?.apiUrl),
      wsUrl: pick('OTORDER_WS_URL', (config.extra as any)?.wsUrl),
      tenantId: pick('OTORDER_TENANT_ID', (config.extra as any)?.tenantId),
      tenantSubdomain: pick('OTORDER_SUBDOMAIN', (config.extra as any)?.tenantSubdomain),
      eas: {
        ...((config.extra as any)?.eas ?? {}),
        projectId: pick('OTORDER_EAS_PROJECT_ID', (config.extra as any)?.eas?.projectId),
      },
    },
  };

  if (has('OTORDER_UPDATES_URL')) {
    merged.updates = { ...config.updates, url: env.OTORDER_UPDATES_URL! };
  }

  return merged;
};
