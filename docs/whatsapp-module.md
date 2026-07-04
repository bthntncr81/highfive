# WhatsApp Sipariş Modülü — Entegrasyon & Deploy Runbook

İki ürün: (1) OtOrder POS Suite, (2) **WhatsApp Sipariş Modülü** (`WhatsappRestourant`
reposu, `order.highfivepps.com`). Ayrı üyelik/ödeme; POS ile **"Bağlan"** ile eşleşir.

## Bağlan akışı (bu repoda — TAMAM + testli)

POS Ayarlar → "WhatsApp Modülüne Bağlan":

1. `POST /api/integrations/whatsapp/connect` (OWNER/ADMIN token; **Pro+ feature-flag
   `whatsappLink`**) → tenant için `IntegrationPartner` oluşturur/yeniler, `apiKey`
   üretir; döner: `{ posApiUrl, posApiKey, tenant }`.
   - `moduleBaseUrl` verilirse config modülün `POST /api/pos-integration/connect`
     ucuna otomatik yazılır; verilmezse tenant elle girer.
2. Modül bu `apiKey` ile POS'un **veri düzlemine** erişir (`routes/external.ts`):
   - `GET /api/external/menu` (`menu:read`) — menü senkron
   - `POST /api/external/orders` (`orders:write`) — WhatsApp siparişi → POS/Mutfak
   - `GET /api/external/orders/:id` (`orders:read`) — durum
3. `GET /api/integrations/whatsapp/status` · `POST /api/integrations/whatsapp/disconnect`.

**Çok-kiracılı düzeltme:** dış çağrı JWT/subdomain taşımaz; tenant `X-API-Key`'den
çözülür (`middleware/api-key.ts` → `platformDb`'de partner → `req.tenant` +
`req.db = dbFor(partner.tenantId)`). Böylece external route'lar doğru tenant'a
scope'lanır; API key yalnız kendi tenant'ının verisini görür (izolasyon testli).

## Modül tarafı deploy (WhatsappRestourant reposu, sunucu-2) — PROD adımı

> Bu adımlar 91.241.50.211'de, ayrı repo ile yapılır (prod deploy — onay gerektirir).

1. **Dockerize** (host PM2'den çıkar): `whatres` api+worker + kendi postgres(5433) +
   redis(6380) `docker-compose` ile. `.env` (OpenAI/iyzico) → Docker secret.
   Açık DB portlarını (5433) iç ağa al.
2. **nginx server block** — `order.highfivepps.com` şu an default vhost'a düşüyor
   ("Superpersonel"); aşağıdaki blok eklenir:

```nginx
server {
    listen 80;
    server_name order.highfivepps.com;
    location / { proxy_pass http://whatres-web:3000; proxy_set_header Host $host; }
    location /api { proxy_pass http://whatres-api:PORT; proxy_set_header Host $host; }
}
```

3. `pos-integration.service.ts` (modül) `posApiUrl`/`posApiKey`'i saklar; menü sync +
   sipariş push HighFive `/api/external/*`'e gider.

## E2E doğrulama (Bağlan)

`apps/api/tests/integrations.test.ts`: PRO connect → apiKey → `X-API-Key` ile
`/api/external/menu` yalnız o tenant'ın menüsü; geçersiz key 401; STARTER connect
403 `FEATURE_LOCKED`. (5/5 yeşil.)
