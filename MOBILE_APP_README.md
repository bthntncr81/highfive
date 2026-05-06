# 📱 HighFive Mobile App

Müşteri sipariş + sadakat + ödeme + push bildirim mobil uygulaması.

**Stack:** Expo SDK 54 · Expo Router · React Native 0.81 · NativeWind · Zustand · TypeScript

---

## 🚀 Hızlı Başlangıç

```bash
# Repo root'tan
cd apps/mobile-app

# Expo dev server (Expo Go uyumlu — push ve dev-client gerektiren özellikler hariç)
npm run start

# Tünel modu (USB veya Wi-Fi olmadan farklı network)
npm run start:tunnel

# iOS simülatör
npm run ios

# Android emülatör
npm run android
```

`API_URL` ve `WS_URL` `app.json`'da `extra` alanından okunuyor — varsayılan `https://api.highfivepps.com`.

---

## 🎯 Özellikler

### Sipariş Akışı
- ✅ QR/menüden ürün seç → sepete ekle
- ✅ Sepette miktar düzenle, çıkar
- ✅ Checkout: TAKEAWAY / DELIVERY seçimi
- ✅ Adres seçimi (kayıtlı veya manuel)
- ✅ Bahşiş (preset + manuel)
- ✅ Puan kullan (100 puan = 10₺)
- ✅ Kupon kodu uygulama
- ✅ Online ödeme (iyzico 3DS WebView) veya kapıda ödeme
- ✅ Sipariş takibi: status timeline + WebSocket subscribe
- ✅ Kurye atandıysa "kurye yolda" + arama butonu
- ✅ Sipariş iptal (sadece PENDING durumunda)

### Push Bildirimleri (otomatik)
- 📥 Sipariş alındı
- ✅ Sipariş onaylandı
- 👨‍🍳 Hazırlanıyor
- 🛎️ Hazır
- 🛵 Kurye yolda
- 🎉 Teslim edildi
- ❌ Sipariş iptal
- ⭐ Puan kazandın
- 🏆 Tier yükseltme
- 🎯 Yeni kampanya
- 🍹 Happy hour başladı

### Sadakat
- ✅ Toplam puan + lifetime + tier kart
- ✅ Sıradaki tier'a kaç puan kaldığı (progress bar)
- ✅ Puan geçmişi (kazanım, harcama, bonus)
- ✅ Tier benefits (% indirim + multiplier)

### Adresler
- ✅ Liste, ekle, düzenle, sil
- ✅ Varsayılan adres
- ✅ Etiket (Ev, İş, Yazlık, Diğer)
- ✅ İlçe/şehir, kapı kodu/not

### Favoriler
- ✅ ProductCard üstünde kalp toggle (auth gerekiyor)
- ✅ Favoriler ekranında grid liste
- ✅ Optimistik UI (anında tepki)

### Ayarlar
- ✅ Push tercihleri (ana switch + 4 alt kategori)
- ✅ Hesap bilgileri (ad, e-posta) düzenleme
- ✅ Çıkış yap

### Auth
- ✅ Telefon + 6 haneli OTP doğrulama
- ✅ JWT 30 gün geçerlilik
- ✅ Persist (AsyncStorage)

---

## 🏗️ Proje Yapısı

```
app/
├── _layout.tsx                      # Root stack + push init + favorites bootstrap
├── (tabs)/
│   ├── _layout.tsx                  # 5 sekmeli tab nav
│   ├── index.tsx                    # Anasayfa (kampanya carousel + öne çıkanlar)
│   ├── menu.tsx                     # Menü (arama + kategori filter)
│   ├── cart.tsx                     # Sepet → checkout
│   ├── orders.tsx                   # Siparişlerim (Aktif / Hepsi)
│   └── profile.tsx                  # Profil (alt menüler tüm route'lara bağlı)
├── auth/login.tsx                   # OTP login modal
├── product/[id].tsx                 # Ürün detay
├── campaign/[id].tsx                # Kampanya detay
├── checkout/
│   ├── index.tsx                    # Checkout (type/adres/tip/puan/kupon)
│   └── payment.tsx                  # iyzico 3DS WebView + polling
├── orders/[id].tsx                  # Sipariş detay (timeline + kurye + items)
├── loyalty/index.tsx                # Sadakat puanları
├── addresses/
│   ├── index.tsx                    # Liste
│   ├── new.tsx                      # Yeni
│   └── [id].tsx                     # Düzenle
├── favorites/index.tsx              # Favoriler grid
├── settings/notifications.tsx       # Push tercihleri
└── profile/edit.tsx                 # Hesap bilgileri

lib/
├── api.ts                           # ApiClient + tüm endpoint helper'ları + types
├── auth.ts                          # Zustand auth store (OTP flow)
├── cart.ts                          # Zustand cart store (persist)
├── favorites.ts                     # Zustand favorites store (optimistic toggle)
├── push.ts                          # Expo push registration + listener
├── ws.ts                            # WebSocket order subscribe + auto-reconnect
└── hooks.ts                         # useMenu, useCampaigns

components/ui/
├── CampaignCarousel.tsx
├── CategoryStrip.tsx
├── Logo.tsx
└── ProductCard.tsx                  # Favori toggle dahil
```

---

## 🔌 Backend Endpoint'leri (api.highfivepps.com)

**Public:**
- `GET /api/menu`
- `GET /api/categories`
- `GET /api/campaigns/active`
- `GET /api/happyhours/active`

**Mobile (Customer JWT zorunlu):**
- `POST /api/mobile/auth/request-otp`
- `POST /api/mobile/auth/verify-otp`
- `GET/PATCH /api/mobile/me`
- `POST /api/mobile/devices/register` · `/unregister`
- `POST /api/mobile/orders` · `GET /api/mobile/orders` · `GET /:id` · `POST /:id/cancel`
- `GET /api/mobile/loyalty/me` · `/history` · `POST /calc-redeem`
- `GET /api/mobile/addresses` · `POST /` · `PATCH/:id` · `DELETE/:id` · `POST /:id/default`
- `GET /api/mobile/favorites` · `POST /:menuItemId` (toggle)
- `GET/PATCH /api/mobile/prefs/notifications`

**Payment (iyzico 3DS):**
- `POST /api/payment/initialize-3ds`
- `POST /api/payment/3ds-callback` (iyzico → API)
- `GET /api/payment/mobile-finalize/:conversationId` ⭐ mobile için tek-seferlik
- `POST /api/payment/complete-3ds` (web flow)

**WebSocket:** `wss://api.highfivepps.com/ws` — `SUBSCRIBE_ORDER` mesajı ile order takibi

---

## 🚢 Deploy

### Backend (api.highfivepps.com)

Yeni schema değişiklikleri var (`DeviceToken`, `PushNotification`, `Address`, `FavoriteItem`, `NotificationPreference`). Bunlar production DB'sine pushlanmalı.

```bash
# Sunucuda (37.247.101.231)
cd /opt/highfive
git pull origin main
npm install                       # expo-server-sdk + sharp eklendi
npm run db:push                   # schema'yı yansıt (var olan veriyi etkilemez)
docker compose build --no-cache api
docker compose up -d api
```

`expo-server-sdk` Expo Push servisi için, `sharp` ise icon build script'i için.

### Mobile App Build

```bash
cd apps/mobile-app

# EAS hesap (ilk kez):
npx eas-cli login
npx eas-cli build:configure

# Geliştirici Build (push test için)
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform android --profile development

# Production Build (App Store / Play Store)
npx eas-cli build --platform all --profile production
```

`app.json`'da `bundleIdentifier=com.highfive.mobile`, `package=com.highfive.mobile`.

**Push notifications için:**
1. EAS dashboard'da projectId al → `app.json:extra.eas.projectId`'ye yaz
2. Apple: APNs sertifikası + Push capability
3. Android: FCM Server Key → EAS Console

---

## ⚙️ Environment Konfigürasyonu

`app.json` `extra` alanı:

```json
{
  "extra": {
    "apiUrl": "https://api.highfivepps.com",
    "wsUrl": "wss://api.highfivepps.com/ws",
    "eas": { "projectId": "..." }
  }
}
```

---

## 🧪 Test Senaryoları

1. **Sipariş + Push akışı:** Login → menüye gir → ürün ekle → checkout → ONLINE öde → 3DS → siparişe yönlendir → push'ları al
2. **Puan kullanımı:** Profili → Sadakat → 100+ puan görünüyor → Yeni sipariş → checkout'ta "Puanımı kullan" → indirim uygulandı
3. **Adres CRUD:** Profile → Adreslerim → ekle → varsayılan yap → checkout'ta seçili geliyor
4. **Favori senkron:** Menüden ürünü favoriye ekle → Favoriler ekranı → görünüyor → tekrar tıkla → kaybolur
5. **Kurye takip:** POS'ta sipariş hazırla → kurye atama → mobil sipariş detay'da kurye kartı + telefon arama
6. **Push tercihleri:** Settings/notifications → "Pazarlama" kapatma → kampanya push'u gelmeyecek (sadece sipariş)

---

## 🐛 Bilinen Sınırlamalar

- Kurye lokasyon haritası (canlı GPS) henüz yok — sadece ad + telefon
- Adresde geo-coding (otomatik koordinat çıkarma) yok — manuel
- Üye olmadan sipariş (guest checkout) yok — telefon doğrulama zorunlu
- iyzico kayıtlı kart desteği yok — her seferinde tam kart girilir
