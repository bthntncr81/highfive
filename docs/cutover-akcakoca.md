# Akçakoca Cutover Runbook (Faz 8)

Tek-kiracılı canlı Akçakoca prod'unu (37.247.101.231) OtOrder çok-kiracılı DB'sine
(91.241.50.211) **tenant #1** olarak, **cuid'leri koruyarak** (sipariş geçmişi dahil)
import eder. In-place migration YOK → prod cutover'a kadar dokunulmaz.

## Bileşenler
- `packages/database/scripts/gen-cutover-sql.mjs` — DMMF'ten FK-sıralı, id-koruyan
  transform SQL üretir (`cutover.generated.sql`).
- `cutover.generated.sql` — üretilen transform:
  1. Tenant + ENTERPRISE Subscription oluşturur (cuid `:tenant_id` korunur).
  2. Generic kopyalayıcı: `staging.<tbl>` → `public.<tbl>`, ORTAK kolonlar (kesişim)
     + `tenantId` enjekte (şema-kayması toleranslı, cuid korunur, ON CONFLICT idempotent).
  3. `User` → `User` (platform kimliği) + `Membership` (eski role/pin/locationId).
  4. Doğrulama: staging vs public satır sayısı (fark WARNING).

## Prova (rehearsal) — CI/staging'de doğrulandı ✅
Eski şemayı taklit eden `staging` (tenantId yok, User'da role/pin) kurulur; cutover
çalıştırılır; sonuç: **cuid korunur** (Location/MenuItem id birebir), tenantId enjekte,
User→Membership bölünür (ADMIN/pin/locationId), ENTERPRISE sub. **2. çalıştırma
idempotent** (0 satır, sıfır dupe). → runbook aşağıdaki 2 provayı zorunlu kılar.

## Cutover adımları (prod)

> Prod deploy — açık onay gerektirir. 2 prova + checksum başarılı olmadan CANLI yapılmaz.

1. **Hazırlık:** `node packages/database/scripts/gen-cutover-sql.mjs` → güncel
   `cutover.generated.sql`. Yeni tenant cuid'i belirle (`TID`), subdomain (`akcakoca`).
2. **Prova ×2 (staging):** hedef DB'nin kopyasında:
   ```bash
   pg_dump -h 37.247.101.231 -U <old> <olddb> --no-owner --schema=public \
     | sed 's/^SET search_path.*/SET search_path = staging;/' > old.sql   # veya --schema rename
   psql "$STAGING_URL" -c 'CREATE SCHEMA staging;'          # dump'ı staging'e restore et
   psql "$STAGING_URL" -f old.sql
   psql "$STAGING_URL" -v tenant_id=$TID -v subdomain=akcakoca -v tenant_name="High Five" \
        -f cutover.generated.sql
   # checksum: her tablo için staging vs public md5(sorted rows) karşılaştır
   ```
   İki provada da satır sayıları + checksum birebir olmalı.
3. **Freeze:** kapalı saatte Akçakoca POS/sipariş yazımını durdur (read-only).
4. **Final dump → import:** güncel dump'ı hedef prod'un `staging` şemasına restore et,
   `cutover.generated.sql`'i CANLI public'e uygula.
5. **DNS repoint:** `akcakoca.otorder.com` (ve gerekiyorsa highfivepps.com) → yeni
   sunucu; wildcard SSL `*.otorder.com` hazır.
6. **Personel re-login:** eski JWT'ler tenant'sız → geçersiz (auth 401 "yeniden giriş").
   Personel **PIN** ile tekrar girer (Membership.pin korundu). Dual-accept YOK.
7. **Rollback yedeği:** eski sunucu 1-2 hafta read-only tutulur; sorun olursa DNS geri.

## Notlar / varsayımlar
- Eski `User` tablosu `role/pin/locationId/active` kolonlarını taşır (Membership bölme
  bunlara dayanır). Şema farklıysa 2b bloğu güncellenir.
- `staging`'de olmayan yeni tablolar (Membership/Subscription/StoredCard/…) atlanır.
- RLS: import owner rolüyle yapılır (FORCE yok → bypass); app rolü sonra bağlanır.
- PII (avatar/phone) eski şemada varsa kesişimle otomatik gelir; yoksa NULL.
