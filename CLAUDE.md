# HighFive Suite

Restoran sipariş yönetim sistemi. Pizza, Pasta ve Sandwich restoranlarına optimize edilmiş POS, mutfak ekranı (KDS) ve müşteri sipariş sayfası içerir.

## Tech Stack

- **Backend:** Fastify 5.7, Node.js 20+
- **Frontend:** React 19, Vite 5.4
- **Database:** PostgreSQL 15, Prisma 5.10
- **Monorepo:** Nx 22.3 (npm workspaces)
- **Styling:** Tailwind CSS 3.4, Framer Motion 12
- **Language:** TypeScript 5.9 (strict mode)
- **Real-time:** WebSocket (@fastify/websocket)
- **Payment:** iyzico (3DS)
- **Container:** Docker + Nginx

## Monorepo Yapısı

```
apps/
  api/          # Fastify backend API (port 3000)
  pos/          # POS yönetim paneli (React + Vite)
  kitchen/      # Mutfak ekranı / KDS (React + Vite)
  landing/      # Müşteri sipariş sayfası (React + Vite)

packages/
  database/     # Prisma schema, migrations, seed
  types/        # Paylaşılan TypeScript tipleri ve enum'lar
  utils/        # Paylaşılan utility fonksiyonlar (format, hesaplama, storage)
```

## Geliştirme Komutları

```bash
# Bağımlılıkları kur
npm install

# Veritabanını başlat (Docker)
docker-compose -f docker-compose.dev.yml up -d

# Prisma client oluştur ve schema'yı pushla
npx prisma generate
npx prisma db push

# Seed data yükle
npx ts-node packages/database/prisma/seed.ts

# Tüm uygulamaları başlat
npx nx run-many -t serve -p api pos kitchen landing

# Tek uygulama başlat
npx nx serve api
npx nx serve pos
npx nx serve kitchen
npx nx serve landing

# Build
npx nx build api
npx nx run-many -t build
```

### Veritabanı Komutları

```bash
npm run db:generate       # Prisma client oluştur
npm run db:push           # Schema'yı veritabanına pushla
npm run db:migrate        # Migration oluştur (dev)
npm run db:migrate:prod   # Migration deploy et (prod)
npm run db:seed           # Seed data yükle
npm run db:studio         # Prisma Studio GUI aç
```

## Port Yapılandırması

| Servis   | Dev  | Prod |
|----------|------|------|
| API      | 3000 | 3000 |
| POS      | 4200 | 5501 |
| Kitchen  | 4201 | 5502 |
| Landing  | 4202 | 5503 |
| Postgres | 5432 | 5432 |

## Mimari Kurallar

### State Management
- Context API + useState/useCallback/useMemo hook'ları kullanılır. Redux veya Zustand KULLANILMAZ.
- Her app kendi context provider'larına sahiptir (AuthContext, CartContext, WebSocketContext).
- localStorage ile state persistence yapılır (cart, table session, loyalty).

### API Katmanı
- Backend route dosyaları: `apps/api/src/routes/` altında (19 route modülü).
- Her route dosyası Fastify plugin pattern'i ile yazılır (`fastify.register`).
- Prisma client Fastify instance üzerinde `fastify.prisma` olarak decorate edilmiştir.
- Frontend'de custom `ApiClient` class kullanılır (`apps/*/src/lib/api.ts`).

### Authentication
- JWT token (7 gün expiry) + bcryptjs password hashing.
- PIN tabanlı hızlı giriş (4 haneli PIN, 12 saat expiry) - POS için.
- Middleware: `verifyAuth()`, `verifyAdmin()`, `verifyKitchen()` (`apps/api/src/middleware/auth.ts`).
- 6 kullanıcı rolü: ADMIN, MANAGER, WAITER, KITCHEN, CASHIER, COURIER.

### WebSocket
- Channel-based pub/sub: orders, kitchen, tables, notifications, menu, analytics.
- Broadcast fonksiyonları: `broadcastOrderUpdate()`, `broadcastNewOrder()`, `broadcastTableUpdate()`, `broadcastMenuUpdate()`.
- WebSocket endpoint: `/ws`.

### Veritabanı
- Prisma schema: `packages/database/prisma/schema.prisma` (28 model).
- Multi-location desteği (Location modeli ile).
- Soft delete kullanılmaz, kayıtlar doğrudan silinir.

### Frontend Convention'lar
- Komponentler fonksiyonel component + hooks olarak yazılır.
- Tailwind CSS ile inline styling (ayrı CSS dosyası minimum).
- Framer Motion ile animasyonlar (landing app).
- Lucide React ile ikonlar.
- React Router v6 ile client-side routing.
- Protected route pattern ile auth kontrolü (POS).

### Dil
- UI metinleri Türkçe yazılır.
- Kod (değişken isimleri, fonksiyonlar, yorumlar) İngilizce yazılır.
- API endpoint'leri İngilizce'dir.

## Ortam Değişkenleri

```
DATABASE_URL=postgresql://highfive:highfive123@localhost:5432/highfive_suite
JWT_SECRET=highfive-super-secret-key-2026
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=sandbox-...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

## Kritik Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `apps/api/src/main.ts` | Fastify sunucu başlatma, plugin ve route kayıtları |
| `apps/api/src/routes/orders.ts` | Sipariş yönetimi (en büyük route dosyası) |
| `apps/api/src/routes/payment.ts` | iyzico 3DS ödeme entegrasyonu |
| `apps/api/src/middleware/auth.ts` | JWT doğrulama middleware'leri |
| `apps/api/src/websocket/index.ts` | WebSocket channel yönetimi ve broadcast |
| `apps/pos/src/app/app.tsx` | POS ana router ve layout |
| `apps/kitchen/src/app/app.tsx` | KDS tam implementasyonu (tek dosya) |
| `apps/landing/src/App.tsx` | Landing ana router |
| `packages/database/prisma/schema.prisma` | Veritabanı şeması (28 model) |
| `packages/types/src/index.ts` | Paylaşılan tipler ve enum'lar |
| `packages/utils/src/index.ts` | Paylaşılan utility fonksiyonlar |
| `docker-compose.yml` | Production Docker yapılandırması |
| `docker-compose.dev.yml` | Development Docker yapılandırması (DB + Redis) |

## Test

- Test framework: Vitest (root devDependencies'de mevcut ama henüz konfigüre edilmemiş).
- Mevcut test dosyası yok.
