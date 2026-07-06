# Canlı Test Sonuçları — otorder.com + whatsapp.otorder.com

> Otomatik koşum (scripts/live-test-runner.mjs). Prod'a karşı gerçek istekler.
> **39/39 PASS (%100)**, 0 FAIL.

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
| LT-028 | whatres Kimlik & Plan | ✅ PASS | whatres register eksik alan 400 | status 400 |
| LT-029 | whatres Kimlik & Plan | ✅ PASS | whatres register consent olmadan 400 | status 400 |
| LT-030 | whatres Kimlik & Plan | ✅ PASS | whatres register kısa şifre 400 | status 400 |
| LT-031 | whatres Kimlik & Plan | ✅ PASS | whatres login yanlış şifre 401 | status 401 |
| LT-032 | whatres Kimlik & Plan | ✅ PASS | whatres health 200 | status 200 |
| LT-033 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder auth olmadan 401 | status 401 |
| LT-034 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder eksik alan 400 | status 400 |
| LT-035 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder yanlış OtOrder şifresi 401 | status 401, Geçersiz email veya şifre |
| LT-036 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | connect-otorder olmayan subdomain 502/401 | status 401 |
| LT-037 | whatres OtOrder-Bağla (negatif + auth) | ✅ PASS | POS entegrasyon durumu bağlı | configured true |
| LT-038 | OtOrder External API (partner key) | ✅ PASS | External menu API-Key olmadan 401 | status 401 |
| LT-039 | OtOrder External API (partner key) | ✅ PASS | Geçersiz API-Key ile external menu 401 | status 401 |
