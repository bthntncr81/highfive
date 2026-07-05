# Pazar Yeri Entegrasyonları — GetirYemek & Trendyol GO Blueprint

> **Kapsam:** OtOrder (çok-kiracılı restoran SaaS) için GetirYemek (Getir Food POS API v1.5.8) ve Trendyol GO (Uber Eats Trendyol Go — Yemek) entegrasyon mimarisi.
> **Durum:** Tasarım dokümanı — implementasyon başlamadı.
> **Kaynak doğruluğu:** Bu doküman resmi API dokümantasyonlarından yapılan araştırmaya dayanır. Dokümanlarda bulunamayan veya doğrulanamayan her nokta **DOĞRULANAMADI** etiketiyle işaretlenmiştir. Bu etiketli maddeler implementasyondan önce sandbox/stage ortamında veya platform desteğiyle teyit edilmelidir.

---

## 1. Özet Karşılaştırma

| Konu | GetirYemek | Trendyol GO (Yemek) |
|---|---|---|
| **Auth** | `POST /auth/login` ile `appSecretKey` + `restaurantSecretKey` → **1 saatlik token**, `token: <değer>` header'ı (Bearer değil). Login rate limit 10/60 sn. Token cache + otomatik yenileme şart. | Token yok — her istekte **Basic Auth** (`supplierId` + API Key + API Secret; base64 kompozisyonu dokümanda açık değil — **DOĞRULANAMADI**). Zorunlu `User-Agent: "{supplierId} - SelfIntegration"` ve sipariş servislerinde `x-agentname` + `x-executor-user` header'ları. |
| **Credential kapsamı** | `appSecretKey` firma bazlı, `restaurantSecretKey` **restoran bazlı** → şube başına ayrı token. | Anahtarlar `supplierId` bazlı, tüm şubeler (`storeId`) aynı anahtarı kullanır. |
| **Sipariş alma** | **Webhook (push)**: Getir bizim URL'lerimize POST eder (`NewOrder`, `CancelOrder`, `Courier`, `Restaurant`). Yedek: polling (`/food-orders/periodic/unapproved`, `/food-orders/active`). | **Polling (pull)**: `GET .../packages?packageStatuses=Created,...` periyodik çağrılır. Yemek tarafı için webhook dokümanı YOK — **DOĞRULANAMADI** (webhook sadece Hızlı Market bölümünde dokümante). |
| **Sipariş onay süresi** | **30 sn** içinde yanıt yoksa IVR arar; **5 dk** aşılırsa restoran otomatik kapatılır + sipariş iptal. | Kabul süresi dokümanda yazmıyor — **DOĞRULANAMADI**. Kabul edilmeyen sipariş platform tarafından `reasonCode 625` ile `Cancelled` yapılır. |
| **Menü yönetimi** | API'dan menü **oluşturulamaz** — sadece okuma (`GET /restaurants/menu`), ürün aktif/pasif ve zincir menülerde fiyat güncelleme. Tekil restoranda fiyat sadece panelden. | API'dan menü **oluşturulamaz** — okuma (`GET .../products`), fiyat güncelleme (asenkron batch) ve ürün/kategori ACTIVE/PASSIVE. PLU/harici kod alanı yok. |
| **Durum bildirimi (bizden onlara)** | `verify → prepare → handover (Getir kuryesi) / deliver (kendi kuryemiz)`. Ardışık çağrılar arası **min 1 dk**, her statü **1 kez**, statü çağrıları 2 istek/60 sn. | `picked (preparationTime ile) → invoiced → manual-shipped → manual-delivered` (son ikisi yalnız Model 1). İptal = `unsupplied` (reasonId ile, kısmi iptal destekli). |
| **Kurye modeli** | `deliveryType 1` = Getir Getirsin (handover sonrası Getir yönetir), `deliveryType 2` = Restoran Getirsin (deliver'ı biz çağırırız). | `deliveryType "GO"` = Model 2 (TGO kuryesi, Shipped/Delivered platformda), `"STORE"` = Model 1 (kendi kuryemiz, manual-shipped/delivered biz çağırırız). |
| **Webhook güvenliği** | İmza/HMAC yok — bizim belirlediğimiz statik `x-api-key` header'ı. Retry politikası dokümante edilmemiş — **DOĞRULANAMADI**. | (Market dokümanına göre) HTTPS + Basic Auth; imza yok. Retry: 10×1 sn → 1 dk → 10 deneme → DLQ. Duplicate gelebilir → `id + packageStatus` idempotency. Yemek için geçerliliği **DOĞRULANAMADI**. |
| **Rate limit** | Sıkı ve endpoint bazlı: login 10/60 sn, statü çağrıları 2/60 sn, `/food-orders/active` 20/60 sn, menü GET'leri 2-3/60 sn. İhlalde firma **habersiz pasife alınabilir**. | Endpoint başına 50 istek/10 sn (429). "Servis Limitleri" sayfası boş — başka limitler **DOĞRULANAMADI**. |
| **Test ortamı** | `food-external-api-gateway.development.getirapi.com` — hesap onayıyla otomatik açılır, IP whitelist şartı dokümanda geçmiyor. | Stage ortamı **IP whitelist ister** (503 = yetkisiz IP); stage anahtarları PROD'dan tamamen ayrı. Test siparişi yalnız stage'de API ile oluşturulur. |
| **Onboarding şartı** | developers.getir.com self-servis başvuru (şirket bilgileri + sözleşme kabulü); webhook URL + x-api-key **manuel** e-posta ile iletilir; go-live için fiş çıktılı onay e-postası zorunlu. | Satıcı paneli > Entegrasyon Bilgileri'nden anahtar alınır; resmi entegratör başvuru süreci dokümante değil; webhook kaydı (varsa) destek üzerinden manuel; stage IP bildirimi çağrı merkezi/panel üzerinden. |

---

## 2. Platform Detayları

### 2.1 GetirYemek (Getir Food POS API v1.5.8)

#### 2.1.1 Akış Diyagramı

```
[Getir]                                  [OtOrder API]                        [POS / KDS]

NewOrder webhook (POST, x-api-key)
  ── payload: id, status(400|325),
     deliveryType(1|2), products[] ──►  /api/marketplace/getir/webhooks/new-order
                                          │ x-api-key → MarketplaceConnection çöz
                                          │ (tenant + location)
                                          │ normalize → mevcut order pipeline
                                          │ (externalOrderId idempotency, stok düş)
                                          │ broadcastNewOrder ────────────────►  Yeni sipariş anında görünür
                                          │
                                          │ autoAccept=true ise:
                                          │  status 400 → POST /food-orders/{id}/verify
                                          │  status 325 → POST /food-orders/{id}/verify-scheduled
                                          ▼
                              [Getir'de statü 400→500 (hazırlanıyor)]

KDS "Hazırlanıyor"  ─────────────────►  statü kuyruğu (min 1 dk aralık)
                                          → POST /food-orders/{id}/prepare

deliveryType 2 (Restoran Getirsin):
  KDS/POS "Teslim edildi" ───────────►  → POST /food-orders/{id}/deliver

deliveryType 1 (Getir Getirsin):
  Courier webhook (pickup ETA) ──────►  POS'ta kurye varış aralığı göster
  POS "Kuryeye verildi" ─────────────►  → POST /food-orders/{id}/handover
                                          (700/800/900 statülerini Getir yönetir,
                                           deliver ÇAĞRILMAZ)

CancelOrder webhook ────────────────►  siparişi CANCELLED yap, stok geri al,
                                        broadcastOrderUpdate ────────────────►  İptal anında görünür

Restoran iptali (POS'tan):
  GET /food-orders/{id}/cancel-options → sebep seçtir
  POST /food-orders/{id}/cancel {cancelReasonId, cancelNote, productId}

Yedek polling (webhook sağlığı bozulursa):
  POST /food-orders/periodic/unapproved  (sürekli SORGULANMAMALI)
  POST /food-orders/active               (20 istek/60 sn limitli)
```

**Zaman kuralları (kritik):**
- Sipariş **30 saniye** içinde yanıtlanmalı → `autoAccept` varsayılan davranış olmalı.
- **5 dakika** onay limiti aşılırsa restoran **otomatik kapatılır** ve sipariş iptal edilir.
- Ardışık statü çağrıları arası **en az 1 dakika**; aynı statüye ikinci istek hata döner (`FoodOrderAlreadyVerified` vb.) → statü kuyruğu zorunlu.
- İleri tarihli sipariş (325): `verify-scheduled` sonrası 350 olur, teslimattan 1 saat önce Getir tarafında **otomatik 500'e geçer ve yeni webhook GELMEZ** → OtOrder `scheduledDate - 1 saat` anında kendi zamanlayıcısıyla siparişi KDS'e düşürmeli.

#### 2.1.2 Kritik Endpoint Listesi

| Amaç | Endpoint |
|---|---|
| Token al (1 saat) | `POST /auth/login` `{appSecretKey, restaurantSecretKey}` |
| Aktif siparişler (polling yedeği) | `POST /food-orders/active` |
| Onaylanmamış siparişler (webhook kaçarsa) | `POST /food-orders/periodic/unapproved` |
| İptal edilmiş siparişler | `POST /food-orders/periodic/cancelled` |
| Sipariş detayı (unmasked telefon dahil) | `GET /food-orders/{foodOrderId}` |
| Onayla (400→500) | `POST /food-orders/{foodOrderId}/verify` |
| İleri tarihli onay (325→350) | `POST /food-orders/{foodOrderId}/verify-scheduled` |
| Hazırlanıyor | `POST /food-orders/{foodOrderId}/prepare` |
| Getir kuryesine teslim (deliveryType 1) | `POST /food-orders/{foodOrderId}/handover` |
| Teslim edildi (deliveryType 2) | `POST /food-orders/{foodOrderId}/deliver` |
| İptal sebepleri | `GET /food-orders/{foodOrderId}/cancel-options` |
| Restoran iptali | `POST /food-orders/{foodOrderId}/cancel` |
| Menü oku | `GET /restaurants/menu`, `GET /restaurants/option-products` |
| Ürün stok durumu | `PUT /products/{productId}/status` `{status: 100\|200\|400}` |
| Restoran aç/kapa | `PUT /restaurants/status/open` \| `/restaurants/status/close` |
| Yoğuna al | `PUT /restaurants/delivery-duration/busyness` `{isBusy, busynessDifferenceDuration: 15\|30\|45}` |
| Ort. hazırlık süresi | `PUT /restaurants/average-preparation-time` (5-90 dk) |
| Zincir menü/fiyat | `GET /chain-menus`, `POST /chain-menus/{chainMenuOID}/update-prices` |
| Restoran bilgisi | `GET /restaurants` |

Base URL'ler: Prod `https://food-external-api-gateway.getirapi.com/` — Test `https://food-external-api-gateway.development.getirapi.com/`

#### 2.1.3 Payload Eşleme Notları (Getir → OtOrder)

| Getir alanı | OtOrder karşılığı | Not |
|---|---|---|
| `id` (ObjectId) | `Order.externalOrderId` (idempotency anahtarı, prefix ile: `getir:{id}`) | Tüm statü çağrılarında `foodOrderId` olarak kullanılır. |
| `products[].product` | `MarketplaceProductMapping.platformProductId` → `menuItemId` | Restoran bazlı ürün id. **Zincirlerde eşleme `chainProduct` alanından yapılmalı** (şubeler arası sabit). |
| `products[].count` | `OrderItem.quantity` | |
| `products[].totalDiscountedPriceWithOption` | `OrderItem` satır tutarı | İndirimli tutar; fiyat farkı çıkarsa platform fiyatı esas alınır (bizim fiyatla **üzerine yazılmaz**, sipariş platform tutarıyla kaydedilir). |
| `products[].optionCategories[]` / `displayInfo` | `OrderItem.modifiers` / notes | Fiş baskısı için insan-okunur `displayInfo{title, options}` kullan; opsiyon-bazlı fiyat için `optionPrice` alanları. |
| `products[].note`, `clientNote` | `OrderItem.notes`, `Order.notes` | |
| `client.name`, `client.clientPhoneNumber` | müşteri bilgisi | Telefon **maskeli 850'li proxy**; gerçek numara (`clientUnmaskedPhoneNumber`) yalnız `GET /food-orders/{id}` yanıtında — webhook payload'ında yok. |
| `client.deliveryAddress` + `location{lat,lon}` | teslimat adresi | `address, aptNo, floor, doorNo, city, district, description`. |
| `paymentMethod` (numerik) | `PaymentMethod` enum | Eşleme: 4→`CASH`; 1,2,3,15,16→`ONLINE`; 5→`MULTINET`; 6,17,19→`SODEXO`; 8→`TICKET`; diğerleri→`OTHER`. Bilinmeyen koda toleranslı parse. |
| `deliveryType` | kurye modeli bayrağı | 1=Getir Getirsin, 2=Restoran Getirsin. `Order.type = DELIVERY`, `source = 'GETIR'`. |
| `checkoutDate`, tüm tarihler | timestamp | **GMT!** TR için +3 saat dönüşümü yapılmalı. |
| `isScheduled` + `scheduledDate` | ileri tarihli sipariş | 325 akışı; KDS'e düşürme zamanı OtOrder zamanlayıcısında. |
| `confirmationId` | fiş/onay kodu | POS ekranında ve fişte gösterilmeli. |
| `doNotKnock`, `dropOffAtDoor` | teslimat notu | Kurye talimatı olarak nota eklenir. |

#### 2.1.4 Gotchas (Getir)

- **Webhook retry politikası dokümante edilmemiş — DOĞRULANAMADI.** Kaçan sipariş için tek resmi yol `/unapproved` + `/active` polling yedeği → webhook sağlık kontrolü (son N dakikada webhook yoksa polling'e düş) şart.
- Webhook'ta **imza/HMAC yok** — sadece bizim verdiğimiz statik `x-api-key`. Connection başına benzersiz key üret, sabit zamanlı karşılaştır (timing-safe compare).
- Webhook URL/x-api-key kaydı için API yok — **manuel** olarak getiryemekapi@getir.com'a iletilir.
- Token 1 saat + login 10/60 sn → token cache zorunlu; `restaurantSecretKey` restoran başına → **şube (location) başına ayrı token yönetimi**.
- Statü çağrıları 2 istek/60 sn ve ardışık statüler arası min 1 dk → **DB-destekli statü kuyruğu** olmadan otomatik akış kurulamaz. Kural ihlalinde firma **haber verilmeksizin pasife alınabilir**.
- Menü API'dan yazılamaz; tekil restoranda fiyat güncelleme endpoint'i **yok** (sadece panel). Menü eşitliği operasyonel bir süreç, teknik senkron değil.
- `posStatus` (100/200) semantiği dokümanda açıklanmamış — **DOĞRULANAMADI**.
- Getir Getirsin'de `handover` sonrası 700/800/900 statülerini Getir yönetir — `deliver` çağrılmamalı; Restoran Getirsin'de `handover` çağrılmamalı. Adapter `deliveryType`'a göre geçerli geçiş setini kısıtlamalı.
- Rate limit dokümanındaki bazı path'ler görünmez zero-width karakter içeriyor — endpoint sabitlerini elle yaz, dokümandan kopyalama.
- `GET /changelog` placeholder döndürüyor — değişiklik takibi için güvenilir değil; servis durumu: https://getir-food-integration.instatus.com/
- IP whitelist şartı dokümanda geçmiyor (prod ve test) — **DOĞRULANAMADI**, onboarding'de teyit edilmeli.

---

### 2.2 Trendyol GO (Uber Eats Trendyol Go — Yemek)

> Not: Uber Eats için ayrı API yok; "Uber Eats Trendyol Go" Trendyol Yemek'in yeni markası ve tek API bu. **GetirYemek by Uber Eats siparişleri de aynı API'den `userInformation.appName = "Galaxy"` olarak akar** — yani TGO entegrasyonu tek başına iki vitrin kazandırabilir.

#### 2.2.1 Akış Diyagramı

```
[OtOrder Poller]                          [TGO API]                    [POS / KDS]

Her aktif connection için zamanlayıcı
(supplierId başına; 50 istek/10 sn limiti
 merkezi olarak paylaştırılır)
  │
  ├─► GET .../suppliers/{supplierId}/packages
  │     ?packageStatuses=Created,Picking,Invoiced,Shipped,Delivered,Cancelled,UnSupplied
  │     &packageModificationStartDate={son poll, epoch ms}
  │
  │   packageStatus == "Created" (yeni sipariş):
  │     normalize → order pipeline (idempotency: tgo:{packageId})
  │     broadcastNewOrder ─────────────────────────────────────────►  Anında görünür
  │     autoAccept=true ise:
  │       PUT .../packages/picked {packageId, preparationTime} ──►  [Picking]
  │
  │   packageStatus == "Cancelled" | "UnSupplied" (platform iptali):
  │     bizde CANCELLED, stok geri al, broadcastOrderUpdate ──────►  İptal görünür
  │     (reasonCode 625 = kabul edilmedi → alarm üret)
  │
  │   Model 2 (deliveryType "GO"): Shipped/Delivered platformdan okunur,
  │     pickupEtaState / estimatedPickupTimeMin/Max / isCourierNearby
  │     POS'ta kurye ETA olarak gösterilir
  ▼

KDS "Hazır" ────────────────────────►  PUT .../packages/invoiced {packageId}   [Invoiced]

Model 1 (deliveryType "STORE", kendi kuryemiz):
  POS "Yola çıktı"  ────────────────►  PUT .../packages/{packageId}/manual-shipped
  POS "Teslim edildi" ──────────────►  PUT .../packages/{packageId}/manual-delivered

Restoran iptali (tam/kısmi):
  POS ───────────────────────────────►  PUT .../packages/unsupplied
                                          {packageId, itemIdList[packageItemId...], reasonId}
                                          (621 tedarik, 622 kapalı, 623 hazırlayamıyor,
                                           627 karışıklık; 624/626 yalnız Model 1)
```

Sipariş alma modeli **polling**'dir; Yemek tarafında webhook **DOĞRULANAMADI** (webhook dokümanı yalnız Hızlı Market bölümünde). Önerilen polling aralığı dokümanda yok — **DOĞRULANAMADI**; tek bilinen kısıt endpoint başına 50 istek/10 sn.

#### 2.2.2 Kritik Endpoint Listesi

| Amaç | Endpoint |
|---|---|
| Sipariş paketlerini çek | `GET /integrator/order/meal/suppliers/{supplierId}/packages` (filtre: `packageStatuses`, `storeId`, `packageModificationStartDate/EndDate` epoch ms, `page`, `size≤50`) |
| Tek paket detayı | `GET .../packages/{packageId}` |
| Kabul et | `PUT .../packages/picked` `{packageId, preparationTime}` |
| Hazırlık bitti | `PUT .../packages/invoiced` `{packageId, actualDate?}` |
| Yola çıktı (yalnız Model 1) | `PUT .../packages/{packageId}/manual-shipped` |
| Teslim edildi (yalnız Model 1) | `PUT .../packages/{packageId}/manual-delivered` |
| Tam/kısmi iptal | `PUT .../packages/unsupplied` `{packageId, itemIdList, reasonId}` |
| Menü oku | `GET /integrator/product/meal/suppliers/{supplierId}/stores/{storeId}/products` |
| Fiyat güncelle (asenkron) | `POST .../products/price` (maks 1000 item, `batchRequestId` döner) |
| Batch sonucu | `GET .../batch-requests/{batchRequestId}` (4 saat görüntülenebilir) |
| Ürün aç/kapa | `PUT .../stores/{storeId}/products/{productId}/status` `{status: "ACTIVE"\|"PASSIVE"}` |
| Kategori aç/kapa | `PUT .../stores/{storeId}/sections/{sectionId}/status` (sectionName deprecated) |
| Şube listesi | `GET /integrator/store/meal/suppliers/{supplierId}/stores` |
| Restoran aç/kapa | `PUT .../stores/{storeId}/status` `{status: "OPEN"\|"CLOSED"}` |
| Çalışma saatleri | `PUT .../stores/{storeId}/working-hours` |
| Teslimat süresi (Model 1) | `PUT .../stores/{storeId}/average-delivery-time` `{min, max}` |
| İade talepleri | `GET /integrator/claim/meal/suppliers/{supplierId}/claims` + `PUT .../claims/{claimId}/accept` \| `/unresolve` |
| Test siparişi (yalnız STAGE) | `POST /integrator/meal-test-order/orders/meal` |

Base URL'ler: Prod `https://api.tgoapis.com/integrator/` — Stage `https://stageapi.tgoapis.com/integrator/`

#### 2.2.3 Payload Eşleme Notları (TGO → OtOrder)

| TGO alanı | OtOrder karşılığı | Not |
|---|---|---|
| `id` (packageId, 64 kr. alfanumerik hash) | `Order.externalOrderId` (`tgo:{packageId}`) | Statü servislerinde kullanılır. **Numerik id varsaymayın** — string sakla. |
| `orderNumber` / `orderCode` | POS ekranında görünen sipariş kodu | Müşteri proxy santrali ararken sipariş numarası tuşlanır. |
| `lines[].productId` | `MarketplaceProductMapping.platformProductId` → `menuItemId` | **PLU/harici kod alanı YOK** — eşleme yalnız menü servisindeki `productId` üzerinden mapping tablosuyla. |
| `lines[].items[].packageItemId` | `OrderItem` meta (JSON) | **Kısmi iptalde (`unsupplied.itemIdList`) zorunlu** — sipariş kalemine mutlaka kaydedilmeli. |
| `lines[].unitSellingPrice`, `totalPrice` | satır/sipariş tutarı | `promotions[]` ve `coupon` alanlarındaki `amount.seller` satıcı karşılama payı — muhasebe raporu için sakla. |
| `lines[].modifierProducts[]` (nested) | `OrderItem.modifiers` | İç içe yapı: alt `modifierProducts`, `extraIngredients[]`, `removedIngredients[]` — düzleştirilerek fiş satırlarına çevrilir. |
| `payment.paymentType` | `PaymentMethod` enum | `PAY_WITH_CARD`→`ONLINE`; `PAY_WITH_MEAL_CARD`→`cardSourceType`'a göre (`PLUXEE/SODEXO*`→`SODEXO`, `MULTINET*`→`MULTINET`, diğer→`OTHER`); `PAY_WITH_ON_DELIVERY`→`onDelivery.paymentType` (`CASH`→`CASH`, `CARD`→`CREDIT_CARD`, yemek kartları→ilgili enum, bilinmeyen→`OTHER`). **Kart isimleri zamanla değişiyor — enum'a sabitlemeyin, toleranslı parse edin.** |
| `deliveryType` | kurye modeli | `"STORE"`=Model 1 (kendi kuryemiz), `"GO"`=Model 2 (TGO kuryesi). `storePickupSelected=true` → Gel-Al (`Order.type = TAKEAWAY`), aksi halde `DELIVERY`. `source = 'TRENDYOL_GO'` (`appName="Galaxy"` ise ekranda "GetirYemek by Uber Eats" rozeti). |
| `customer`, `address` | müşteri/adres | **PII maskeli**: `lastName` sadece ilk harf; `address.phone` her zaman proxy santral (0850...). Model 2'de tüm adres alanları `"Trendyol Yemek"` placeholder — **harita/rota özelliği Model 2'de çalışmaz**. |
| `customerNote` | `Order.notes` | |
| `packageCreationDate` vb. | timestamp | Epoch **milisaniye**. |
| `cancelInfo{reasonType, reason, reasonCode}` | iptal sebebi | 625 = "kabul edilmedi" → operasyon alarmı. |
| `testPackage` | test bayrağı | Stage doğrulamalarında filtrelenir. |

#### 2.2.4 Gotchas (TGO)

- Yemek tarafında **webhook DOĞRULANAMADI** — mimari polling üzerine kurulmalı; webhook (varsa) sonradan opsiyonel hızlandırıcı olarak eklenir.
- **Basic Auth kompozisyonu DOĞRULANAMADI** (Trendyol standardı `base64(apiKey:apiSecret)` ama doküman açıkça yazmıyor) — Faz 4'ün ilk işi stage'de teyit.
- `User-Agent` yoksa **403**; sipariş servislerinde `x-agentname` + `x-executor-user` zorunlu.
- Kabul süresi (timeout) dokümanda yok — **DOĞRULANAMADI**; kabul edilmeyen sipariş 625 ile iptal ediliyor → `autoAccept` + `Cancelled` paketlerinin de poll edilmesi şart.
- Sipariş reddetme diye ayrı servis yok; red = `unsupplied` iptali. **Platform iptal kodlarını (625, 601-607, 641-648, 661-663, 681-682) `unsupplied` isteğinde KULLANMAYIN.**
- `updatePrice` asenkron: 200 ≠ güncellendi; `batchRequestId` ile sonuç kontrolü zorunlu; **birebir aynı istek tekrar gönderilirse hata** (sadece değişen fiyatları gönder); `restaurantId` verilmezse fiyat **TÜM şubelere** uygulanır.
- Statü PUT'larında 409 = geçersiz statü geçişi; ürün/kategori aç-kapa'da 409 = eşzamanlı değişiklik (retry).
- Stage IP whitelist ister; "Statik IP'ler için yetkilendirme sağlanamamaktadır" ifadesi muğlak — **DOĞRULANAMADI**, teyit edilmeli.
- İade (claim) `WaitingInAction` statüsünde **4 saat** içinde aksiyon zorunlu.
- Modifier group `min:1` ise grupta en az bir adet 0 TL aktif ürün olmalı (menü eşleme kontrolünde uyarı üret).

---

## 3. OtOrder Mimari Önerisi

### 3.1 Yön Farkı ve Genel Yaklaşım

Mevcut `IntegrationPartner` + `routes/external.ts` hattında **dış taraf bizim API'mizi çağırır** (biz sunucuyuz). Getir/TGO'da yön tersine döner: **OtOrder platformlara istemci olur** — onların API'sini çağırır, Getir'den webhook alır, TGO'yu poll eder. Bu yüzden `IntegrationPartner` yeniden kullanılmaz; yeni bir **`MarketplaceConnection`** modeli ve **adapter service** katmanı kurulur. Ortak nokta: gelen sipariş, `external.ts`'in kullandığı **aynı sipariş oluşturma hattına** (idempotency + stok düşme + `broadcastNewOrder`) enjekte edilir — POS/KDS için pazar yeri siparişi, `source` alanı dışında normal bir DELIVERY/TAKEAWAY siparişidir.

### 3.2 Veri Modeli Önerisi (Prisma)

```prisma
enum MarketplacePlatform {
  GETIR
  TRENDYOL_GO
}

enum MarketplaceConnectionStatus {
  DISCONNECTED
  PENDING_VERIFICATION
  CONNECTED
  ERROR
}

model MarketplaceConnection {
  id         String              @id @default(cuid())
  tenantId   String
  tenant     Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  platform   MarketplacePlatform
  locationId String?             // şube bazlı bağlantı (Getir restaurantSecretKey şube başına)
  location   Location?           @relation(fields: [locationId], references: [id])

  isActive   Boolean             @default(false)
  status     MarketplaceConnectionStatus @default(DISCONNECTED)
  autoAccept Boolean             @default(true)  // Getir 30sn / TGO 625 iptali nedeniyle varsayilan acik
  defaultPreparationTime Int     @default(30)    // TGO picked icin dakika

  // Credentials — AES-256-GCM ile sifrelenmis saklanir (env: MARKETPLACE_CREDENTIALS_KEY)
  credentialsEncrypted String    // platform-spesifik JSON:
                                 // GETIR: { appSecretKey, restaurantSecretKey, restaurantId }
                                 // TRENDYOL_GO: { supplierId, apiKey, apiSecret, storeId }

  // Getir webhook dogrulamasi: connection basina uretilen x-api-key
  inboundApiKey String?          @unique

  // Runtime durum
  tokenCache     String?         // Getir 1 saatlik token (sifreli)
  tokenExpiresAt DateTime?
  lastPollAt     DateTime?       // TGO poll cursor'u (packageModificationStartDate)
  lastEventAt    DateTime?       // webhook/poll saglik izleme
  lastError      String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  productMappings MarketplaceProductMapping[]
  eventLogs       MarketplaceEventLog[]
  statusJobs      MarketplaceStatusJob[]

  @@unique([tenantId, platform, locationId])
  @@index([tenantId])
}

model MarketplaceProductMapping {
  id           String                @id @default(cuid())
  connectionId String
  connection   MarketplaceConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  platformProductId   String  // Getir: product (zincirde chainProduct); TGO: productId
  platformProductName String? // eslestirme UI'inda gosterim icin snapshot
  platformSectionName String?
  menuItemId          String? // null = henuz eslenmemis
  menuItem            MenuItem? @relation(fields: [menuItemId], references: [id], onDelete: SetNull)
  modifierMapping     Json?   // platform opsiyon id -> bizim modifier eslesmesi (opsiyonel, Faz 3+)
  isIgnored           Boolean @default(false) // "bu urunu esleme" karari

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([connectionId, platformProductId])
  @@index([menuItemId])
}

// Getir'in min-1-dk / 2-istek-60sn kurallari icin DB-destekli statu kuyrugu
model MarketplaceStatusJob {
  id           String                @id @default(cuid())
  connectionId String
  connection   MarketplaceConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  orderId      String                // bizim Order.id
  action       String                // "verify" | "prepare" | "deliver" | "handover" | "cancel" | "picked" | "invoiced" | ...
  payload      Json?
  notBefore    DateTime              // Getir: onceki statu cagrisi + 60sn
  attempts     Int                   @default(0)
  lastError    String?
  status       String                @default("PENDING") // PENDING | SENT | FAILED | SKIPPED
  createdAt    DateTime              @default(now())

  @@index([status, notBefore])
}

// WebhookLog'un pazar yeri karsiligi: gelen webhook + poll + giden statu cagrilari
model MarketplaceEventLog {
  id           String                @id @default(cuid())
  connectionId String
  connection   MarketplaceConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  direction    String                // "INBOUND" | "OUTBOUND"
  eventType    String                // "NEW_ORDER" | "CANCEL" | "STATUS_PUSH" | "POLL" | "MENU_SYNC" ...
  externalId   String?               // foodOrderId / packageId
  httpStatus   Int?
  payload      Json?
  error        String?
  createdAt    DateTime              @default(now())

  @@index([connectionId, createdAt])
}
```

`Order` modeline (mevcut `external.ts` idempotency alanı zaten varsa o kullanılır): `externalOrderId` benzersizliği `source` ile birlikte değerlendirilmeli — öneri: `externalOrderId = "getir:{foodOrderId}"` / `"tgo:{packageId}"` prefix'li saklamak, ayrıca `Order.source = 'GETIR' | 'TRENDYOL_GO'`. TGO satır kalemlerindeki `packageItemId` listesi `OrderItem` üzerinde JSON meta olarak saklanmalı (kısmi iptal için zorunlu).

### 3.3 Adapter Service Deseni

```
apps/api/src/services/marketplace/
  types.ts              # MarketplaceAdapter arayüzü + NormalizedMarketplaceOrder tipi
  getir-adapter.ts      # Getir HTTP istemcisi (token cache, rate-limit farkındalığı)
  tgo-adapter.ts        # TGO HTTP istemcisi (Basic Auth, zorunlu header'lar)
  order-injector.ts     # NormalizedMarketplaceOrder → mevcut sipariş hattı (external.ts ile ortak servis)
  status-dispatcher.ts  # OrderStatus değişimi → MarketplaceStatusJob üret; kuyruk işleyici
  tgo-poller.ts         # TGO polling worker (connection başına cursor, merkezi rate budget)
  crypto.ts             # credential şifreleme/çözme (AES-256-GCM)
apps/api/src/routes/
  marketplace.ts        # Getir inbound webhook uçları + connection CRUD + mapping CRUD
```

```typescript
// types.ts — çekirdek arayüz
export interface NormalizedMarketplaceOrder {
  platform: 'GETIR' | 'TRENDYOL_GO';
  externalOrderId: string;          // prefix'li: "getir:..." | "tgo:..."
  displayCode: string;              // confirmationId / orderNumber
  orderType: 'DELIVERY' | 'TAKEAWAY';
  courierModel: 'PLATFORM' | 'RESTAURANT'; // deliveryType eşlemesi
  isScheduled: boolean;
  scheduledFor?: Date;
  customer: { name: string; phone: string; phoneIsProxy: boolean };
  address?: { text: string; lat?: number; lon?: number; isMasked: boolean };
  items: Array<{
    platformProductId: string;
    menuItemId: string | null;      // mapping'den; null → eşlenmemiş ürün uyarısı
    name: string;                   // platform adı (fallback gösterim)
    quantity: number;
    unitPrice: number;              // platform fiyatı esas alınır
    modifiersText: string[];        // düzleştirilmiş opsiyonlar (fiş için)
    notes?: string;
    meta: Record<string, unknown>;  // packageItemId'ler, chainProduct vb.
  }>;
  totals: { total: number; discountedTotal?: number };
  paymentMethod: PaymentMethod;     // packages/types enum'u
  notes?: string;
  raw: unknown;                     // MarketplaceEventLog'a yazılan ham payload
}

export interface MarketplaceAdapter {
  parseIncomingOrder(raw: unknown, conn: MarketplaceConnection): Promise<NormalizedMarketplaceOrder>;
  acceptOrder(conn, externalOrderId, opts?): Promise<void>;      // Getir verify/verify-scheduled, TGO picked
  pushStatus(conn, externalOrderId, action): Promise<void>;      // prepare/deliver/handover | invoiced/manual-*
  cancelOrder(conn, externalOrderId, reason): Promise<void>;     // Getir cancel, TGO unsupplied
  fetchMenu(conn): Promise<PlatformMenuItem[]>;                  // mapping UI için
  setProductAvailability(conn, platformProductId, available): Promise<void>;
  setStoreStatus(conn, open: boolean): Promise<void>;
}
```

**Tenant çözümleme:**
- **Getir (inbound webhook):** `x-api-key` header → `MarketplaceConnection.inboundApiKey` (unique) → `tenantId` → `dbFor(tenantId)`. Mevcut `middleware/api-key.ts` deseninin pazar yeri varyantı. Payload'daki `restaurantId` ile connection'daki `restaurantId` çapraz doğrulanır.
- **TGO (polling):** Yön zaten bizden — poller her aktif connection için kendi tenant DB'siyle çalışır.

### 3.4 Gelen Sipariş → Normalize → POS/KDS Enjeksiyonu

```
webhook/poll → adapter.parseIncomingOrder → order-injector:
  1. Idempotency: externalOrderId ile mevcut Order var mı? (varsa 200 dön, işlem yok)
  2. Mapping çöz: her satır için MarketplaceProductMapping → menuItemId
     - Eşlenmemiş ürün varsa: sipariş YİNE oluşturulur (platform adıyla, "eşlenmemiş" bayrağıyla)
       + POS'a uyarı bildirimi — sipariş kaybetmek eşleme eksikliğinden kötüdür
  3. Order + OrderItem oluştur (source, externalOrderId, platform fiyatları, meta)
  4. Stok düş (mevcut hattın davranışı)
  5. broadcastNewOrder → POS + KDS anında görür (mevcut WebSocket kanalları, değişiklik yok)
  6. autoAccept=true → status-dispatcher'a accept job'ı ekle
     (Getir: hemen; TGO: hemen — iki platformda da bekletmenin cezası var)
  7. MarketplaceEventLog'a INBOUND kayıt
```

KDS/POS tarafında **yeni ekran gerekmez**; sipariş kartında `source` rozeti (GetirYemek / Trendyol GO / Galaxy), `displayCode`, proxy telefon uyarısı ("santrali ara + sipariş no tuşla") ve kurye modeli bilgisi gösterilir.

### 3.5 Durum Geri Bildirimi Eşlemesi

**OtOrder → platform (outbound):** `status-dispatcher`, `Order.status` değişikliklerini dinler (orders route'undaki update noktasına hook) ve `MarketplaceStatusJob` üretir. İşleyici Getir için `notBefore = son başarılı statü çağrısı + 60 sn` kuralını ve idempotency'yi ("bu action bu order için daha önce SENT mi?") uygular.

| OtOrder `OrderStatus` | Getir (deliveryType 2 — Restoran Getirsin) | Getir (deliveryType 1 — Getir Getirsin) | TGO (Model 1 — STORE) | TGO (Model 2 — GO) |
|---|---|---|---|---|
| `PENDING` | (sipariş oluştu, henüz onay yok) | (aynı) | (Created) | (Created) |
| `CONFIRMED` | `POST /verify` (325 ise `/verify-scheduled`) | aynı | `PUT packages/picked {preparationTime}` | aynı |
| `PREPARING` | `POST /prepare` | aynı | — (TGO'da ayrı "hazırlanıyor" yok; Picking zaten bunu kapsar) | — |
| `READY` | — (Getir'de RG için ara statü yok) | — | `PUT packages/invoiced` | `PUT packages/invoiced` |
| `OUT_FOR_DELIVERY` | — (RG'de "yolda" bildirimi yok; deliver tek adım) | `POST /handover` (kurye teslim aldığında) | `PUT packages/{id}/manual-shipped` | **çağrılmaz** — platform yönetir |
| `DELIVERED` / `COMPLETED` | `POST /deliver` | **çağrılmaz** — 700/800/900 Getir'de | `PUT packages/{id}/manual-delivered` | **çağrılmaz** — polling'den okunur |
| `CANCELLED` | `GET cancel-options` → `POST /cancel` | aynı | `PUT packages/unsupplied` (621/622/623/627; 624/626 de M1'de geçerli) | `PUT packages/unsupplied` (621/622/623/627) |

**Platform → OtOrder (inbound):**

| Platform olayı | OtOrder aksiyonu |
|---|---|
| Getir `CancelOrder` webhook (1500 admin / müşteri iptali) | `Order.status = CANCELLED`, stok geri al, `broadcastOrderUpdate`, POS bildirimi |
| Getir `Courier` webhook (pickup ETA) | Siparişe kurye ETA meta'sı, POS'ta göster (statü değişmez) |
| Getir `Restaurant` webhook (statü değişti) | Connection `status` güncelle; restoran Getir tarafından kapatıldıysa POS'a **kritik alarm** (5 dk kuralı ihlali işareti) |
| Getir 325→500 otomatik geçişi (webhook GELMEZ) | OtOrder zamanlayıcısı `scheduledFor - 1 saat`te siparişi KDS'e düşürür ve `PREPARING`e hazırlar |
| TGO `Cancelled` (poll) | `CANCELLED` + stok iade + `broadcastOrderUpdate`; `reasonCode 625` ise autoAccept arızası alarmı |
| TGO `UnSupplied` (poll) | Bizim başlattığımız iptalin teyidi (idempotent geç) |
| TGO `Shipped`/`Delivered` (poll, Model 2) | `OUT_FOR_DELIVERY` / `DELIVERED` olarak senkronla, `broadcastOrderUpdate` |
| TGO `pickupEtaState=FAILED` | POS'a "kurye atanamadı" uyarısı |

### 3.6 Menü Eşleme Stratejisi

İki platformda da **menü API'dan yazılamaz** — bu yüzden strateji "senkronizasyon" değil **"eşleme + kısıtlı geri yazım"**dır:

1. **İçe aktarım:** "Menüyü Getir'den/TGO'dan çek" butonu → `adapter.fetchMenu` → platform ürünleri `MarketplaceProductMapping`e upsert edilir (`platformProductId` + isim snapshot'ı; Getir zincirlerde `chainProduct` id'si kullanılır).
2. **Eşleme UI (POS ayarları):** İki sütunlu ekran — solda platform ürünleri (eşlenmemiş olanlar üstte, kırmızı), sağda OtOrder `MenuItem` arama/seçme. İsim benzerliğiyle otomatik öneri (normalize edilmiş string eşleşmesi), tek tıkla onay. "Yoksay" seçeneği (`isIgnored`).
3. **Eşlenmemiş ürün politikası:** Sipariş reddedilmez; satır platform adıyla oluşturulur ve POS'ta "eşlenmemiş ürün" uyarısı çıkar. Eşleme sonradan tamamlanır.
4. **Geri yazım (kısıtlı):**
   - Ürün stok/aktiflik: OtOrder'da ürün pasife alınınca → Getir `PUT /products/{id}/status {200}` (gün sonu kapama için 400) / TGO `PASSIVE`. (Opsiyonel, connection bazlı `syncAvailability` bayrağıyla.)
   - Fiyat: **Getir tekil restoranda API'dan yapılamaz** (yalnız panel; zincirlerde `update-prices`). TGO'da asenkron batch ile yapılabilir (batch sonucu zorunlu takip, sadece değişen fiyatlar, `restaurantId` boş bırakılırsa tüm şubelere yayıldığı unutulmadan).
5. **Drift tespiti:** Günlük cron menüyü yeniden çeker; yeni/silinen/adı değişen platform ürünlerinde mapping ekranında "gözden geçir" rozeti.

### 3.7 Feature-Flag ve Paketleme

- `lib/plan-limits.ts`'e yeni feature: `marketplace` (WhatsApp modülündeki `requireFeature` deseniyle aynı).
- Öneri: **Kurumsal** pakette dahil (WhatsApp gibi); istenirse platform başına ayrı alt-flag (`marketplace:getir`, `marketplace:tgo`) ile kademeli açılış.
- `routes/marketplace.ts` altındaki tüm connection/mapping uçları `requireFeature('marketplace')` arkasında; TGO poller yalnız feature'ı açık tenant'ların aktif connection'larını zamanlar.
- POS ayarlarında "Pazar Yerleri" sayfası: WhatsApp'taki `connect/status/disconnect` akışının pazar yeri karşılığı (credential girişi + doğrulama testi + durum göstergesi).

---

## 4. Uygulama Fazları

Her faz küçük, tek başına deploy edilebilir ve kabul kriteri doğrulanabilir olacak şekilde bölündü.

### Faz 0 — Zemin: şema, feature-flag, bağlantı yönetimi
- Prisma: `MarketplaceConnection`, `MarketplaceProductMapping`, `MarketplaceStatusJob`, `MarketplaceEventLog` + migration.
- `crypto.ts` (AES-256-GCM credential şifreleme, `MARKETPLACE_CREDENTIALS_KEY` env).
- `plan-limits`'e `marketplace` feature'ı; `routes/marketplace.ts` connection CRUD (create/status/disconnect) `requireFeature` arkasında.
- POS ayarlarında "Pazar Yerleri" sayfası iskeleti (credential formu, durum rozeti).
- **Kabul kriteri:** Migration prod-benzeri DB'de temiz uygulanıyor; Kurumsal olmayan tenant 403 alıyor; credential'lar DB'de şifreli duruyor ve API yanıtlarında asla dönmüyor; connection oluştur/sil akışı POS'tan çalışıyor.

### Faz 1 — Getir: gelen sipariş hattı (test ortamı)
- `getir-adapter.ts`: login + token cache (1 saat, tenant+location bazlı), `parseIncomingOrder`.
- Inbound webhook uçları: `POST /api/marketplace/getir/webhooks/new-order` ve `/cancel-order` (`inboundApiKey` doğrulaması, timing-safe).
- `order-injector.ts`: normalize → idempotency → Order oluştur → stok düş → `broadcastNewOrder`; `autoAccept` ile anında `verify`/`verify-scheduled`.
- Eşlenmemiş ürün politikası (siparişi platform adıyla oluştur + uyarı).
- **Kabul kriteri:** Getir test ortamından verilen sipariş 5 sn içinde POS+KDS'te görünüyor; aynı webhook iki kez gelince tek sipariş oluşuyor; sipariş 30 sn içinde verify ediliyor (EventLog'da kanıt); iptal webhook'u siparişi CANCELLED yapıp stok iade ediyor.

### Faz 2 — Getir: statü geri bildirimi + operasyon uçları
- `status-dispatcher.ts` + `MarketplaceStatusJob` işleyicisi: min-1-dk kuralı, 2/60 sn rate limit, action-per-order idempotency, deliveryType'a göre geçerli geçiş seti (RG'de handover yok, GG'de deliver yok).
- İptal akışı: cancel-options çek → POS'ta sebep seçtir → cancel.
- İleri tarihli sipariş zamanlayıcısı (`scheduledFor - 1 saat` KDS düşürme).
- Restoran aç/kapa + yoğuna alma butonları (POS).
- `Courier` ve `Restaurant` webhook uçları.
- **Kabul kriteri:** Test ortamında RG akışı (verify→prepare→deliver) ve GG akışı (verify→prepare→handover) uçtan uca yeşil; ardışık statü çağrıları arasında ≥60 sn olduğu loglardan doğrulanıyor; tekrarlı statü hatası (FoodOrderAlreadyVerified) hiç oluşmuyor; ileri tarihli sipariş doğru zamanda KDS'e düşüyor.

### Faz 3 — Getir: menü eşleme
- `fetchMenu` (`GET /restaurants/menu` + `option-products`) → mapping upsert.
- POS eşleme UI (otomatik isim önerisi, yoksay, eşlenmemiş sayacı).
- Opsiyonel `syncAvailability`: ürün pasif → `PUT /products/{id}/status`.
- **Kabul kriteri:** Test restoranı menüsü çekilip ≥1 ürün eşleniyor; eşlenmiş ürünle gelen sipariş doğru `menuItem`e bağlanıyor ve stok düşüyor; OtOrder'da pasife alınan ürün Getir panelinde kapalı görünüyor.

### Faz 4 — TGO: gelen sipariş hattı (stage)
- Stage IP whitelist + Basic Auth kompozisyonunun teyidi (**bu fazın giriş şartı**).
- `tgo-adapter.ts`: Basic Auth + zorunlu header'lar, `parseIncomingOrder` (nested modifier düzleştirme, `packageItemId` meta).
- `tgo-poller.ts`: connection başına cursor'lu polling (`packageModificationStartDate`), `Created` + `Cancelled` + (Model 2 için) `Shipped/Delivered` statüleri; merkezi rate budget (50/10 sn).
- Injector'a TGO kaynağı; `autoAccept` → `picked {preparationTime}`.
- **Kabul kriteri:** Stage'de `POST /meal-test-order` ile oluşturulan sipariş bir poll periyodu içinde POS+KDS'te; duplicate poll sonucu tek sipariş; `picked` sonrası paket `Picking` statüsünde doğrulanıyor; 429 hiç alınmıyor (loglardan).

### Faz 5 — TGO: statü geri bildirimi + iptal
- `invoiced`, Model 1 için `manual-shipped`/`manual-delivered`; Model 2'de bu geçişlerin polling'den okunması.
- Tam/kısmi iptal: `unsupplied` (POS'ta kalem seçimi → `packageItemId` listesi + geçerli reasonId seti; platform kodları bloklanır).
- 409 handling (statü geçişi vs. eşzamanlılık retry ayrımı).
- Platform iptali (625 dahil) → CANCELLED + alarm.
- **Kabul kriteri:** Stage'de Model 1 akışı uçtan uca (Created→Picking→Invoiced→Shipped→Delivered); kısmi iptal senaryosunda yalnız seçilen kalemler UnSupplied; 625 senaryosunda POS'ta alarm bildirimi görünüyor.

### Faz 6 — TGO: menü eşleme + fiyat
- `fetchMenu` (`products`/`sections`/`modifierGroups`) → mapping UI (Faz 3 ekranının TGO sekmesi).
- Ürün/kategori ACTIVE-PASSIVE geri yazımı (`sectionId` ile).
- Fiyat güncelleme: yalnız değişen fiyatlar, batch takibi (`batchRequestId` polling'i, failureReasons raporu), `restaurantId` zorunlu gönderim (tüm-şube kazasına karşı).
- **Kabul kriteri:** Stage menüsü çekilip eşleniyor; fiyat batch'i gönderilip sonuç ekranda "başarılı/başarısız kalem" olarak raporlanıyor; aynı body ile ikinci gönderim engelleniyor (client-side diff).

### Faz 7 — Dayanıklılık, izleme ve go-live
- Getir webhook sağlık kontrolü: son X dakikada event yoksa `/unapproved` yedek polling'i devreye girer (rate limitlere saygılı).
- `MarketplaceEventLog` tabanlı süper-admin izleme ekranı (tenant başına son olaylar, hata oranı); kritik alarmlar (verify gecikmesi, restoran otomatik kapanması, poller durması).
- Getir go-live prosedürü: zorunlu test senaryoları (iptal, RG, GG, indirim/kampanya, ileri tarihli, open/close) + kampanya ve sipariş notu içeren siparişin **fiş çıktısıyla onay e-postası**.
- TGO prod anahtar geçişi ve prod smoke testi.
- **Kabul kriteri:** Webhook kesintisi simülasyonunda sipariş polling'den yakalanıyor; go-live checklist'leri iki platform için de tamamlanmış ve ilk gerçek pilot tenant'ta ilk canlı sipariş uçtan uca (kabul→teslim→statü senkron) doğrulanmış.

---

## 5. Açık Sorular ve Kullanıcının Yapması Gerekenler

### Başvuru / sözleşme (kod yazılmadan önce başlatılmalı — onay süreleri belirsiz)

| # | Aksiyon | Detay |
|---|---|---|
| 1 | **Getir developer başvurusu** | https://developers.getir.com self-servis form: şirket bilgileri (OtOrder tüzel kişiliği), domain'ler, hizmet seçimi (Food), API Terms + Info Protection kabulü. Onay sonrası test/canlı `appSecretKey` gelir. Restoran sahipleri değil, **entegratör (OtOrder)** başvurur. |
| 2 | **Getir webhook kaydı** | Webhook URL'leri (`.../getir/webhooks/new-order` vb.) + bizim ürettiğimiz `x-api-key` getiryemekapi@getir.com'a **manuel** iletilecek. Birden fazla URL'de x-api-key aynı olmalı. |
| 3 | **Getir go-live e-postası** | Zorunlu test senaryoları sonrası kampanya + sipariş notu içeren siparişin **fiş çıktısı fotoğrafıyla** onay e-postası. |
| 4 | **TGO satıcı hesabı erişimi** | Pilot tenant'ın Trendyol GO satıcı paneli > "Hesap Bilgilerim > Entegrasyon Bilgileri"nden `supplierId` + API Key + Secret alınmalı (PROD ve STAGE ayrı). |
| 5 | **TGO stage IP whitelist** | Prod sunucularımızın çıkış IP'leri 0850 258 58 00 / panel bildirimi ile TGO'ya bildirilmeli (503 = yetkisiz IP). |
| 6 | **Restoran başına Getir credential** | Her tenant restoranı için `restaurantSecretKey` temini — onboarding akışına operasyonel adım olarak eklenmeli. |

### Doğrulanması gerekenler (DOĞRULANAMADI listesi)

| # | Konu | Nasıl doğrulanır |
|---|---|---|
| 1 | Getir webhook **retry politikası** | getiryemekapi@getir.com'a sor; yanıta göre Faz 7 yedek polling agresifliği ayarlanır. |
| 2 | Getir `posStatus` 100/200 semantiği | Getir desteğine sor (muhtemelen POS aktif/pasif, ama uydurmuyoruz). |
| 3 | Getir prod/test **IP whitelist** var mı | Dokümanda geçmiyor; onboarding'de teyit. |
| 4 | TGO **Yemek tarafında webhook** kullanılabilir mi | TGO destek ile teyit; evet ise Faz 7'de opsiyonel hızlandırıcı olarak eklenir (polling ana yol kalır). |
| 5 | TGO **Basic Auth kompozisyonu** (`base64(apiKey:apiSecret)` mi, supplierId nerede) | Faz 4 başında stage'de deneysel teyit. |
| 6 | TGO **sipariş kabul süresi** (625'e düşmeden ne kadar süre var) | TGO destek; `autoAccept` yine de varsayılan açık. |
| 7 | TGO **önerilen polling aralığı** | Dokümanda yok; 50 istek/10 sn bütçesine göre başlangıç 15-20 sn/connection, destekle teyit. |
| 8 | TGO "Statik IP'ler için yetkilendirme sağlanamamaktadır" ifadesinin anlamı | Muğlak — IP bildirimi sırasında netleştirilmeli. |

### Ürün/operasyon kararları (kullanıcı onayı bekliyor)

1. **Paketleme:** `marketplace` feature'ı yalnız Kurumsal'da mı, yoksa ayrı ücretli eklenti mi?
2. **autoAccept varsayılanı:** Öneri "açık" (Getir 30 sn / TGO 625 riski). Tenant'a kapatma seçeneği verilecek mi, verilirse Getir 5 dk otomatik kapanma riski nasıl anlatılacak?
3. **Fiyat sahipliği:** Platform fiyatları OtOrder fiyatlarından bağımsız yönetiliyor (komisyon payı vb.). Mapping ekranında fiyat farkı sadece **gösterilsin** mi, TGO'da tek tıkla eşitleme sunulsun mu?
4. **Pilot tenant:** İlk canlı entegrasyon hangi restoranla yapılacak (Akçakoca?) ve hangi platformla başlanacak? Öneri: Getir (webhook tabanlı, davranışı daha öngörülebilir) → sonra TGO.
5. **Kurye modeli kapsamı:** İlk sürümde iki platformda da her iki kurye modeli mi destekleniyor, yoksa MVP yalnız platform-kuryeli (Getir Getirsin / TGO Model 2) mi?