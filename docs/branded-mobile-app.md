# Markalı Mobil App Pipeline (Kurumsal paket)

Her Kurumsal tenant kendi markasıyla (isim, ikon, renk, bundle id) App Store /
Play Store'da yayınlanan bir uygulamaya sahip olur. Tek kod tabanı; yapılandırma
`app.config.ts` üzerinden **env-driven** parametrelenir.

## Mekanik

- `app.json` — HighFive BAZ config (değişmez).
- `app.config.ts` — `OTORDER_*` env verilmişse marka alanlarını override eder
  (isim/slug/scheme/bundleId/renk/apiUrl/wsUrl/tenantId/EAS projectId/updates).
  Env yoksa çıktı = app.json (HighFive build'i etkilenmez).
- `lib/api.ts` — `extra.tenantId` → her istekte **`X-Tenant-ID`** header (API tenant'ı
  bundan çözer; subdomain/JWT gerekmez).
- `tenants/<subdomain>.json` — tenant marka dosyası.
- `scripts/build-tenant.mjs` — tenant dosyasını okur → `OTORDER_*` env set eder →
  `eas build` çağırır.

## Yeni Kurumsal tenant ekleme

1. `tenants/highfive.json`'u kopyala → `tenants/<subdomain>.json`, doldur:
   `tenantId` (tenant cuid), `appName`, `slug`, `scheme`, `bundleId`,
   `androidPackage`, `primaryColor`, `apiUrl`, `wsUrl`, `easProjectId`, `updatesUrl`.
2. EAS projesi oluştur: `eas init` (tenant slug'ı ile) → `easProjectId`'yi dosyaya yaz.
3. İkon/splash asset'lerini tenant'a göre değiştir (assets/; ileride tenant-başına
   asset klasörü). 
4. DRY doğrula: `node scripts/build-tenant.mjs tenants/<subdomain>.json production android`
5. Gerçek build: aynı komuta `--run` ekle → `eas build`.
6. Store submit: `eas submit --profile production --platform <ios|android>`
   (App Store Connect / Play Console hesap bağlaması gerekir).

## OTA güncelleme

`eas update --branch production` — tenant'ın `updatesUrl` (u.expo.dev/<projectId>)
kanalına yayınlanır; store review'suz JS güncellemesi.

## Doğrulama

`node scripts/build-tenant.mjs tenants/example-pizzaci.json production android`
(DRY) → çözümlenen tüm `OTORDER_*` env + `eas build` komutu yazdırılır. `app.config.ts`
esbuild ile derlenir (syntax OK).
