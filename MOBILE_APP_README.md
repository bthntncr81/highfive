# HighFive Restaurant - Customer Mobile App API Documentation

## 🚀 Base URL
```
Production: https://api.yourdomain.com
Development: http://localhost:3000
```

---

## 📱 Customer-Facing Features

### 1. QR Kod ile Masa Siparişi
- Masadaki QR kodu okut → Menüye git → Sipariş ver → Ödeme yap

### 2. Gel Al (Takeaway) Siparişi
- Menüden seç → Müşteri bilgileri gir → Sipariş ver → Online veya kasada öde

### 3. Sadakat Programı
- Ücretsiz üye ol → Her siparişte puan kazan → Puanları indirim olarak kullan

### 4. Happy Hour & Kampanyalar
- Aktif kampanyaları gör → İndirimli fiyatlardan yararlan

---

## 🔌 API Endpoints

### Menu & Categories

#### Get Full Menu
```http
GET /api/menu
```
**Response:**
```json
{
  "categories": [
    {
      "id": "cat-123",
      "name": "Pizza",
      "description": "Taş fırında pizzalar",
      "image": "https://...",
      "sortOrder": 1,
      "items": [
        {
          "id": "item-456",
          "name": "Margherita",
          "description": "Domates sos, mozzarella, fesleğen",
          "price": 120.00,
          "image": "https://...",
          "available": true,
          "allergens": ["GLUTEN", "DAIRY"],
          "calories": 850,
          "preparationTime": 15,
          "discountPercent": 0,
          "stockQuantity": null,
          "outOfStockReason": null
        }
      ]
    }
  ],
  "items": [...] // Flat list of all items
}
```

#### Get Single Menu Item
```http
GET /api/menu/:id
```

---

### Table & QR System

#### Scan QR / Get Table Info
```http
GET /api/tables/scan/:tableNumber
```
**Response:**
```json
{
  "table": {
    "id": "table-123",
    "number": 5,
    "name": "Masa 5",
    "capacity": 4,
    "status": "OCCUPIED",
    "sessionToken": "abc123xyz"
  }
}
```
> ⚠️ `sessionToken` her sipariş için gerekli - QR ile gelen müşteri için oturum doğrulama

---

### Orders

#### Create Customer Order (QR / Takeaway)
```http
POST /api/orders/customer
Content-Type: application/json
```
**Request Body:**
```json
{
  "tableId": "table-123",           // QR sipariş için (opsiyonel)
  "sessionToken": "abc123xyz",      // QR sipariş için zorunlu
  "customerName": "Ahmet Yılmaz",   // Takeaway için zorunlu
  "customerPhone": "05551234567",   // Takeaway için zorunlu
  "customerEmail": "ahmet@mail.com", // Opsiyonel
  "type": "DINE_IN",                // "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  "items": [
    {
      "menuItemId": "item-456",
      "quantity": 2,
      "notes": "Az tuzlu",
      "modifiers": ["Ekstra peynir"]
    }
  ],
  "notes": "Kapı zili çalışmıyor",
  "tip": 20.00                      // Bahşiş (opsiyonel)
}
```
**Response:**
```json
{
  "order": {
    "id": "order-789",
    "orderNumber": 15,
    "status": "PENDING",
    "type": "DINE_IN",
    "subtotal": 240.00,
    "tax": 24.00,
    "tip": 20.00,
    "total": 284.00,
    "items": [...],
    "createdAt": "2024-01-15T12:30:00Z"
  }
}
```

#### Get Order Status
```http
GET /api/orders/:id/status
```
**Response:**
```json
{
  "order": {
    "id": "order-789",
    "orderNumber": 15,
    "status": "PREPARING",
    "estimatedTime": 15,
    "items": [
      {
        "name": "Margherita",
        "quantity": 2,
        "status": "PREPARING"
      }
    ]
  }
}
```

**Order Statuses:**
- `PENDING` - Sipariş alındı
- `CONFIRMED` - Onaylandı
- `PREPARING` - Hazırlanıyor
- `READY` - Hazır
- `SERVED` - Servis edildi (masa)
- `OUT_FOR_DELIVERY` - Yolda (delivery)
- `DELIVERED` - Teslim edildi
- `COMPLETED` - Tamamlandı
- `CANCELLED` - İptal

---

### Payment (iyzico 3DS)

#### Initialize 3DS Payment
```http
POST /api/payment/initialize-3ds
Content-Type: application/json
```
**Request Body:**
```json
{
  "orderId": "order-789",
  "cardNumber": "5528790000000008",
  "cardHolderName": "AHMET YILMAZ",
  "expireMonth": "12",
  "expireYear": "2030",
  "cvc": "123",
  "email": "ahmet@mail.com",
  "name": "Ahmet Yılmaz",
  "phone": "05551234567",
  "address": "Kadıköy, İstanbul",
  "city": "İstanbul",
  "tipAmount": 20.00
}
```
**Response:**
```json
{
  "htmlContent": "BASE64_ENCODED_3DS_HTML",
  "conversationId": "conv-123"
}
```
> 📌 `htmlContent` base64 decode edilerek WebView'da gösterilmeli

#### Complete 3DS Payment (Callback sonrası)
```http
POST /api/payment/complete-3ds
Content-Type: application/json
```
**Request Body:**
```json
{
  "paymentId": "iyzico-payment-id"
}
```

---

### Loyalty Program

#### Lookup Customer by Phone
```http
GET /api/loyalty/customers/phone/:phone
```
**Response:**
```json
{
  "customer": {
    "id": "cust-123",
    "phone": "05551234567",
    "name": "Ahmet Yılmaz",
    "totalPoints": 250,
    "lifetimePoints": 500,
    "loyaltyTier": {
      "id": "tier-1",
      "name": "Silver",
      "icon": "🥈",
      "color": "#C0C0C0",
      "discountPercent": 5,
      "pointMultiplier": 1.5
    }
  }
}
```

#### Register New Customer
```http
POST /api/loyalty/customers/register
Content-Type: application/json
```
**Request Body:**
```json
{
  "phone": "05551234567",
  "name": "Ahmet Yılmaz",
  "email": "ahmet@mail.com",
  "birthDate": "1990-05-15",
  "smsConsent": true,
  "emailConsent": true
}
```
**Response:**
```json
{
  "customer": {
    "id": "cust-123",
    "phone": "05551234567",
    "name": "Ahmet Yılmaz",
    "totalPoints": 50,
    "loyaltyTier": null
  },
  "message": "Hoş geldiniz! 50 puan hesabınıza eklendi."
}
```

#### Calculate Points for Order
```http
POST /api/loyalty/calculate-points
Content-Type: application/json
```
**Request Body:**
```json
{
  "amount": 150.00,
  "customerId": "cust-123"
}
```
**Response:**
```json
{
  "basePoints": 15,
  "multiplier": 1.5,
  "finalPoints": 22
}
```

#### Redeem Points
```http
POST /api/loyalty/redeem-points
Content-Type: application/json
```
**Request Body:**
```json
{
  "customerId": "cust-123",
  "points": 100
}
```
**Response:**
```json
{
  "pointsToRedeem": 100,
  "discountAmount": 10.00,
  "remainingPoints": 150
}
```

---

### Happy Hour & Campaigns

#### Get Active Happy Hours
```http
GET /api/happyhours/active
```
**Response:**
```json
{
  "active": [
    {
      "id": "hh-1",
      "name": "Öğle Molası",
      "description": "Tüm pizzalarda %20 indirim",
      "discountPercent": 20,
      "startTime": "12:00",
      "endTime": "14:00",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "menuItems": [
        {
          "menuItemId": "item-456",
          "specialPrice": 96.00
        }
      ]
    }
  ]
}
```

#### Get Active Campaigns
```http
GET /api/campaigns/active
```
**Response:**
```json
{
  "campaigns": [
    {
      "id": "camp-1",
      "name": "Yaz Kampanyası",
      "description": "150₺ üzeri siparişlerde %10 indirim",
      "discountType": "PERCENT",
      "discountValue": 10,
      "minOrderAmount": 150.00,
      "startDate": "2024-06-01",
      "endDate": "2024-08-31",
      "isActive": true
    }
  ]
}
```

#### Validate Coupon Code
```http
POST /api/coupons/validate
Content-Type: application/json
```
**Request Body:**
```json
{
  "code": "SUMMER2024",
  "orderTotal": 200.00
}
```
**Response:**
```json
{
  "valid": true,
  "coupon": {
    "id": "coup-1",
    "code": "SUMMER2024",
    "discountType": "PERCENT",
    "discountValue": 15,
    "discountAmount": 30.00
  }
}
```

---

### Suggestions (Upsell & Cross-sell)

#### Get Upsell Suggestions
```http
POST /api/suggestions/upsell
Content-Type: application/json
```
**Request Body:**
```json
{
  "menuItemId": "item-456"
}
```
**Response:**
```json
{
  "suggestions": [
    {
      "id": "item-789",
      "name": "Büyük Boy Pizza",
      "price": 150.00,
      "description": "+30₺ ile büyük boy",
      "type": "SIZE_UPGRADE"
    }
  ]
}
```

#### Get Cross-sell Suggestions
```http
POST /api/suggestions/crosssell
Content-Type: application/json
```
**Request Body:**
```json
{
  "cartItemIds": ["item-456", "item-123"]
}
```
**Response:**
```json
{
  "suggestions": [
    {
      "id": "item-999",
      "name": "Cola",
      "price": 25.00,
      "description": "Pizzanın yanına cola",
      "image": "https://..."
    }
  ]
}
```

---

### Service Charge

#### Calculate Service Charge
```http
POST /api/orders/calculate-service-charge
Content-Type: application/json
```
**Request Body:**
```json
{
  "subtotal": 200.00,
  "orderType": "DINE_IN"
}
```
**Response:**
```json
{
  "serviceCharge": 20.00,
  "serviceChargeRate": 10,
  "serviceChargeType": "PERCENT",
  "total": 220.00
}
```

---

## 🔔 WebSocket (Real-time Updates)

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### Events to Listen

#### Order Status Update
```json
{
  "type": "ORDER_UPDATED",
  "data": {
    "id": "order-789",
    "status": "PREPARING",
    "estimatedTime": 10
  }
}
```

#### Order Ready Notification
```json
{
  "type": "ORDER_READY",
  "data": {
    "id": "order-789",
    "orderNumber": 15,
    "message": "Siparişiniz hazır!"
  }
}
```

---

## 📊 Data Types

### Allergen Types
```typescript
type AllergenType = 
  | "GLUTEN" | "DAIRY" | "EGGS" | "FISH" 
  | "SHELLFISH" | "TREE_NUTS" | "PEANUTS" 
  | "SOY" | "SESAME" | "MUSTARD" 
  | "CELERY" | "LUPIN" | "MOLLUSCS" | "SULPHITES";
```

### Order Types
```typescript
type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
```

### Payment Methods
```typescript
type PaymentMethod = "CASH" | "CREDIT_CARD" | "ONLINE";
```

### Loyalty Tiers
| Tier | Min Points | Multiplier | Discount |
|------|-----------|------------|----------|
| Bronze | 0 | 1.0x | 0% |
| Silver | 500 | 1.5x | 5% |
| Gold | 1500 | 2.0x | 10% |
| Platinum | 5000 | 3.0x | 15% |

### Points System
- **Kazanım:** Her 10₺ = 1 puan (tier multiplier ile çarpılır)
- **Kullanım:** 100 puan = 10₺ indirim
- **Min. Kullanım:** 100 puan
- **Hoş Geldin Bonusu:** 50 puan

---

## 🛡️ Error Handling

### Error Response Format
```json
{
  "error": "Hata mesajı",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
| Code | Description |
|------|-------------|
| `SESSION_EXPIRED` | QR oturumu süresi dolmuş |
| `SESSION_CLOSED` | Masa oturumu kapatılmış |
| `ITEM_UNAVAILABLE` | Ürün stokta yok |
| `INVALID_COUPON` | Kupon geçersiz |
| `INSUFFICIENT_POINTS` | Yetersiz puan |
| `PAYMENT_FAILED` | Ödeme başarısız |

---

## 🎨 UI/UX Recommendations

### Renk Paleti (Mevcut Web'den)
```css
--diner-red: #D32F2F
--diner-mustard: #FFB300
--diner-cream: #FFF8E1
--diner-chocolate: #3E2723
--diner-kraft: #D7CCC8
```

### Animasyonlar
- Sepete ekleme: Bounce effect
- Sipariş durumu: Progress bar + pulse
- Puan kazanma: Confetti + count-up
- Happy Hour: Gradient animation

### Push Notifications
- Sipariş onaylandı
- Sipariş hazırlanıyor
- Sipariş hazır
- Kampanya bildirimleri
- Puan kazanımı

