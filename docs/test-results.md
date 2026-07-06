# Canlı Test Sonuçları — otorder.com + whatsapp.otorder.com

> Otomatik koşum (scripts/live-test-runner.mjs). Prod'a karşı gerçek istekler.
> **61/61 PASS (%100)**, 0 FAIL.

| ID | Alan | Sonuç | Senaryo | Detay |
|---|---|---|---|---|
| LT-001 | OtOrder Platform & Fiyat | ✅ PASS | Plan listesi 3 paket döner | status 200, 3 plan |
| LT-002 | OtOrder Platform & Fiyat | ✅ PASS | Başlangıç fiyatı 990 TL | monthlyPrice 990 |
| LT-003 | OtOrder Platform & Fiyat | ✅ PASS | Pro fiyatı 1990 TL | monthlyPrice 1990 |
| LT-004 | OtOrder Platform & Fiyat | ✅ PASS | Kurumsal fiyatı 3990 + brandedApp+customLanding | 3990, branded=true |
| LT-005 | OtOrder Platform & Fiyat | ✅ PASS | Pro whatsappLink+marketplace açık, STARTER kapalı | pro.wa=true st.wa=false |
| LT-006 | OtOrder Subdomain Kontrol | ✅ PASS | Geçerli boş subdomain müsait | available true |
| LT-007 | OtOrder Subdomain Kontrol | ✅ PASS | Ayrılmış subdomain (api) reddedilir | available false |
| LT-008 | OtOrder Subdomain Kontrol | ✅ PASS | Ayrılmış subdomain (www) reddedilir | available false |
| LT-009 | OtOrder Subdomain Kontrol | ✅ PASS | Alınmış subdomain (testwa) müsait değil | available false |
| LT-010 | OtOrder Subdomain Kontrol | ✅ PASS | Kısa/geçersiz subdomain (ab) reddedilir | available false |
| LT-011 | OtOrder Subdomain Kontrol | ✅ PASS | Geçersiz karakterli subdomain reddedilir | available false |
| LT-012 | OtOrder Signup Validasyon | ✅ PASS | Eksik alanlarla signup 400 | status 400 |
| LT-013 | OtOrder Signup Validasyon | ✅ PASS | Kısa şifre ile signup 400 | status 400 |
| LT-014 | OtOrder Signup Validasyon | ✅ PASS | Geçersiz email ile signup 400 | status 400 |
| LT-015 | OtOrder Signup Validasyon | ✅ PASS | Alınmış subdomain ile signup 409 | status 409 |
| LT-016 | OtOrder Signup Validasyon | ✅ PASS | Ayrılmış subdomain ile signup 400 | status 400 |
| LT-017 | OtOrder Kimlik & Yetki | ✅ PASS | Yanlış şifre ile login 401 | status 401 |
| LT-018 | OtOrder Kimlik & Yetki | ✅ PASS | Kayıtsız email ile login 401 | status 401 |
| LT-019 | OtOrder Kimlik & Yetki | ✅ PASS | Token olmadan /me 401 | status 401 |
| LT-020 | OtOrder Kimlik & Yetki | ✅ PASS | Geçersiz token ile /me 401 | status 401 |
| LT-021 | OtOrder Kimlik & Yetki | ✅ PASS | Süper-admin login yetkisiz email 403 | status 403 |
| LT-022 | OtOrder Kimlik & Yetki | ✅ PASS | Geçerli owner token ile /me 200 | status 200 |
| LT-023 | OtOrder Kimlik & Yetki | ✅ PASS | Owner token super-admin endpoint 403 | status 403 |
| LT-024 | OtOrder Onboarding & Billing (owner) | ✅ PASS | Onboarding durumu owner ile 200 | status 200, step 2 |
| LT-025 | OtOrder Onboarding & Billing (owner) | ✅ PASS | Onboarding auth olmadan 401 | status 401 |
| LT-026 | OtOrder Onboarding & Billing (owner) | ✅ PASS | Abonelik durumu owner ile 200 | status 200 |
| LT-027 | whatres Kimlik & Plan | ✅ PASS | whatres plan Gümüş 1000 TL | 1000 TRY |
| LT-028 | whatres Kimlik & Plan | ✅ PASS | whatres register eksik alan reddedilir (400/429) | status 429 |
| LT-029 | whatres Kimlik & Plan | ✅ PASS | whatres register consent olmadan reddedilir (400/429) | status 429 |
| LT-030 | whatres Kimlik & Plan | ✅ PASS | whatres register kısa şifre reddedilir (400 / rate-limit 429) | status 429 |
| LT-031 | whatres Kimlik & Plan | ✅ PASS | whatres login yanlış şifre reddedilir (401 / rate-limit 429) | status 429 |
| LT-032 | whatres Kimlik & Plan | ✅ PASS | whatres auth rate-limiter aktif (art arda istek 429) | rate limit devreye girdi |
| LT-033 | whatres Kimlik & Plan | ✅ PASS | whatres health 200 | status 200 |
| LT-034 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder auth olmadan 401 | status 401 |
| LT-035 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder eksik alan 400 | status 400 |
| LT-036 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder yanlış OtOrder şifresi 401 | status 401, Geçersiz email veya şifre |
| LT-037 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder olmayan subdomain 502/401 | status 401 |
| LT-038 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | POS entegrasyon durumu bağlı | configured true |
| LT-039 | OtOrder External API (partner key) | ✅ PASS | External menu API-Key olmadan 401 | status 401 |
| LT-040 | OtOrder External API (partner key) | ✅ PASS | Geçersiz API-Key ile external menu 401 | status 401 |
| LT-041 | OtOrder Public Tema & Ayarlar | ✅ PASS | Public tema testwa subdomain 200 + renk | status 200, name Test Restoran |
| LT-042 | OtOrder Public Tema & Ayarlar | ✅ PASS | Bilinmeyen subdomain tema 404 | status 404 |
| LT-043 | OtOrder Public Tema & Ayarlar | ✅ PASS | Public services whitelist (sır yok) | status 200, sızıntı=false |
| LT-044 | OtOrder Public Tema & Ayarlar | ✅ PASS | X-Tenant-ID ile tenant çözülür (public menu) | status 200 |
| LT-045 | OtOrder Marketplace TGO (negatif) | ✅ PASS | TGO connect auth olmadan 401 | status 401 |
| LT-046 | OtOrder Marketplace TGO (negatif) | ✅ PASS | TGO connect eksik/yanlış kimlik 400 | status 400 |
| LT-047 | OtOrder Marketplace TGO (negatif) | ✅ PASS | TGO status bağlantısız 200/boş | status 200, connected false |
| LT-048 | OtOrder External Sipariş (partner key) | ✅ PASS | External sipariş oluştur → menuItemName dolu (regresyon) | #9 name=Margherita |
| LT-049 | OtOrder External Sipariş (partner key) | ✅ PASS | External sipariş idempotency (aynı externalOrderId tek sipariş) | #10 vs #10 |
| LT-050 | OtOrder External Sipariş (partner key) | ✅ PASS | External sipariş geçersiz menuItemId 400 | status 400 |
| LT-051 | OtOrder External Sipariş (partner key) | ✅ PASS | External menu hash döner | status 200 |
| LT-052 | Canlı Tenant İzolasyonu | ✅ PASS | İzolasyon: 2. tenant oluşturuldu (PRO) | status 201 |
| LT-053 | Canlı Tenant İzolasyonu | ✅ PASS | İzolasyon: 2. tenant menüsü kendi ürünlerini içerir (Napoliten) | Napoliten,Alfredo,Bolonez,Kola,Su |
| LT-054 | Canlı Tenant İzolasyonu | ✅ PASS | İzolasyon: testwa key ile 2. tenant menüsüne erişince FARKLI menü | key tenant'a scope: Margherita,Sucuklu,Karışık,Kola,Ayran |
| LT-055 | Canlı Tenant İzolasyonu | ✅ PASS | İzolasyon: 2. tenant owner testwa siparişlerini göremez | status 403 |
| LT-056 | Canlı Tenant İzolasyonu | ✅ PASS | İzolasyon: geçici 2. tenant temizlendi | silindi |
| LT-057 | whatres NLU (Qwen canlı) | ✅ PASS | NLU: "2 margherita 1 kola istiyorum" | 2 kalem çıkardı (beklenen ~2) |
| LT-058 | whatres NLU (Qwen canlı) | ✅ PASS | NLU: "bir pepperoni pizza" | 1 kalem çıkardı (beklenen ~1) |
| LT-059 | whatres NLU (Qwen canlı) | ✅ PASS | NLU: "3 kola lütfen" | 1 kalem çıkardı (beklenen ~1) |
| LT-060 | whatres NLU (Qwen canlı) | ✅ PASS | NLU: "karışık pizza ve ayran" | 2 kalem çıkardı (beklenen ~2) |
| LT-061 | whatres NLU (Qwen canlı) | ✅ PASS | NLU: "iki tane margherita olsun" | 1 kalem çıkardı (beklenen ~1) |
