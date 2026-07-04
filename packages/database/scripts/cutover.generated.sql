-- ============================================================================
-- CUTOVER: Akçakoca (staging, tek-kiracılı) → OtOrder public (çok-kiracılı)
-- ÜRETİLDİ: gen-cutover-sql.mjs — ELLE DÜZENLEME. Idempotent (ON CONFLICT DO NOTHING).
-- ============================================================================
-- Gerekli psql değişkenleri (colon-quote ile kullanılır): tenant_id subdomain tenant_name
--   örn: -v tenant_id=<cuid> -v subdomain=akcakoca -v tenant_name="High Five"
-- Ön koşul: eski prod pg_dump ile "staging" şemasına restore edilmiş olmalı.
\set ON_ERROR_STOP on
BEGIN;

-- Tenant id'yi session GUC'sine koy → plpgsql içinde current_setting ile okunur
-- (psql :değişken interpolasyonu ile %L çift-tırnak sorununu tümüyle önler).
SELECT set_config('cutover.tid', :'tenant_id', false);

-- 0) Tenant + (varsayılan) Plan/Subscription — cuid :tenant_id ile KORUNUR/oluşturulur
INSERT INTO public."Tenant" (id, name, subdomain, status, "onboardingStep", "onboardingCompletedAt", "createdAt", "updatedAt")
VALUES (:'tenant_id', :'tenant_name', :'subdomain', 'ACTIVE', 5, now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Subscription" (id, "tenantId", "planId", status, cycle, "currentPeriodStart", "currentPeriodEnd", "autoRenew", "createdAt", "updatedAt")
SELECT 'sub_' || :'tenant_id', :'tenant_id', p.id, 'ACTIVE', 'MONTHLY', now(), now() + interval '100 years', true, now(), now()
FROM public."Plan" p WHERE p.key = 'ENTERPRISE'
ON CONFLICT ("tenantId") DO NOTHING;

-- 1) Generic kopyalayıcı: ORTAK kolonlar (kesişim) + "tenantId" enjekte (GUC'ten)
CREATE OR REPLACE FUNCTION pg_temp._copy_tenant_table(p_table text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  cols text;
  n bigint;
BEGIN
  -- staging ve public'te ORTAK olan, tenantId HARİÇ kolonlar
  SELECT string_agg(format('%I', s.column_name), ', ')
    INTO cols
  FROM information_schema.columns s
  JOIN information_schema.columns d
    ON d.table_schema = 'public' AND d.table_name = p_table AND d.column_name = s.column_name
  WHERE s.table_schema = 'staging' AND s.table_name = p_table
    AND s.column_name <> 'tenantId';

  IF cols IS NULL THEN
    RAISE NOTICE 'ATLA %: staging tablosu/kolonu yok', p_table;
    RETURN 0;
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (%s, %I) SELECT %s, %L FROM staging.%I ON CONFLICT DO NOTHING',
    p_table, cols, 'tenantId', cols, current_setting('cutover.tid'), p_table
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'kopyalandı %: % satır', p_table, n;
  RETURN n;
END $$;

-- 2) User → User + Membership BÖLME.
--    2a) User (platform kimliği): staging.User ∩ public.User ORTAK kolonlar dinamik
--        kopyalanır (role/pin/locationId yeni User'da YOK → kesişimde gelmez). cuid KORUNUR.
DO $$
DECLARE cols text; n bigint;
BEGIN
  SELECT string_agg(format('%I', s.column_name), ', ') INTO cols
  FROM information_schema.columns s
  JOIN information_schema.columns d
    ON d.table_schema='public' AND d.table_name='User' AND d.column_name=s.column_name
  WHERE s.table_schema='staging' AND s.table_name='User';
  EXECUTE format('INSERT INTO public."User" (%s) SELECT %s FROM staging."User" ON CONFLICT (id) DO NOTHING', cols, cols);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'User kopyalandı: % satır', n;
END $$;

--    2b) Membership: eski User.role/pin/locationId → bu tenant için üyelik.
INSERT INTO public."Membership" (id, "userId", "tenantId", role, pin, "locationId", active, "createdAt", "updatedAt")
SELECT 'mb_' || u.id, u.id, :'tenant_id',
       COALESCE(u.role::text, 'WAITER')::"UserRole",
       u.pin, u."locationId", COALESCE(u.active, true), now(), now()
FROM staging."User" u
ON CONFLICT ("userId", "tenantId") DO NOTHING;

-- 3) FK-sıralı tenant tabloları (parent → child); id/cuid KORUNUR
SELECT pg_temp._copy_tenant_table('Achievement');
SELECT pg_temp._copy_tenant_table('ActivityLog');
SELECT pg_temp._copy_tenant_table('AnalyticsEvent');
SELECT pg_temp._copy_tenant_table('BillingTransaction');
SELECT pg_temp._copy_tenant_table('BuilderBase');
SELECT pg_temp._copy_tenant_table('BuilderIngredient');
SELECT pg_temp._copy_tenant_table('Campaign');
SELECT pg_temp._copy_tenant_table('Category');
SELECT pg_temp._copy_tenant_table('Coupon');
SELECT pg_temp._copy_tenant_table('CourierLocation');
SELECT pg_temp._copy_tenant_table('DailyReport');
SELECT pg_temp._copy_tenant_table('ExpenseCategory');
SELECT pg_temp._copy_tenant_table('Location');
SELECT pg_temp._copy_tenant_table('LoyaltyProgram');
SELECT pg_temp._copy_tenant_table('LoyaltyTier');
SELECT pg_temp._copy_tenant_table('Membership');
SELECT pg_temp._copy_tenant_table('MysteryBoxConfig');
SELECT pg_temp._copy_tenant_table('OptionGroup');
SELECT pg_temp._copy_tenant_table('PizzaGameScore');
SELECT pg_temp._copy_tenant_table('PrintJob');
SELECT pg_temp._copy_tenant_table('Printer');
SELECT pg_temp._copy_tenant_table('RawMaterial');
SELECT pg_temp._copy_tenant_table('Session');
SELECT pg_temp._copy_tenant_table('Settings');
SELECT pg_temp._copy_tenant_table('SpinWheelConfig');
SELECT pg_temp._copy_tenant_table('StoredCard');
SELECT pg_temp._copy_tenant_table('Subscription');
SELECT pg_temp._copy_tenant_table('WhatsAppMessage');
SELECT pg_temp._copy_tenant_table('BundleDeal');
SELECT pg_temp._copy_tenant_table('Customer');
SELECT pg_temp._copy_tenant_table('Expense');
SELECT pg_temp._copy_tenant_table('HappyHour');
SELECT pg_temp._copy_tenant_table('IntegrationPartner');
SELECT pg_temp._copy_tenant_table('MenuItem');
SELECT pg_temp._copy_tenant_table('PushNotification');
SELECT pg_temp._copy_tenant_table('Table');
SELECT pg_temp._copy_tenant_table('Address');
SELECT pg_temp._copy_tenant_table('BundleItem');
SELECT pg_temp._copy_tenant_table('BundleOptionGroup');
SELECT pg_temp._copy_tenant_table('BundleOptionGroupAssignment');
SELECT pg_temp._copy_tenant_table('CouponUsage');
SELECT pg_temp._copy_tenant_table('CustomerAchievement');
SELECT pg_temp._copy_tenant_table('CustomerLoyaltyProgress');
SELECT pg_temp._copy_tenant_table('CustomerOrder');
SELECT pg_temp._copy_tenant_table('DeviceToken');
SELECT pg_temp._copy_tenant_table('FavoriteItem');
SELECT pg_temp._copy_tenant_table('HappyHourItem');
SELECT pg_temp._copy_tenant_table('LoyaltyClaim');
SELECT pg_temp._copy_tenant_table('MenuItemCrossSell');
SELECT pg_temp._copy_tenant_table('MenuItemIngredient');
SELECT pg_temp._copy_tenant_table('MenuItemLocation');
SELECT pg_temp._copy_tenant_table('MenuItemUpsell');
SELECT pg_temp._copy_tenant_table('Modifier');
SELECT pg_temp._copy_tenant_table('MysteryBoxOpen');
SELECT pg_temp._copy_tenant_table('NotificationPreference');
SELECT pg_temp._copy_tenant_table('OptionGroupItem');
SELECT pg_temp._copy_tenant_table('Order');
SELECT pg_temp._copy_tenant_table('PointsTransaction');
SELECT pg_temp._copy_tenant_table('SavedBuilderDesign');
SELECT pg_temp._copy_tenant_table('ScratchReward');
SELECT pg_temp._copy_tenant_table('SpinAttempt');
SELECT pg_temp._copy_tenant_table('WebhookLog');
SELECT pg_temp._copy_tenant_table('Invoice');
SELECT pg_temp._copy_tenant_table('OrderItem');
SELECT pg_temp._copy_tenant_table('Payment');

-- 4) Doğrulama — staging vs public satır sayısı (fark olan tablolar listelenir)
DO $$
DECLARE r record; s bigint; d bigint; tid text := current_setting('cutover.tid');
BEGIN
  FOR r IN SELECT unnest(ARRAY['Achievement', 'ActivityLog', 'AnalyticsEvent', 'BillingTransaction', 'BuilderBase', 'BuilderIngredient', 'Campaign', 'Category', 'Coupon', 'CourierLocation', 'DailyReport', 'ExpenseCategory', 'Location', 'LoyaltyProgram', 'LoyaltyTier', 'Membership', 'MysteryBoxConfig', 'OptionGroup', 'PizzaGameScore', 'PrintJob', 'Printer', 'RawMaterial', 'Session', 'Settings', 'SpinWheelConfig', 'StoredCard', 'Subscription', 'WhatsAppMessage', 'BundleDeal', 'Customer', 'Expense', 'HappyHour', 'IntegrationPartner', 'MenuItem', 'PushNotification', 'Table', 'Address', 'BundleItem', 'BundleOptionGroup', 'BundleOptionGroupAssignment', 'CouponUsage', 'CustomerAchievement', 'CustomerLoyaltyProgress', 'CustomerOrder', 'DeviceToken', 'FavoriteItem', 'HappyHourItem', 'LoyaltyClaim', 'MenuItemCrossSell', 'MenuItemIngredient', 'MenuItemLocation', 'MenuItemUpsell', 'Modifier', 'MysteryBoxOpen', 'NotificationPreference', 'OptionGroupItem', 'Order', 'PointsTransaction', 'SavedBuilderDesign', 'ScratchReward', 'SpinAttempt', 'WebhookLog', 'Invoice', 'OrderItem', 'Payment']) AS t LOOP
    -- Eski dump'ta olmayan (yeni) tablolar atlanır — abort etme
    IF to_regclass('staging."' || r.t || '"') IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT count(*) FROM staging.%I', r.t) INTO s;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE "tenantId" = %L', r.t, tid) INTO d;
    IF s <> d THEN RAISE WARNING 'SAYIM FARKI %: staging=% public=%', r.t, s, d; END IF;
  END LOOP;
  RAISE NOTICE 'Doğrulama tamam.';
END $$;

COMMIT;
