// ============================================================================
// Abonelik & faturalama — /api/platform/billing/* (OWNER token gerekli).
// ============================================================================
// Plan listesi (public), mevcut abonelik, kart saklama, plan seç/abone ol, iptal.
// Ödeme: platform iyzico (kart saklama + otomatik yenileme; subscription-billing).

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BillingCycle, Plan, SubscriptionStatus, TenantStatus, BillingTransactionType } from '@prisma/client';
import { platformDb } from '../../lib/tenant-db';
import { verifyOwner, OwnerToken } from '../../lib/platform-auth';
import {
  storeCard,
  CardInput,
  isSimulated,
  fakeRef,
  initializeSubscriptionCheckout,
  retrieveCheckoutResult,
  cancelIyzicoSubscription,
  upgradeIyzicoSubscription,
  verifyWebhookSignatureV3,
  initializePaymentCheckout,
  retrievePaymentResult,
} from '../../lib/platform-iyzico';
import {
  activateSubscription,
  chargeAndRenew,
  addPeriod,
  extendFromIyzico,
  recordFailure,
  sendBillingMail,
} from '../../lib/subscription-billing';
import { invalidatePlanCache } from '../../lib/plan-limits';

// Plan + döngü → iyzico pricingPlanReferenceCode. Gerçek modda bağlı değilse null
// (409 PLAN_NOT_LINKED); SIMÜLASYON'da deterministik sahte referans üretilir.
function resolvePricingRef(plan: Plan, cycle: BillingCycle): string | null {
  const ref = cycle === 'ANNUAL' ? plan.iyzicoAnnualRefCode : plan.iyzicoMonthlyRefCode;
  if (ref) return ref;
  if (isSimulated()) return fakeRef('pp', `${plan.key}-${cycle}`);
  return null;
}

// Ödeme sonrası kullanıcının döneceği sayfa (checkout callback redirect'i).
function billingReturnUrl(tenant?: { subdomain: string } | null): string {
  if (process.env.PLATFORM_BILLING_RETURN_URL) return process.env.PLATFORM_BILLING_RETURN_URL;
  if (tenant?.subdomain) return `https://${tenant.subdomain}.otorder.com/pos/billing`;
  return 'https://otorder.com';
}

// Ekstralar — tek seferlik satın alınan modüller. Fiyatın kaynağı BURASI
// (frontend yalnız gösterir). bundle = ikisi + 1 yıllık Pro hediye.
const ADDONS: Record<string, { title: string; price: number; grants: Array<'landing' | 'mobileApp'>; giftProYear?: boolean }> = {
  landing: { title: 'Özel Tasarım Landing Page', price: 24999, grants: ['landing'] },
  mobile: { title: 'Markalı Mobil Uygulama', price: 24999, grants: ['mobileApp'] },
  bundle: { title: 'Kuruluş Paketi (Landing + Mobil App + 1 yıl Pro)', price: 44999, grants: ['landing', 'mobileApp'], giftProYear: true },
};

async function getAddonState(tenantId: string): Promise<Record<string, any>> {
  const row = await platformDb.settings.findFirst({ where: { tenantId, key: 'addons' } });
  return (row?.value as Record<string, any>) ?? {};
}

// Satın alımı uygula: addons Settings'ine işle, işlem kaydı yaz, bundle ise
// 1 yıllık Pro hediyesini aktive et, makbuz mailini gönder.
async function applyAddonPurchase(tenantId: string, addonKey: string, token: string): Promise<void> {
  const addon = ADDONS[addonKey];
  const now = new Date();
  const state = await getAddonState(tenantId);
  for (const g of addon.grants) {
    if (!state[g]) state[g] = { purchasedAt: now.toISOString(), via: addonKey };
  }
  await platformDb.settings.upsert({
    where: { tenantId_key: { tenantId, key: 'addons' } },
    update: { value: state },
    create: { tenantId, key: 'addons', value: state },
  });

  let periodEnd: Date | null = null;
  if (addon.giftProYear) {
    const pro = await platformDb.plan.findUnique({ where: { key: 'PRO' } });
    if (pro) {
      periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      await platformDb.subscription.update({
        where: { tenantId },
        data: {
          planId: pro.id,
          cycle: BillingCycle.ANNUAL,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          failedAttempts: 0,
          lastFailedAt: null,
        },
      });
      await platformDb.tenant.update({ where: { id: tenantId }, data: { status: TenantStatus.ACTIVE } });
      invalidatePlanCache(tenantId);
    }
  }

  await platformDb.billingTransaction.create({
    data: {
      tenantId,
      type: BillingTransactionType.SUBSCRIPTION_PAYMENT,
      amount: addon.price,
      success: true,
      iyzicoPaymentId: token,
      iyzicoConversationId: `addon:${addonKey}`,
      periodStart: now,
      periodEnd,
    },
  });
  sendBillingMail(platformDb, tenantId, 'receipt', { planName: addon.title, amount: addon.price, periodEnd }).catch(() => {});
}

export default async function billingRoutes(server: FastifyInstance) {
  // Plan listesi — PUBLIC (fiyatlandırma sayfası). Auth yok.
  server.get('/billing/plans', async () => {
    const plans = await platformDb.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      plans: plans.map((p) => ({
        key: p.key,
        name: p.name,
        monthlyPrice: Number(p.monthlyPrice),
        annualPrice: Number(p.annualPrice),
        maxLocations: p.maxLocations,
        maxUsers: p.maxUsers,
        features: p.features,
      })),
    };
  });

  // iyzico checkout dönüşü — PUBLIC (iyzico form POST'u; @fastify/formbody kayıtlı).
  // Token'ı body'den (form) ya da query'den al; pendingCheckoutToken ile eşleştir.
  server.post('/billing/checkout-callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as { token?: string };
    const query = (request.query ?? {}) as { token?: string };
    const token = body.token || query.token;
    if (!token) return reply.redirect(`${billingReturnUrl(null)}?billing=notfound`, 302);

    const sub = await platformDb.subscription.findFirst({
      where: { pendingCheckoutToken: String(token) },
      include: { tenant: true, plan: true },
    });
    if (!sub) return reply.redirect(`${billingReturnUrl(null)}?billing=notfound`, 302);
    const returnUrl = billingReturnUrl(sub.tenant);

    let result: Awaited<ReturnType<typeof retrieveCheckoutResult>>;
    try {
      result = await retrieveCheckoutResult(String(token));
    } catch (e) {
      request.log.error(e, '[billing] checkout sonucu alınamadı');
      return reply.redirect(`${returnUrl}?billing=failed`, 302);
    }

    if (result.subscriptionStatus !== 'ACTIVE') {
      return reply.redirect(`${returnUrl}?billing=failed`, 302);
    }

    const planId = sub.pendingPlanId ?? sub.planId;
    const cycle = sub.pendingCycle ?? sub.cycle;
    const plan = planId === sub.planId ? sub.plan : await platformDb.plan.findUnique({ where: { id: planId } });
    const price = plan ? (cycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice)) : 0;
    const now = new Date();
    const periodEnd = addPeriod(now, cycle);

    await platformDb.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        planId,
        cycle,
        iyzicoSubscriptionReferenceCode: result.referenceCode,
        iyzicoCustomerReferenceCode: result.customerReferenceCode,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        failedAttempts: 0,
        lastFailedAt: null,
        pendingCheckoutToken: null,
        pendingPlanId: null,
        pendingCycle: null,
      },
    });
    await platformDb.tenant.update({ where: { id: sub.tenantId }, data: { status: TenantStatus.ACTIVE } });
    await platformDb.billingTransaction.create({
      data: {
        tenantId: sub.tenantId,
        type: BillingTransactionType.SUBSCRIPTION_PAYMENT,
        amount: price,
        success: true,
        iyzicoConversationId: String(token),
        periodStart: now,
        periodEnd,
      },
    });
    // P6 makbuz maili (fire-and-forget)
    sendBillingMail(platformDb, sub.tenantId, 'receipt', { planName: plan?.name, amount: price, periodEnd }).catch(() => {});
    invalidatePlanCache(sub.tenantId);
    return reply.redirect(`${returnUrl}?billing=success`, 302);
  });

  // Ekstra satın alımı checkout dönüşü — PUBLIC (iyzico form POST'u).
  // Bekleyen kayıt Settings['addonCheckout'] ile eşleştirilir; sonuç iyzico'dan
  // sorgulanır (client verisine güvenilmez). Idempotent: token ikinci kez işlenmez.
  server.post('/billing/addon-callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as { token?: string };
    const query = (request.query ?? {}) as { token?: string };
    const token = String(body.token || query.token || '');
    if (!token) return reply.redirect(`${billingReturnUrl(null)}?billing=notfound`, 302);

    const pending = await platformDb.settings.findFirst({
      where: { key: 'addonCheckout', value: { path: ['token'], equals: token } },
    });
    if (!pending) return reply.redirect(`${billingReturnUrl(null)}?billing=notfound`, 302);
    const addonKey = String((pending.value as any)?.addon || '');
    const tenant = await platformDb.tenant.findUnique({ where: { id: pending.tenantId } });
    const returnUrl = billingReturnUrl(tenant);
    if (!ADDONS[addonKey]) return reply.redirect(`${returnUrl}?billing=addon-failed`, 302);

    // Idempotency — aynı token'la ikinci çağrı yeniden uygulamaz
    const existing = await platformDb.billingTransaction.findFirst({
      where: { iyzicoPaymentId: token },
      select: { id: true },
    });
    if (existing) return reply.redirect(`${returnUrl}?billing=addon-success`, 302);

    let result: Awaited<ReturnType<typeof retrievePaymentResult>>;
    try {
      result = await retrievePaymentResult(token);
    } catch (e) {
      request.log.error(e, '[billing] ekstra ödeme sonucu alınamadı');
      return reply.redirect(`${returnUrl}?billing=addon-failed`, 302);
    }
    if (!result.paid) return reply.redirect(`${returnUrl}?billing=addon-failed`, 302);

    await applyAddonPurchase(pending.tenantId, addonKey, token);
    await platformDb.settings.delete({ where: { id: pending.id } }).catch(() => {});
    return reply.redirect(`${returnUrl}?billing=addon-success`, 302);
  });

  // iyzico abonelik webhook'u — PUBLIC. İmza geçersizse İŞLEME ama 200 dön
  // (iyzico'nun retry'ını tüketme). Idempotency: orderReferenceCode zaten
  // işlenmişse tekrar işlem yaratma.
  server.post('/billing/iyzico-webhook', async (request: FastifyRequest) => {
    const body = (request.body ?? {}) as {
      iyziEventType?: string;
      subscriptionReferenceCode?: string;
      orderReferenceCode?: string;
      customerReferenceCode?: string;
      iyziEventTime?: number;
    };
    const signature = request.headers['x-iyz-signature-v3'] as string | undefined;
    if (!verifyWebhookSignatureV3(signature, body)) {
      request.log.warn({ iyziEventType: body.iyziEventType }, '[billing] iyzico webhook imzası geçersiz — işlenmedi');
      return { received: true };
    }

    // Idempotency — aynı orderReferenceCode ikinci kez gelirse işleme.
    if (body.orderReferenceCode) {
      const existing = await platformDb.billingTransaction.findFirst({
        where: { iyzicoPaymentId: body.orderReferenceCode },
        select: { id: true },
      });
      if (existing) return { received: true };
    }

    const sub = body.subscriptionReferenceCode
      ? await platformDb.subscription.findUnique({
          where: { iyzicoSubscriptionReferenceCode: body.subscriptionReferenceCode },
          include: { plan: true },
        })
      : null;
    if (!sub) {
      request.log.warn({ ref: body.subscriptionReferenceCode }, '[billing] iyzico webhook: abonelik bulunamadı');
      return { received: true };
    }

    const eventType = String(body.iyziEventType || '').toLowerCase();
    const orderRef = body.orderReferenceCode || `webhook-${sub.id}-${Date.now()}`;

    if (eventType.includes('success')) {
      await extendFromIyzico(platformDb, sub, orderRef); // P6 makbuz maili extendFromIyzico içinde
    } else if (eventType.includes('fail')) {
      await recordFailure(sub.tenantId, sub.failedAttempts, `iyzico webhook: ${body.iyziEventType}`);
      const price = sub.cycle === 'ANNUAL' ? Number(sub.plan.annualPrice) : Number(sub.plan.monthlyPrice);
      await platformDb.billingTransaction.create({
        data: {
          tenantId: sub.tenantId,
          type: BillingTransactionType.SUBSCRIPTION_PAYMENT,
          amount: price,
          success: false,
          errorMessage: `iyzico webhook: ${body.iyziEventType}`,
          iyzicoPaymentId: orderRef,
        },
      });
      // P7 ödeme başarısız maili recordFailure içinde gönderilir
    }
    return { received: true };
  });

  // --- Aşağısı OWNER token gerektirir ---
  server.register(async (authed) => {
    authed.addHook('preHandler', verifyOwner);

    authed.get('/billing/subscription', async (request: FastifyRequest) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const sub = await platformDb.subscription.findUnique({
        where: { tenantId: owner.tenantId },
        include: { plan: true },
      });
      const cards = await platformDb.storedCard.findMany({
        where: { tenantId: owner.tenantId },
        select: { id: true, lastFour: true, cardBrand: true, isDefault: true, expireMonth: true, expireYear: true },
      });
      const tenant = await platformDb.tenant.findUnique({
        where: { id: owner.tenantId },
        select: { status: true, trialEndsAt: true },
      });
      const addons = await getAddonState(owner.tenantId);
      return {
        subscription: sub && {
          status: sub.status,
          cycle: sub.cycle,
          currentPeriodEnd: sub.currentPeriodEnd,
          autoRenew: sub.autoRenew,
          failedAttempts: sub.failedAttempts,
          plan: { key: sub.plan.key, name: sub.plan.name },
        },
        tenant,
        cards,
        addons,
      };
    });

    // Ekstra satın alma checkout'u başlat (landing | mobile | bundle) —
    // tek seferlik iyzico ödemesi; dönüş addon-callback'e POST'lanır.
    authed.post('/billing/addon-checkout', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const { addon } = request.body as { addon?: string };
      const def = addon ? ADDONS[addon] : undefined;
      if (!addon || !def) return reply.status(400).send({ error: 'Geçersiz ekstra' });

      const state = await getAddonState(owner.tenantId);
      if (def.grants.every((g) => !!state[g])) {
        return reply.status(409).send({ error: 'Bu ekstra zaten satın alınmış', code: 'ALREADY_OWNED' });
      }

      const [membership, tenant] = await Promise.all([
        platformDb.membership.findFirst({ where: { tenantId: owner.tenantId, role: 'OWNER' }, include: { user: true } }),
        platformDb.tenant.findUnique({ where: { id: owner.tenantId } }),
      ]);
      if (!membership || !tenant) return reply.status(404).send({ error: 'Tenant bulunamadı' });
      const user = membership.user;
      const nameParts = (user.name || 'Owner').trim().split(/\s+/);
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];

      const callbackUrl = `${process.env.PLATFORM_PUBLIC_API_URL || 'https://api.otorder.com'}/api/platform/billing/addon-callback`;
      let checkout: Awaited<ReturnType<typeof initializePaymentCheckout>>;
      try {
        checkout = await initializePaymentCheckout({
          conversationId: `addon-${addon}-${owner.tenantId}-${Date.now()}`,
          price: def.price,
          basketItemName: `OtOrder ${def.title}`,
          callbackUrl,
          buyer: {
            id: owner.tenantId,
            name: firstName,
            surname,
            email: user.email,
            gsmNumber: user.phone || '+905000000000',
            address: tenant.name,
            city: 'İstanbul',
          },
        });
      } catch (e: any) {
        return reply.status(502).send({ error: e?.message || 'iyzico ödeme başlatılamadı' });
      }

      // Bekleyen satın alım — callback token'la bulur (tenant başına tek bekleyen)
      await platformDb.settings.upsert({
        where: { tenantId_key: { tenantId: owner.tenantId, key: 'addonCheckout' } },
        update: { value: { token: checkout.token, addon, at: new Date().toISOString() } },
        create: { tenantId: owner.tenantId, key: 'addonCheckout', value: { token: checkout.token, addon, at: new Date().toISOString() } },
      });
      return { checkoutFormContent: checkout.checkoutFormContent, token: checkout.token, simulated: isSimulated() };
    });

    authed.get('/billing/transactions', async (request: FastifyRequest) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const txs = await platformDb.billingTransaction.findMany({
        where: { tenantId: owner.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { transactions: txs.map((t) => ({ ...t, amount: Number(t.amount) })) };
    });

    // Kart sakla (iyzico cardUserKey + token). SIMÜLASYON'da anahtar üretilir.
    authed.post('/billing/card', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const card = request.body as CardInput;
      if (!card?.cardNumber || !card.expireMonth || !card.expireYear || !card.cardHolderName) {
        return reply.status(400).send({ error: 'Kart bilgileri eksik' });
      }
      const membership = await platformDb.membership.findFirst({
        where: { tenantId: owner.tenantId, role: 'OWNER' },
        include: { user: true },
      });
      const sub = await platformDb.subscription.findUnique({ where: { tenantId: owner.tenantId } });

      const result = await storeCard(
        card,
        {
          tenantId: owner.tenantId,
          email: membership?.user.email ?? 'owner@otorder.com',
          name: membership?.user.name ?? 'Owner',
          phone: membership?.user.phone ?? undefined,
        },
        sub?.iyzicoCardUserKey ?? undefined,
      );
      if (!result.success || !result.cardToken) {
        return reply.status(402).send({ error: result.errorMessage || 'Kart saklanamadı' });
      }

      const last4 = card.cardNumber.replace(/\s/g, '').slice(-4);
      // Yeni kartı varsayılan yap, eskileri sıfırla
      await platformDb.storedCard.updateMany({ where: { tenantId: owner.tenantId }, data: { isDefault: false } });
      const stored = await platformDb.storedCard.create({
        data: {
          tenantId: owner.tenantId,
          iyzicoToken: result.cardToken,
          lastFour: last4,
          cardHolder: card.cardHolderName,
          expireMonth: card.expireMonth,
          expireYear: card.expireYear,
          isDefault: true,
        },
      });
      if (result.cardUserKey) {
        await platformDb.subscription.update({
          where: { tenantId: owner.tenantId },
          data: { iyzicoCardUserKey: result.cardUserKey },
        });
      }
      return {
        success: true,
        simulated: result.simulated,
        card: { id: stored.id, lastFour: last4, isDefault: true },
      };
    });

    // iyzico Abonelik checkout formu başlat (ücretli planların GERÇEK satış yolu).
    // Ücretsiz plan iyzico'suz direkt aktive edilir. Dönen checkoutFormContent
    // frontend'de gösterilir; ödeme sonrası iyzico checkout-callback'e POST'lar.
    authed.post('/billing/subscribe-checkout', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const { planKey, cycle } = request.body as { planKey?: string; cycle?: BillingCycle };
      const plan = await platformDb.plan.findUnique({ where: { key: (planKey || '').toUpperCase() } });
      if (!plan) return reply.status(400).send({ error: 'Geçersiz paket' });
      const useCycle: BillingCycle = cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
      const price = useCycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice);

      // Ücretsiz plan → iyzico'suz aktive et (subscribe'daki ücretsiz dalıyla aynı)
      if (price <= 0) {
        await platformDb.subscription.update({
          where: { tenantId: owner.tenantId },
          data: { planId: plan.id, cycle: useCycle },
        });
        invalidatePlanCache(owner.tenantId);
        await activateSubscription(owner.tenantId, { planId: plan.id, cycle: useCycle });
        const updated = await platformDb.subscription.findUnique({
          where: { tenantId: owner.tenantId },
          include: { plan: true },
        });
        return {
          success: true,
          free: true,
          subscription: {
            status: updated!.status,
            cycle: updated!.cycle,
            currentPeriodEnd: updated!.currentPeriodEnd,
            plan: { key: updated!.plan.key, name: updated!.plan.name },
          },
        };
      }

      const pricingRef = resolvePricingRef(plan, useCycle);
      if (!pricingRef) {
        return reply.status(409).send({ error: "Plan iyzico'ya bağlanmamış", code: 'PLAN_NOT_LINKED' });
      }

      const [membership, tenant] = await Promise.all([
        platformDb.membership.findFirst({ where: { tenantId: owner.tenantId, role: 'OWNER' }, include: { user: true } }),
        platformDb.tenant.findUnique({ where: { id: owner.tenantId } }),
      ]);
      if (!membership || !tenant) return reply.status(404).send({ error: 'Tenant bulunamadı' });
      const user = membership.user;
      const nameParts = (user.name || 'Owner').trim().split(/\s+/);
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];

      const callbackUrl = `${process.env.PLATFORM_PUBLIC_API_URL || 'https://api.otorder.com'}/api/platform/billing/checkout-callback`;
      let checkout: Awaited<ReturnType<typeof initializeSubscriptionCheckout>>;
      try {
        checkout = await initializeSubscriptionCheckout({
          pricingPlanReferenceCode: pricingRef,
          callbackUrl,
          customer: {
            name: firstName,
            surname,
            email: user.email,
            gsmNumber: user.phone || '+905000000000',
            identityNumber: '11111111111',
            billingAddress: { contactName: user.name, city: 'İstanbul', country: 'Türkiye', address: tenant.name },
          },
        });
      } catch (e: any) {
        return reply.status(502).send({ error: e?.message || 'iyzico checkout başlatılamadı' });
      }

      await platformDb.subscription.update({
        where: { tenantId: owner.tenantId },
        data: { pendingCheckoutToken: checkout.token, pendingPlanId: plan.id, pendingCycle: useCycle },
      });
      return { checkoutFormContent: checkout.checkoutFormContent, token: checkout.token, simulated: isSimulated() };
    });

    // Plan değişikliği (upgrade/downgrade) — iyzico Abonelik API'sine bağlı
    // aboneliklerde iyzico upgrade endpoint'i kullanılır (YENİ referans döner).
    // Fiyat artıyorsa NOW (hemen), düşüyorsa NEXT_PERIOD (yeni dönemde) uygulanır.
    authed.post('/billing/change-plan', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const { planKey, cycle } = request.body as { planKey?: string; cycle?: BillingCycle };
      const plan = await platformDb.plan.findUnique({ where: { key: (planKey || '').toUpperCase() } });
      if (!plan) return reply.status(400).send({ error: 'Geçersiz paket' });
      const useCycle: BillingCycle = cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

      const sub = await platformDb.subscription.findUnique({
        where: { tenantId: owner.tenantId },
        include: { plan: true },
      });
      if (!sub) return reply.status(404).send({ error: 'Abonelik bulunamadı' });

      if (!sub.iyzicoSubscriptionReferenceCode) {
        // iyzico'ya bağlı değil: SIMÜLASYON'da direkt değiştir, gerçekte önce abonelik gerek
        if (isSimulated()) {
          await platformDb.subscription.update({
            where: { tenantId: owner.tenantId },
            data: { planId: plan.id, cycle: useCycle },
          });
          invalidatePlanCache(owner.tenantId);
          await activateSubscription(owner.tenantId, { planId: plan.id, cycle: useCycle });
          return { success: true, upgradePeriod: 'NOW', simulated: true };
        }
        return reply.status(409).send({ error: 'Önce abonelik başlatın', code: 'NO_SUBSCRIPTION' });
      }

      const targetRef = resolvePricingRef(plan, useCycle);
      if (!targetRef) {
        return reply.status(409).send({ error: "Plan iyzico'ya bağlanmamış", code: 'PLAN_NOT_LINKED' });
      }

      const currentPrice = sub.cycle === 'ANNUAL' ? Number(sub.plan.annualPrice) : Number(sub.plan.monthlyPrice);
      const targetPrice = useCycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice);
      const upgradePeriod: 'NOW' | 'NEXT_PERIOD' = targetPrice > currentPrice ? 'NOW' : 'NEXT_PERIOD';

      let newRef: string;
      try {
        const up = await upgradeIyzicoSubscription(sub.iyzicoSubscriptionReferenceCode, {
          newPricingPlanReferenceCode: targetRef,
          upgradePeriod,
          resetRecurrenceCount: true,
        });
        newRef = up.referenceCode;
      } catch (e: any) {
        return reply.status(502).send({ error: e?.message || 'iyzico plan değişikliği başarısız' });
      }

      // Yeni referans + plan durumu TEK update ile (atomik) yazılır.
      const now = new Date();
      if (upgradePeriod === 'NOW') {
        await platformDb.subscription.update({
          where: { tenantId: owner.tenantId },
          data: {
            iyzicoSubscriptionReferenceCode: newRef,
            planId: plan.id,
            cycle: useCycle,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: addPeriod(now, useCycle),
            failedAttempts: 0,
            lastFailedAt: null,
            pendingPlanId: null,
            pendingCycle: null,
          },
        });
      } else {
        // NEXT_PERIOD: yeni dönemin webhook success'inde uygulanır (extendFromIyzico)
        await platformDb.subscription.update({
          where: { tenantId: owner.tenantId },
          data: { iyzicoSubscriptionReferenceCode: newRef, pendingPlanId: plan.id, pendingCycle: useCycle },
        });
      }
      invalidatePlanCache(owner.tenantId);
      await platformDb.billingTransaction.create({
        data: {
          tenantId: owner.tenantId,
          type: BillingTransactionType.SUBSCRIPTION_UPGRADE,
          amount: 0,
          success: true,
          errorMessage: `${sub.plan.key}/${sub.cycle} → ${plan.key}/${useCycle} (${upgradePeriod})`,
        },
      });

      const updated = await platformDb.subscription.findUnique({
        where: { tenantId: owner.tenantId },
        include: { plan: true },
      });
      return {
        success: true,
        upgradePeriod,
        subscription: {
          status: updated!.status,
          cycle: updated!.cycle,
          currentPeriodEnd: updated!.currentPeriodEnd,
          plan: { key: updated!.plan.key, name: updated!.plan.name },
        },
      };
    });

    // Plan seç + abone ol (ilk dönem tahsilatı + aktivasyon)
    // NOT: Gerçek modda ücretli plan satışı Abonelik API checkout'u ile yapılır
    // (subscribe-checkout) — saklı kart yolu legacy/SIMULATION içindir.
    authed.post('/billing/subscribe', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const { planKey, cycle } = request.body as { planKey?: string; cycle?: BillingCycle };
      const plan = await platformDb.plan.findUnique({ where: { key: (planKey || '').toUpperCase() } });
      if (!plan) return reply.status(400).send({ error: 'Geçersiz paket' });
      const useCycle: BillingCycle = cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
      const price = useCycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice);

      // Gerçek modda ücretli plan → checkout akışına yönlendir
      if (price > 0 && !isSimulated()) {
        return reply.status(409).send({ error: 'subscribe-checkout kullanın', code: 'USE_CHECKOUT' });
      }

      // Ücretli plan → saklı kart şart
      if (price > 0) {
        const card = await platformDb.storedCard.findFirst({ where: { tenantId: owner.tenantId, isDefault: true } });
        const sub = await platformDb.subscription.findUnique({ where: { tenantId: owner.tenantId } });
        if (!card || !sub?.iyzicoCardUserKey) {
          return reply.status(402).send({ error: 'Önce kart ekleyin', code: 'CARD_REQUIRED' });
        }
      }

      // planId'yi güncelle, sonra tahsil+aktive et (chargeAndRenew tekrar kullanılabilir
      // ama burada planı değiştirdiğimiz için activate + ilk çekim akışını sadeleştiriyoruz)
      await platformDb.subscription.update({
        where: { tenantId: owner.tenantId },
        data: { planId: plan.id, cycle: useCycle },
      });
      invalidatePlanCache(owner.tenantId);

      // İlk dönem: activateSubscription ücretsizde direkt uzatır; ücretlide
      // chargeAndRenew çağıralım ki saklı karttan çeksin.
      if (price > 0) {
        const ok = await chargeAndRenew(owner.tenantId);
        if (!ok) return reply.status(402).send({ error: 'İlk ödeme başarısız', code: 'PAYMENT_FAILED' });
      } else {
        await activateSubscription(owner.tenantId, { planId: plan.id, cycle: useCycle });
      }

      const updated = await platformDb.subscription.findUnique({
        where: { tenantId: owner.tenantId },
        include: { plan: true },
      });
      return {
        success: true,
        subscription: {
          status: updated!.status,
          cycle: updated!.cycle,
          currentPeriodEnd: updated!.currentPeriodEnd,
          plan: { key: updated!.plan.key, name: updated!.plan.name },
        },
      };
    });

    // Otomatik yenilemeyi iptal et (dönem sonuna kadar erişim sürer).
    // iyzico Abonelik API'sine bağlıysa önce iyzico tarafında iptal edilir.
    authed.post('/billing/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const sub = await platformDb.subscription.findUnique({ where: { tenantId: owner.tenantId } });
      if (sub?.iyzicoSubscriptionReferenceCode && !isSimulated()) {
        try {
          const r = await cancelIyzicoSubscription(sub.iyzicoSubscriptionReferenceCode);
          if (!r.success) {
            return reply.status(502).send({ error: 'iyzico iptali başarısız, tekrar deneyin' });
          }
        } catch {
          return reply.status(502).send({ error: 'iyzico iptali başarısız, tekrar deneyin' });
        }
      }
      await platformDb.subscription.update({
        where: { tenantId: owner.tenantId },
        data: { autoRenew: false, cancelledAt: new Date() },
      });
      // P8 iptal onayı maili (fire-and-forget)
      {
        const subNow = await platformDb.subscription.findUnique({ where: { tenantId: owner.tenantId } });
        sendBillingMail(platformDb, owner.tenantId, 'cancelled', { periodEnd: subNow?.currentPeriodEnd }).catch(() => {});
      }
      return { success: true, message: 'Otomatik yenileme kapatıldı' };
    });
  });
}
