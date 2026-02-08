# 📱 HighFive - Müşteri API Endpointleri

**Base URL:** `http://localhost:3000`  
**WebSocket:** `ws://localhost:3000/ws`

---

## 🍔 Menü

### Tüm Menüyü Getir
```
GET /api/menu
```
**Response:**
```json
{
  "categories": [{
    "id": "string",
    "name": "string",
    "description": "string",
    "image": "string",
    "sortOrder": 0
  }],
  "items": [{
    "id": "string",
    "name": "string",
    "description": "string",
    "price": 45.00,
    "image": "string",
    "categoryId": "string",
    "available": true,
    "allergens": ["GLUTEN", "DAIRY"],
    "calories": 450,
    "preparationTime": 15,
    "discountPercent": 0,
    "stockQuantity": 100
  }]
}
```

---

## 🪑 Masa (QR Okutma)

### QR ile Masa Bilgisi Al
```
GET /api/tables/scan/:tableNumber
```
**Response:**
```json
{
  "table": {
    "id": "string",
    "number": 5,
    "name": "Masa 5",
    "capacity": 4,
    "status": "FREE",
    "sessionToken": "abc123"
  }
}
```

---

## 🛒 Sipariş

### Sipariş Oluştur
```
POST /api/orders/customer
```
**Request:**
```json
{
  "tableId": "string",
  "sessionToken": "string",
  "customerName": "Ahmet Yılmaz",
  "customerPhone": "05551234567",
  "customerEmail": "ahmet@email.com",
  "customerAddress": "Kadıköy, İstanbul...",
  "type": "DELIVERY",
  "items": [
    {
      "menuItemId": "string",
      "quantity": 2,
      "notes": "Acısız olsun"
    }
  ],
  "notes": "Kapıda bırakın",
  "tip": 10,
  "deliveryFee": 29
}
```

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| tableId | QR sipariş için | Masa ID |
| sessionToken | QR sipariş için | QR'dan gelen token |
| customerName | Gel Al / Eve Servis | Müşteri adı |
| customerPhone | Gel Al / Eve Servis | Telefon |
| customerAddress | Eve Servis | Teslimat adresi |
| type | ✅ | `DINE_IN`, `TAKEAWAY`, `DELIVERY` |
| items | ✅ | Sipariş kalemleri |
| deliveryFee | Eve Servis | 29 (sabit) |

**Response:**
```json
{
  "order": {
    "id": "clxyz123",
    "orderNumber": 42,
    "status": "PENDING",
    "type": "DELIVERY",
    "subtotal": 90.00,
    "tax": 9.00,
    "tip": 10.00,
    "deliveryFee": 29.00,
    "total": 138.00,
    "createdAt": "2026-01-19T14:30:00Z"
  }
}
```

### Sipariş Durumu Sorgula
```
GET /api/orders/:orderId/status
```
**Response:**
```json
{
  "order": {
    "id": "clxyz123",
    "orderNumber": 42,
    "status": "PREPARING",
    "type": "DELIVERY",
    "customerName": "Ahmet Yılmaz",
    "total": 138.00,
    "createdAt": "2026-01-19T14:30:00Z",
    "items": [
      { "name": "Margarita Pizza", "quantity": 2 }
    ]
  }
}
```

**Sipariş Durumları:**
| Status | Açıklama |
|--------|----------|
| `PENDING` | Alındı |
| `CONFIRMED` | Onaylandı |
| `PREPARING` | Hazırlanıyor |
| `READY` | Hazır |
| `OUT_FOR_DELIVERY` | Kurye Yolda |
| `DELIVERED` | Teslim Edildi |
| `COMPLETED` | Tamamlandı |
| `CANCELLED` | İptal |

---

## 💳 Ödeme (iyzico 3DS)

### 3DS Ödeme Başlat
```
POST /api/payment/initialize-3ds
```
**Request:**
```json
{
  "orderId": "clxyz123",
  "cardNumber": "5528790000000008",
  "cardHolderName": "AHMET YILMAZ",
  "expireMonth": "12",
  "expireYear": "2030",
  "cvc": "123",
  "email": "ahmet@email.com",
  "name": "Ahmet Yılmaz",
  "phone": "05551234567",
  "address": "Kadıköy, İstanbul",
  "city": "İstanbul",
  "tipAmount": 10
}
```
**Response:**
```json
{
  "htmlContent": "BASE64_ENCODED_HTML",
  "conversationId": "conv123"
}
```
> ⚠️ `htmlContent` base64 decode edilip WebView'da gösterilmeli

### 3DS Tamamla
```
POST /api/payment/complete-3ds
```
**Request:**
```json
{
  "paymentId": "pay123"
}
```
**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay123",
    "amount": 138.00,
    "status": "SUCCESS"
  }
}
```

---

## 👑 Sadakat Programı

### Telefon ile Üye Sorgula
```
GET /api/loyalty/customers/phone/:phone
```
**Response:**
```json
{
  "customer": {
    "id": "cust123",
    "phone": "05551234567",
    "name": "Ahmet Yılmaz",
    "totalPoints": 350,
    "lifetimePoints": 1200,
    "loyaltyTier": {
      "name": "Silver",
      "icon": "🥈",
      "discountPercent": 5,
      "pointMultiplier": 1.5
    }
  }
}
```

### Yeni Üye Kaydı
```
POST /api/loyalty/customers/register
```
**Request:**
```json
{
  "phone": "05551234567",
  "name": "Ahmet Yılmaz",
  "email": "ahmet@email.com",
  "birthDate": "1990-05-15",
  "smsConsent": true,
  "emailConsent": true
}
```
**Response:**
```json
{
  "customer": { ... },
  "message": "Hoş geldiniz! 50 puan hesabınıza eklendi."
}
```

### Puan Kullan
```
POST /api/loyalty/redeem-points
```
**Request:**
```json
{
  "customerId": "cust123",
  "points": 100
}
```
**Response:**
```json
{
  "pointsToRedeem": 100,
  "discountAmount": 10.00,
  "remainingPoints": 250
}
```
> 💡 100 puan = 10₺ indirim

---

## 🎉 Kampanyalar

### Aktif Happy Hour
```
GET /api/happyhours/active
```
**Response:**
```json
{
  "active": [{
    "id": "hh123",
    "name": "Akşam İndirimi",
    "description": "17:00-19:00 arası %20 indirim",
    "discountPercent": 20,
    "startTime": "17:00",
    "endTime": "19:00",
    "daysOfWeek": [1, 2, 3, 4, 5]
  }]
}
```

### Kupon Doğrula
```
POST /api/coupons/validate
```
**Request:**
```json
{
  "code": "YENI2026",
  "orderTotal": 100.00
}
```
**Response:**
```json
{
  "valid": true,
  "discount": 15.00,
  "discountType": "PERCENT",
  "discountValue": 15
}
```

---

## 💡 Öneri Sistemi

### Cross-sell Önerileri
```
POST /api/crosssells/suggestions
```
**Request:**
```json
{
  "cartItemIds": ["item1", "item2"]
}
```
**Response:**
```json
{
  "suggestions": [{
    "id": "item3",
    "name": "Kola",
    "price": 15.00,
    "image": "url"
  }]
}
```

---

## 🔌 WebSocket (Canlı Güncelleme)

### Bağlantı
```
ws://localhost:3000/ws
```

### Sipariş Takibi Başlat
```json
{
  "type": "SUBSCRIBE_ORDER",
  "orderId": "clxyz123"
}
```

### Gelen Eventler

**ORDER_UPDATED** - Sipariş durumu değişti
```json
{
  "type": "ORDER_UPDATED",
  "data": {
    "id": "clxyz123",
    "status": "PREPARING",
    "estimatedTime": 15
  }
}
```

**ORDER_READY** - Sipariş hazır
```json
{
  "type": "ORDER_READY",
  "data": {
    "id": "clxyz123",
    "orderNumber": 42,
    "message": "Siparişiniz hazır!"
  }
}
```

---

## 📋 Sabitler

### Sipariş Tipleri
| Tip | Açıklama |
|-----|----------|
| `DINE_IN` | Masada yemek |
| `TAKEAWAY` | Gel al |
| `DELIVERY` | Eve servis |

### Alerjenler
```
GLUTEN, DAIRY, EGGS, FISH, SHELLFISH,
TREE_NUTS, PEANUTS, SOY, SESAME,
MUSTARD, CELERY, LUPIN, MOLLUSCS, SULPHITES
```

### Kurye Ücreti
```
DELIVERY_FEE = 29₺
```

### Puan Sistemi
- Her 10₺ = 1 puan
- 100 puan = 10₺ indirim
- Hoş geldin bonusu = 50 puan

---

## ❌ Hata Formatı
```json
{
  "error": "Hata mesajı",
  "code": "ERROR_CODE"
}
```

| Code | Açıklama |
|------|----------|
| `SESSION_EXPIRED` | QR oturumu doldu |
| `SESSION_CLOSED` | Masa oturumu kapatıldı |
| `ITEM_UNAVAILABLE` | Ürün stokta yok |
| `INVALID_COUPON` | Kupon geçersiz |
| `INSUFFICIENT_POINTS` | Yetersiz puan |
| `PAYMENT_FAILED` | Ödeme başarısız |

