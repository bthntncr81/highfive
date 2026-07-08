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

  // Görsel yolları — env verilmişse override, yoksa baz app.json değerleri aynen kalır.
  const icon = pick('OTORDER_ICON', undefined);
  const splashImage = pick('OTORDER_SPLASH', undefined);
  const adaptiveIconImage = pick('OTORDER_ADAPTIVE_ICON', undefined);
  const notificationIcon = pick('OTORDER_NOTIFICATION_ICON', undefined);

  // expo-splash-screen / expo-notifications plugin config'leri de (görsel + renk)
  // yalnız ilgili env varsa patch'lenir; env yoksa plugins listesine dokunulmaz.
  const patchPlugins = !!(splashImage || notificationIcon || primary);
  const plugins = patchPlugins && Array.isArray(config.plugins)
    ? (config.plugins.map((p) => {
        if (Array.isArray(p) && p[0] === 'expo-splash-screen') {
          return [p[0], {
            ...(p[1] ?? {}),
            ...(splashImage ? { image: splashImage } : {}),
            ...(primary ? { backgroundColor: primary } : {}),
          }];
        }
        if (Array.isArray(p) && p[0] === 'expo-notifications') {
          return [p[0], {
            ...(p[1] ?? {}),
            ...(notificationIcon ? { icon: notificationIcon } : {}),
            ...(primary ? { color: primary } : {}),
          }];
        }
        return p;
      }) as ExpoConfig['plugins'])
    : config.plugins;

  const merged: ExpoConfig = {
    ...(config as ExpoConfig),
    name: pick('OTORDER_APP_NAME', config.name)!,
    slug: pick('OTORDER_SLUG', config.slug)!,
    scheme: pick('OTORDER_SCHEME', config.scheme as string),
    owner: pick('OTORDER_OWNER', config.owner),
    icon: icon ?? config.icon,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier: bundleId,
    },
    android: {
      ...config.android,
      package: androidPkg,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: adaptiveIconImage ?? config.android?.adaptiveIcon?.foregroundImage ?? './assets/adaptive-icon.png',
        backgroundColor: primary ?? config.android?.adaptiveIcon?.backgroundColor ?? '#bb1e10',
      },
    },
    splash: {
      ...config.splash,
      image: splashImage ?? config.splash?.image,
      backgroundColor: primary ?? config.splash?.backgroundColor ?? '#bb1e10',
    },
    extra: {
      ...config.extra,
      primaryColor: pick('OTORDER_PRIMARY_COLOR', (config.extra as any)?.primaryColor ?? '#bb1e10'),
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
