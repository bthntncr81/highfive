# 📱 HighFive Restaurant - Mobile App Development Prompt

Aşağıdaki prompt'u Cursor'a yapıştırarak mobil uygulamayı oluşturabilirsiniz:

---

```
Sen bir senior mobile app developer'sın. React Native (Expo) kullanarak bir restoran müşteri uygulaması geliştirmeni istiyorum.

## 📋 PROJE TANIMI

HighFive Restaurant için müşteri mobil uygulaması. Müşteriler:
- QR kod okutarak masadan sipariş verebilir
- Gel-al (takeaway) siparişi verebilir
- Sadakat programına üye olup puan kazanabilir
- Puanlarını indirim olarak kullanabilir
- Sipariş durumunu takip edebilir
- Online ödeme yapabilir (iyzico 3DS)

## 🛠 TEKNOLOJİ STACK

- **Framework:** React Native with Expo (SDK 50+)
- **Navigation:** React Navigation v6
- **State Management:** Zustand
- **HTTP Client:** Axios
- **UI Components:** NativeWind (Tailwind CSS for RN)
- **Icons:** Expo Vector Icons
- **Animations:** React Native Reanimated + Lottie
- **QR Scanner:** expo-camera / expo-barcode-scanner
- **WebView:** react-native-webview (3DS ödeme için)
- **Push Notifications:** expo-notifications
- **Storage:** @react-native-async-storage/async-storage
- **Forms:** React Hook Form + Zod

## 📁 PROJE YAPISI

```
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx       # Ana sayfa
│   │   ├── menu.tsx        # Menü listesi
│   │   ├── cart.tsx        # Sepet
│   │   └── profile.tsx     # Profil & Sadakat
│   ├── menu/
│   │   └── [id].tsx        # Ürün detay
│   ├── order/
│   │   ├── checkout.tsx    # Sipariş tamamlama
│   │   ├── payment.tsx     # Ödeme sayfası
│   │   └── status.tsx      # Sipariş takip
│   ├── scan.tsx            # QR tarayıcı
│   ├── auth/
│   │   ├── login.tsx       # Telefon ile giriş
│   │   └── register.tsx    # Üyelik kayıt
│   └── _layout.tsx
├── components/
│   ├── ui/                 # Temel UI bileşenleri
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Modal.tsx
│   ├── menu/
│   │   ├── CategoryList.tsx
│   │   ├── MenuItemCard.tsx
│   │   └── AllergenBadges.tsx
│   ├── cart/
│   │   ├── CartItem.tsx
│   │   ├── CartSummary.tsx
│   │   └── CrossSellPopup.tsx
│   ├── loyalty/
│   │   ├── PointsDisplay.tsx
│   │   ├── TierBadge.tsx
│   │   └── PointsSlider.tsx
│   └── order/
│       ├── OrderStatusCard.tsx
│       └── OrderTimeline.tsx
├── stores/
│   ├── cartStore.ts        # Sepet state
│   ├── authStore.ts        # Kullanıcı & loyalty state
│   └── tableStore.ts       # Masa oturumu state
├── services/
│   ├── api.ts              # Axios instance & interceptors
│   ├── menuService.ts
│   ├── orderService.ts
│   ├── loyaltyService.ts
│   ├── paymentService.ts
│   └── websocket.ts
├── hooks/
│   ├── useMenu.ts
│   ├── useOrder.ts
│   ├── useLoyalty.ts
│   └── useWebSocket.ts
├── utils/
│   ├── formatters.ts       # Para, tarih formatlama
│   ├── validators.ts       # Form validasyonları
│   └── storage.ts          # AsyncStorage helpers
├── constants/
│   ├── colors.ts
│   ├── api.ts
│   └── allergens.ts
└── types/
    └── index.ts            # TypeScript types
```

## 🎨 TASARIM SİSTEMİ

### Renkler (NativeWind config)
```javascript
colors: {
  primary: {
    DEFAULT: '#D32F2F', // Kırmızı
    light: '#FF6659',
    dark: '#9A0007',
  },
  secondary: {
    DEFAULT: '#FFB300', // Hardal sarısı
    light: '#FFE54C',
    dark: '#C68400',
  },
  cream: '#FFF8E1',
  chocolate: '#3E2723',
  kraft: '#D7CCC8',
}
```

### Typography
- Başlıklar: Bold, büyük
- Fiyatlar: Semi-bold, kırmızı
- Açıklamalar: Regular, gri

### Animasyonlar
- Sepete ekleme: Scale bounce + haptic feedback
- Swipe actions: Spring physics
- Loading states: Skeleton + Lottie
- Başarı: Confetti animation
- Puan kazanma: Count-up animation

## 📱 EKRANLAR VE AKIŞLAR

### 1. Ana Sayfa (Home)
- Hero banner (kampanyalar)
- Aktif Happy Hour bildirimi
- Kategoriler (horizontal scroll)
- Popüler ürünler
- "QR Okut" floating button

### 2. QR Tarayıcı
- Kamera izni kontrolü
- QR okuma
- Masa bilgisi gösterimi
- "Menüye Git" butonu
- Session token'ı store'a kaydet

### 3. Menü
- Kategori tabs (sticky header)
- Arama
- Filtreler (Alerjenler, Fiyat)
- Ürün kartları (resim, isim, fiyat, allergen badges)
- Happy Hour fiyatları vurgulu

### 4. Ürün Detay (Modal veya Sayfa)
- Büyük ürün resmi
- İsim, açıklama, fiyat
- Alerjen bilgileri
- Kalori
- Hazırlama süresi
- Miktar seçici
- Notlar input
- Modifiers/Ekstralar
- Upsell önerileri
- "Sepete Ekle" butonu

### 5. Sepet
- Ürün listesi (swipe to delete)
- Miktar değiştirme
- Cross-sell önerileri (bottom sheet)
- Puan kullanım toggle & slider
- Kupon kodu input
- Fiyat özeti (ara toplam, indirim, servis, bahşiş, toplam)
- Bahşiş seçenekleri (%10, %15, %20, custom)
- "Siparişi Tamamla" butonu

### 6. Checkout
- Sipariş tipi seçimi (Masa / Gel-Al)
- Müşteri bilgileri formu (isim, telefon, email)
- Sipariş notu
- Ödeme yöntemi seçimi:
  - Kasada Nakit
  - Kasada Kart
  - Online Kart (3DS)
- Sipariş özeti
- "Onayla" butonu

### 7. Ödeme (3DS)
- Kart bilgileri formu
- Animasyonlu kart preview
- WebView for 3DS verification
- Loading states
- Başarı/Hata ekranları

### 8. Sipariş Takip
- Sipariş numarası
- Timeline (Alındı → Hazırlanıyor → Hazır)
- Tahmini süre
- Ürün listesi
- WebSocket ile real-time update

### 9. Profil / Sadakat
#### Üye Değilse:
- Üyelik avantajları
- Kayıt formu
- "50 Puan Kazan" CTA

#### Üye İse:
- İsim, telefon
- Tier badge (Bronze/Silver/Gold/Platinum)
- Mevcut puan (büyük, animasyonlu)
- Sonraki tier'e kalan puan
- Puan geçmişi listesi
- Sipariş geçmişi
- Çıkış yap

## 🔌 API ENTEGRASYİONU

### Base Configuration (api.ts)
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.X:3000'  // Local IP
  : 'https://api.production.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding session token
api.interceptors.request.use(async (config) => {
  const tableSession = await AsyncStorage.getItem('tableSession');
  if (tableSession) {
    const { sessionToken } = JSON.parse(tableSession);
    config.headers['X-Session-Token'] = sessionToken;
  }
  return config;
});
```

### API Endpoints
```
GET  /api/menu                          - Menü listesi
GET  /api/menu/:id                      - Ürün detay
GET  /api/tables/scan/:number           - Masa bilgisi
POST /api/orders/customer               - Sipariş oluştur
GET  /api/orders/:id/status             - Sipariş durumu
POST /api/payment/initialize-3ds        - Ödeme başlat
POST /api/payment/complete-3ds          - Ödeme tamamla
GET  /api/loyalty/customers/phone/:p    - Üye sorgula
POST /api/loyalty/customers/register    - Üye kayıt
POST /api/loyalty/redeem-points         - Puan kullan
GET  /api/happyhours/active             - Aktif kampanyalar
POST /api/suggestions/crosssell         - Çapraz satış önerileri
POST /api/coupons/validate              - Kupon doğrula
```

## 🔔 PUSH NOTIFICATIONS

expo-notifications kullanarak:
- Sipariş onaylandı
- Sipariş hazırlanıyor
- Sipariş hazır (önemli!)
- Kampanya bildirimleri
- Puan kazanımı

## 💾 LOCAL STORAGE

AsyncStorage'da saklanacaklar:
- `tableSession`: { tableId, sessionToken, tableNumber }
- `loyaltyMember`: { id, phone, name, totalPoints, tier }
- `cart`: { items: [], tip: 0 }
- `orderHistory`: Son 10 sipariş

## ⚡ PERFORMANS

- FlatList ile virtualized listeler
- Image caching (expo-image veya fast-image)
- Skeleton loading states
- Optimistic updates
- Debounced search

## 🧪 TEST EDİLECEKLER

1. QR okutup masa siparişi ver
2. Gel-al siparişi ver (nakit)
3. Online ödeme yap (3DS)
4. Üye ol ve puan kazan
5. Puan kullanarak indirim al
6. Sipariş durumunu takip et
7. Kupon kodu kullan
8. Cross-sell önerisini sepete ekle

## 🚀 BAŞLANGIÇ

1. Expo projesi oluştur:
   ```bash
   npx create-expo-app highfive-mobile --template tabs
   cd highfive-mobile
   ```

2. Bağımlılıkları yükle:
   ```bash
   npx expo install nativewind tailwindcss
   npx expo install @react-navigation/native @react-navigation/bottom-tabs
   npx expo install zustand axios
   npx expo install expo-camera expo-barcode-scanner
   npx expo install react-native-webview
   npx expo install expo-notifications
   npx expo install @react-native-async-storage/async-storage
   npx expo install react-native-reanimated lottie-react-native
   npx expo install react-hook-form @hookform/resolvers zod
   ```

3. Önce stores'ları oluştur (cartStore, authStore, tableStore)
4. API servislerini oluştur
5. Temel UI componentlerini oluştur
6. Ekranları sırayla implement et

## ⚠️ ÖNEMLİ NOTLAR

1. **QR Session:** QR okutulduğunda `sessionToken` alınıp saklanmalı. Her sipariş bu token ile gönderilmeli.

2. **Puan Sistemi:** 
   - 10₺ = 1 puan kazanım
   - 100 puan = 10₺ indirim
   - Minimum 100 puan kullanılabilir

3. **3DS Ödeme:** WebView içinde iyzico 3DS sayfası açılmalı. Callback URL'i handle edilmeli.

4. **WebSocket:** Sipariş durumu için `/ws` endpoint'ine bağlanılmalı.

5. **Offline:** Menü ve sepet offline çalışabilmeli. Sipariş için internet zorunlu.

Lütfen bu spesifikasyonlara göre uygulamayı oluştur. Her ekran için modern, temiz ve kullanıcı dostu bir UI tasarla. Animasyonları ve micro-interactions'ları unutma.
```

---

## 📋 Kopyalanabilir Kısa Versiyon

Eğer daha kısa bir prompt isterseniz:

```
React Native (Expo) ile restoran müşteri uygulaması yap.

Özellikler:
- QR kod ile masa siparişi
- Gel-al siparişi  
- Sadakat programı (puan kazanma/kullanma)
- Online ödeme (iyzico 3DS - WebView)
- Sipariş takibi (WebSocket)

Tech: Expo, Zustand, NativeWind, React Navigation

API: http://localhost:3000
- GET /api/menu - Menü
- POST /api/orders/customer - Sipariş
- POST /api/payment/initialize-3ds - Ödeme
- GET /api/loyalty/customers/phone/:p - Üye sorgula
- POST /api/loyalty/customers/register - Üye kayıt

Ekranlar: Home, QR Scanner, Menu, Product Detail, Cart, Checkout, Payment (3DS WebView), Order Status, Profile/Loyalty

Renkler: Primary #D32F2F, Secondary #FFB300, Cream #FFF8E1

Puan: 10₺=1puan, 100puan=10₺ indirim

Modern UI, animasyonlar, haptic feedback kullan.
```

