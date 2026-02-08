# 🔌 HighFive Restaurant API Endpoints

**Base URL:** `http://localhost:3000` (Development)

---

## 📱 Müşteri (Public) Endpoints

### Menu & Categories

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/menu` | Tüm menü ve kategorileri getir |
| GET | `/api/menu/:id` | Tek ürün detayı |
| GET | `/api/categories` | Kategori listesi |

**GET /api/menu Response:**
```json
{
  "categories": [{
    "id": "string",
    "name": "string",
    "description": "string?",
    "image": "string?",
    "sortOrder": "number",
    "items": [MenuItem]
  }],
  "items": [MenuItem]
}
```

**MenuItem:**
```json
{
  "id": "string",
  "name": "string",
  "description": "string?",
  "price": "number",
  "image": "string?",
  "available": "boolean",
  "allergens": ["GLUTEN", "DAIRY", ...],
  "calories": "number?",
  "preparationTime": "number?",
  "discountPercent": "number",
  "stockQuantity": "number?",
  "outOfStockReason": "string?"
}
```

---

### Table & QR

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/tables/scan/:number` | QR okutma - masa bilgisi al |

**Response:**
```json
{
  "table": {
    "id": "string",
    "number": "number",
    "name": "string",
    "capacity": "number",
    "status": "FREE | OCCUPIED | RESERVED | CLEANING",
    "sessionToken": "string"
  }
}
```

---

### Orders

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/orders/customer` | Müşteri siparişi oluştur |
| GET | `/api/orders/:id/status` | Sipariş durumu takibi (public) |

**POST /api/orders/customer Request:**
```json
{
  "tableId": "string?",           // QR sipariş için
  "sessionToken": "string?",      // QR sipariş için zorunlu
  "customerName": "string?",      // Takeaway/Delivery için zorunlu
  "customerPhone": "string?",     // Takeaway/Delivery için zorunlu
  "customerEmail": "string?",
  "customerAddress": "string?",   // Delivery için zorunlu
  "type": "DINE_IN | TAKEAWAY | DELIVERY",
  "items": [{
    "menuItemId": "string",
    "quantity": "number",
    "notes": "string?",
    "modifiers": ["string"]
  }],
  "notes": "string?",
  "tip": "number?",
  "deliveryFee": "number?"        // Delivery için 29₺
}
```

**Response:**
```json
{
  "order": {
    "id": "string",
    "orderNumber": "number",
    "status": "PENDING",
    "type": "string",
    "subtotal": "number",
    "tax": "number",
    "tip": "number",
    "deliveryFee": "number",
    "total": "number",
    "items": [...],
    "createdAt": "ISO8601"
  }
}
```

**GET /api/orders/:id/status Response:**
```json
{
  "order": {
    "id": "string",
    "orderNumber": "number",
    "status": "PENDING | CONFIRMED | PREPARING | READY | OUT_FOR_DELIVERY | DELIVERED | COMPLETED | CANCELLED",
    "type": "DINE_IN | TAKEAWAY | DELIVERY",
    "customerName": "string?",
    "total": "number",
    "createdAt": "ISO8601",
    "items": [{
      "name": "string",
      "quantity": "number"
    }]
  }
}
```

---

### Payment (iyzico 3DS)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/payment/initialize-3ds` | 3DS ödeme başlat |
| POST | `/api/payment/complete-3ds` | 3DS ödeme tamamla |
| GET | `/api/payment/status/:conversationId` | Ödeme durumu |

**POST /api/payment/initialize-3ds Request:**
```json
{
  "orderId": "string",
  "cardNumber": "string",
  "cardHolderName": "string",
  "expireMonth": "string",
  "expireYear": "string",
  "cvc": "string",
  "email": "string",
  "name": "string",
  "phone": "string",
  "address": "string?",
  "city": "string?",
  "tipAmount": "number?"
}
```

**Response:**
```json
{
  "htmlContent": "BASE64_ENCODED_3DS_HTML",
  "conversationId": "string"
}
```
> ⚠️ `htmlContent` base64 decode edilip WebView'da render edilmeli

**POST /api/payment/complete-3ds Request:**
```json
{
  "paymentId": "string"
}
```

---

### Loyalty Program

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/loyalty/customers/phone/:phone` | Telefon ile üye sorgula |
| POST | `/api/loyalty/customers/register` | Yeni üye kaydı |
| POST | `/api/loyalty/calculate-points` | Puan hesapla |
| POST | `/api/loyalty/redeem-points` | Puan kullan |
| GET | `/api/loyalty/tiers` | Üyelik seviyeleri |

**GET /api/loyalty/customers/phone/:phone Response:**
```json
{
  "customer": {
    "id": "string",
    "phone": "string",
    "name": "string?",
    "email": "string?",
    "totalPoints": "number",
    "lifetimePoints": "number",
    "loyaltyTier": {
      "id": "string",
      "name": "string",
      "icon": "string",
      "color": "string",
      "discountPercent": "number",
      "pointMultiplier": "number"
    }
  } | null
}
```

**POST /api/loyalty/customers/register Request:**
```json
{
  "phone": "string",
  "name": "string?",
  "email": "string?",
  "birthDate": "string?",
  "smsConsent": "boolean?",
  "emailConsent": "boolean?"
}
```

**Response:**
```json
{
  "customer": LoyaltyCustomer,
  "message": "Hoş geldiniz! 50 puan hesabınıza eklendi."
}
```

**POST /api/loyalty/redeem-points Request:**
```json
{
  "customerId": "string",
  "points": "number"
}
```

**Response:**
```json
{
  "pointsToRedeem": "number",
  "discountAmount": "number",
  "remainingPoints": "number"
}
```

---

### Happy Hour & Campaigns

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/happyhours/active` | Aktif happy hour'lar |
| GET | `/api/campaigns/active` | Aktif kampanyalar |
| GET | `/api/bundles/active` | Aktif bundle'lar |
| POST | `/api/coupons/validate` | Kupon doğrula |

**GET /api/happyhours/active Response:**
```json
{
  "active": [{
    "id": "string",
    "name": "string",
    "description": "string?",
    "discountPercent": "number",
    "discountType": "PERCENT | FIXED | CAMPAIGN",
    "discountAmount": "number?",
    "startTime": "HH:mm",
    "endTime": "HH:mm",
    "daysOfWeek": [0-6],
    "menuItems": [{
      "menuItemId": "string",
      "specialPrice": "number?"
    }]
  }]
}
```

**POST /api/coupons/validate Request:**
```json
{
  "code": "string",
  "orderTotal": "number"
}
```

---

### Suggestions (Upsell/Cross-sell)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/menu/:id/upsells` | Ürün için upsell önerileri |
| POST | `/api/crosssells/suggestions` | Sepet için cross-sell önerileri |

**POST /api/crosssells/suggestions Request:**
```json
{
  "cartItemIds": ["string"]
}
```

**Response:**
```json
{
  "suggestions": [{
    "id": "string",
    "name": "string",
    "price": "number",
    "description": "string?",
    "image": "string?"
  }]
}
```

---

### Service Charge

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/orders/calculate-service-charge` | Servis ücreti hesapla |

**Request:**
```json
{
  "subtotal": "number",
  "locationId": "string?",
  "orderType": "DINE_IN | TAKEAWAY | DELIVERY"
}
```

---

## 🔔 WebSocket (Real-time Updates)

### Connection
```
ws://localhost:3000/ws
```

### Subscribe to Order Updates
```json
{
  "type": "SUBSCRIBE_ORDER",
  "orderId": "string"
}
```

### Events

**ORDER_UPDATED:**
```json
{
  "type": "ORDER_UPDATED",
  "data": {
    "id": "string",
    "status": "string",
    "estimatedTime": "number?"
  }
}
```

**ORDER_READY:**
```json
{
  "type": "ORDER_READY",
  "data": {
    "id": "string",
    "orderNumber": "number",
    "message": "Siparişiniz hazır!"
  }
}
```

**NEW_ORDER:**
```json
{
  "type": "NEW_ORDER",
  "data": Order
}
```

---

## 📊 Data Types

### Order Status
| Status | Açıklama | Emoji |
|--------|----------|-------|
| PENDING | Alındı | 📝 |
| CONFIRMED | Onaylandı | ✅ |
| PREPARING | Hazırlanıyor | 👨‍🍳 |
| READY | Hazır | 🎉 |
| OUT_FOR_DELIVERY | Yolda (Kurye) | 🚚 |
| DELIVERED | Teslim Edildi | 📦 |
| SERVED | Servis Edildi (Masa) | 🍽️ |
| COMPLETED | Tamamlandı | ✨ |
| CANCELLED | İptal | ❌ |

### Order Types
| Type | Açıklama |
|------|----------|
| DINE_IN | Masada yemek |
| TAKEAWAY | Gel al |
| DELIVERY | Eve servis (kurye) |

### Allergen Types
```
GLUTEN, DAIRY, EGGS, FISH, SHELLFISH, 
TREE_NUTS, PEANUTS, SOY, SESAME, 
MUSTARD, CELERY, LUPIN, MOLLUSCS, SULPHITES
```

### Loyalty Tiers
| Tier | Min Puan | Çarpan | İndirim |
|------|----------|--------|---------|
| Bronze | 0 | 1.0x | 0% |
| Silver | 500 | 1.5x | 5% |
| Gold | 1500 | 2.0x | 10% |
| Platinum | 5000 | 3.0x | 15% |

### Points System
- **Kazanım:** Her 10₺ = 1 puan (tier çarpanı ile)
- **Kullanım:** 100 puan = 10₺ indirim
- **Minimum:** 100 puan
- **Hoş Geldin:** 50 puan

### Delivery Fee
- Eve servis kurye ücreti: **29₺**

---

## 🛡️ Error Response Format
```json
{
  "error": "Hata mesajı",
  "code": "ERROR_CODE"
}
```

### Error Codes
| Code | Açıklama |
|------|----------|
| SESSION_EXPIRED | QR oturumu süresi dolmuş |
| SESSION_CLOSED | Masa oturumu kapatılmış |
| ITEM_UNAVAILABLE | Ürün stokta yok |
| INVALID_COUPON | Kupon geçersiz |
| INSUFFICIENT_POINTS | Yetersiz puan |
| PAYMENT_FAILED | Ödeme başarısız |

---

## 🎨 UI Constants

### Colors
```
Primary: #D32F2F (Kırmızı)
Secondary: #FFB300 (Hardal)
Cream: #FFF8E1
Chocolate: #3E2723
Delivery: #3B82F6 (Mavi)
```

### Order Status Colors
```javascript
const statusColors = {
  PENDING: '#EAB308',      // Yellow
  CONFIRMED: '#22C55E',    // Green
  PREPARING: '#F97316',    // Orange
  READY: '#16A34A',        // Dark Green
  OUT_FOR_DELIVERY: '#3B82F6', // Blue
  DELIVERED: '#15803D',    // Darker Green
  COMPLETED: '#6B7280',    // Gray
  CANCELLED: '#EF4444',    // Red
};
```

