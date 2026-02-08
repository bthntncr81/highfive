# HighFive Suite 🖐️

Kapsamlı restoran sipariş yönetim sistemi. Pizza, makarna ve sandviç satışı için optimize edilmiş POS, mutfak ekranı ve landing sayfası.

## 🏗️ Yapı

```
highfive-suite/
├── apps/
│   ├── api/              # Backend API (Fastify + WebSocket)
│   ├── pos/              # POS Sistemi (Garson/Kasa)
│   ├── kitchen/          # Mutfak Ekranı (KDS)
│   └── landing/          # Müşteri Web Sitesi
├── packages/
│   ├── database/         # Prisma + PostgreSQL
│   ├── types/            # Paylaşılan TypeScript tipleri
│   └── utils/            # Yardımcı fonksiyonlar
└── docker-compose.yml    # Docker yapılandırması
```

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 20+
- Docker & Docker Compose
- npm veya yarn

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Veritabanını Başlat (Docker)

```bash
# Development için (sadece PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml up -d

# Veya tüm sistemi Docker ile başlat
docker-compose up -d
```

### 3. Veritabanını Hazırla

```bash
# .env dosyasını oluştur
cp .env.example .env

# Prisma client oluştur
npx prisma generate --schema=packages/database/prisma/schema.prisma

# Veritabanı migration
npx prisma db push --schema=packages/database/prisma/schema.prisma

# Örnek verileri yükle
npx ts-node packages/database/prisma/seed.ts
```

### 4. Uygulamaları Başlat

```bash
# API'yi başlat (port 3000)
npx nx serve api

# POS'u başlat (port 4200)
npx nx serve pos

# Mutfak Ekranını başlat (port 4201)
npx nx serve kitchen

# Landing sayfasını başlat (port 4202)
npx nx serve landing

# Veya tümünü paralel başlat
npx nx run-many -t serve -p api pos kitchen landing
```

## 📱 Uygulamalar

### POS Sistemi (Garson/Kasa)
- **URL:** http://localhost:4200
- **Özellikler:**
  - Masa yönetimi
  - Hızlı sipariş oluşturma
  - Ödeme alma (nakit/kart)
  - Günlük raporlar
  - Kullanıcı yönetimi

### Mutfak Ekranı (KDS)
- **URL:** http://localhost:4201
- **Özellikler:**
  - Gerçek zamanlı sipariş takibi
  - Durum güncelleme (Bekliyor → Hazırlanıyor → Hazır)
  - Sesli bildirimler
  - Kanban görünümü

### Landing Sayfası
- **URL:** http://localhost:4202
- **Özellikler:**
  - Menü görüntüleme
  - WhatsApp sipariş
  - Restoran bilgileri

### API
- **URL:** http://localhost:3000
- **Swagger:** http://localhost:3000/docs
- **WebSocket:** ws://localhost:3000/ws

## 🔐 Giriş Bilgileri

### Admin
- **Email:** admin@highfive.com
- **Şifre:** admin123
- **PIN:** 1234

### Garson
- **Email:** garson1@highfive.com
- **Şifre:** garson123
- **PIN:** 1111

### Mutfak
- **Email:** mutfak@highfive.com
- **Şifre:** mutfak123
- **PIN:** 3333

## 🐳 Docker ile Production

```bash
# Tüm servisleri build et ve başlat
docker-compose up -d --build

# Logları izle
docker-compose logs -f

# Servisleri durdur
docker-compose down
```

### Port Eşlemeleri
| Servis | Port |
|--------|------|
| API | 3000 |
| POS | 3001 |
| Kitchen | 3002 |
| Landing | 80 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Adminer | 8080 |

## 🛠️ Geliştirme

### Yeni migration oluştur
```bash
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

### Prisma Studio (veritabanı GUI)
```bash
npx prisma studio --schema=packages/database/prisma/schema.prisma
```

### Build
```bash
# Tek uygulama
npx nx build api

# Tüm uygulamalar
npx nx run-many -t build
```

## 📊 API Endpoints

### Auth
- `POST /api/auth/login` - Email ile giriş
- `POST /api/auth/pin-login` - PIN ile giriş
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Mevcut kullanıcı

### Orders
- `GET /api/orders` - Siparişleri listele
- `GET /api/orders/active` - Aktif siparişler
- `POST /api/orders` - Yeni sipariş
- `PATCH /api/orders/:id/status` - Durum güncelle
- `POST /api/orders/:id/payment` - Ödeme al

### Tables
- `GET /api/tables` - Masaları listele
- `POST /api/tables` - Masa ekle
- `PATCH /api/tables/:id/status` - Masa durumu

### Menu
- `GET /api/menu` - Menü öğeleri
- `GET /api/categories` - Kategoriler

### Reports
- `GET /api/reports/daily` - Günlük rapor
- `GET /api/reports/weekly` - Haftalık rapor
- `GET /api/reports/monthly` - Aylık rapor

## 🔌 WebSocket Channels

- `orders` - Sipariş güncellemeleri
- `kitchen` - Mutfak bildirimleri
- `tables` - Masa durumları
- `notifications` - Genel bildirimler

## 📞 İletişim

- **WhatsApp:** +90 505 691 68 31
- **Email:** info@highfive.com

## 📄 Lisans

MIT License - High Five © 2024
