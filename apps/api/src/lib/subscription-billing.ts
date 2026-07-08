// ============================================================================
// Abonelik yaşam döngüsü — yenileme (kart saklama), grace, otomatik askıya alma.
// ============================================================================
// Kural: currentPeriodEnd geçen + autoRenew açık abonelikler saklı kartla çekilir.
//   - Başarılı → dönem uzatılır, failedAttempts sıfırlanır, status ACTIVE.
//   - Başarısız → failedAttempts++, status PAST_DUE (grace). GRACE_MAX aşılınca
//     status EXPIRED + tenant SUSPENDED (erişim 402).
// Deneme (TRIAL) süresi biten, saklı kartı olmayan tenant → SUSPENDED.

import { PrismaClient, BillingCycle, SubscriptionStatus, TenantStatus, BillingTransactionType } from '@prisma/client';
import { platformDb } from './tenant-db';
import { chargeStoredCard, retrieveSubscription } from './platform-iyzico';
import { invalidatePlanCache } from './plan-limits';
import {
  sendPlatformMail,
  paymentReceiptTemplate,
  paymentFailedTemplate,
  subscriptionCancelledTemplate,
  trialReminderTemplate,
  trialEndedTemplate,
} from './mailer';

const GRACE_MAX_ATTEMPTS = 3; // 3 başarısız denemeden sonra askıya al

// ── Billing mailleri (P4-P8) ─────────────────────────────────────────
// Owner e-postasını çözüp OtOrder şablonuyla gönderir. Fire-and-forget:
// mail hatası faturalama akışını asla durdurmaz.
export async function sendBillingMail(
  prisma: PrismaClient,
  tenantId: string,
  kind: 'receipt' | 'failed' | 'cancelled' | 'trialReminder' | 'trialEnded',
  extra: { planName?: string; amount?: number; periodEnd?: Date | null; daysLeft?: number } = {},
): Promise<void> {
  try {
    const [tenant, owner] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, subdomain: true } }),
      prisma.membership.findFirst({
        where: { tenantId, role: 'OWNER' },
        include: { user: { select: { email: true } } },
      }),
    ]);
    const to = owner?.user?.email;
    if (!tenant || !to || to.endsWith('.local')) return; // test/sentetik adreslere gönderme
    const billingUrl = `https://${tenant.subdomain}.${process.env.PLATFORM_BASE_DOMAIN || 'otorder.com'}/pos/billing`;
    const periodEndStr = extra.periodEnd ? new Date(extra.periodEnd).toLocaleDateString('tr-TR') : '';

    const mails = {
      receipt: {
        subject: `Ödemen alındı — ${extra.planName || 'abonelik'} aktif ✅`,
        html: paymentReceiptTemplate({
          restaurantName: tenant.name,
          planName: extra.planName || 'Abonelik',
          amount: (extra.amount ?? 0).toLocaleString('tr-TR'),
          periodEnd: periodEndStr,
          billingUrl,
        }),
        template: 'billing-receipt',
      },
      failed: {
        subject: 'Abonelik ödemen alınamadı ⚠️',
        html: paymentFailedTemplate({ restaurantName: tenant.name, billingUrl }),
        template: 'billing-failed',
      },
      cancelled: {
        subject: 'Aboneliğin iptal edildi',
        html: subscriptionCancelledTemplate({ restaurantName: tenant.name, periodEnd: periodEndStr || 'dönem sonu', billingUrl }),
        template: 'billing-cancelled',
      },
      trialReminder: {
        subject: `⏳ Deneme süren ${extra.daysLeft ?? 2} gün sonra bitiyor`,
        html: trialReminderTemplate({ restaurantName: tenant.name, daysLeft: extra.daysLeft ?? 2, billingUrl }),
        template: 'trial-reminder',
      },
      trialEnded: {
        subject: 'Deneme süren doldu — ödemeyle hemen devam et',
        html: trialEndedTemplate({ restaurantName: tenant.name, billingUrl }),
        template: 'trial-ended',
      },
    } as const;

    const m = mails[kind];
    await sendPlatformMail(prisma, { to, subject: m.subject, html: m.html, template: m.template });
  } catch (err: any) {
    console.error('📧 billing mail failed:', err?.message);
  }
}

export function addPeriod(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  if (cycle === 'ANNUAL') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// Başarılı ödeme sonrası aboneliği ACTIVE'e çek + dönemi uzat (tenant ACTIVE).
export async function activateSubscription(
  tenantId: string,
  opts: { planId?: string; cycle?: BillingCycle } = {},
): Promise<void> {
  const sub = await platformDb.subscription.findUnique({ where: { tenantId } });
  if (!sub) return;
  const cycle = opts.cycle ?? sub.cycle;
  const now = new Date();
  await platformDb.subscription.update({
    where: { tenantId },
    data: {
      status: SubscriptionStatus.ACTIVE,
      planId: opts.planId ?? sub.planId,
      cycle,
      currentPeriodStart: now,
      currentPeriodEnd: addPeriod(now, cycle),
      failedAttempts: 0,
      lastFailedAt: null,
    },
  });
  await platformDb.tenant.update({ where: { id: tenantId }, data: { status: TenantStatus.ACTIVE } });
  invalidatePlanCache(tenantId);
}

// Tek bir aboneliği saklı kartla çek + sonucu işle. Döner: başarı mı?
export async function chargeAndRenew(tenantId: string): Promise<boolean> {
  const sub = await platformDb.subscription.findUnique({
    where: { tenantId },
    include: { plan: true, tenant: true },
  });
  if (!sub || !sub.plan) return false;

  const price = sub.cycle === 'ANNUAL' ? Number(sub.plan.annualPrice) : Number(sub.plan.monthlyPrice);

  // Ücretsiz plan → çekim yok, direkt uzat
  if (price <= 0) {
    await activateSubscription(tenantId);
    return true;
  }

  const card = await platformDb.storedCard.findFirst({
    where: { tenantId, isDefault: true },
  });
  const owner = await platformDb.membership.findFirst({
    where: { tenantId, role: 'OWNER' },
    include: { user: true },
  });

  if (!card || !sub.iyzicoCardUserKey || !owner) {
    // Ödeme aracı yok → başarısız muamelesi
    await recordFailure(tenantId, sub.failedAttempts, 'Saklı kart yok');
    return false;
  }

  const result = await chargeStoredCard({
    buyer: { tenantId, email: owner.user.email, name: owner.user.name, phone: owner.user.phone ?? undefined },
    amount: price,
    cardUserKey: sub.iyzicoCardUserKey,
    cardToken: card.iyzicoToken,
    planName: sub.plan.name,
  });

  const periodStart = new Date();
  const periodEnd = addPeriod(periodStart, sub.cycle);

  await platformDb.billingTransaction.create({
    data: {
      tenantId,
      type: BillingTransactionType.SUBSCRIPTION_PAYMENT,
      amount: price,
      success: result.success,
      errorMessage: result.errorMessage,
      iyzicoPaymentId: result.paymentId,
      periodStart,
      periodEnd,
    },
  });

  if (result.success) {
    await activateSubscription(tenantId);
    return true;
  }
  await recordFailure(tenantId, sub.failedAttempts, result.errorMessage ?? 'Ödeme reddedildi');
  return false;
}

export async function recordFailure(tenantId: string, prevAttempts: number, _msg: string): Promise<void> {
  const attempts = prevAttempts + 1;
  const suspend = attempts >= GRACE_MAX_ATTEMPTS;
  await platformDb.subscription.update({
    where: { tenantId },
    data: {
      failedAttempts: attempts,
      lastFailedAt: new Date(),
      status: suspend ? SubscriptionStatus.EXPIRED : SubscriptionStatus.PAST_DUE,
    },
  });
  await platformDb.tenant.update({
    where: { id: tenantId },
    data: { status: suspend ? TenantStatus.SUSPENDED : TenantStatus.PAST_DUE },
  });
  // P7 ödeme başarısız maili (fire-and-forget)
  sendBillingMail(platformDb as PrismaClient, tenantId, 'failed').catch(() => {});
  invalidatePlanCache(tenantId);
}

// iyzico Abonelik API'sinden gelen başarılı tahsilat (webhook / mutabakat) →
// dönemi uzat, ACTIVE'e çek, işlem kaydı at. NEXT_PERIOD plan değişikliği
// bekliyorsa (pendingPlanId) yeni dönemde uygular ve pending'i temizler.
export async function extendFromIyzico(
  prisma: PrismaClient,
  subscription: {
    id: string;
    tenantId: string;
    planId: string;
    cycle: BillingCycle;
    currentPeriodEnd: Date | null;
    pendingPlanId?: string | null;
    pendingCycle?: BillingCycle | null;
  },
  orderReferenceCode: string,
): Promise<void> {
  const now = new Date();
  const planId = subscription.pendingPlanId ?? subscription.planId;
  const cycle = subscription.pendingCycle ?? subscription.cycle;
  const periodStart = subscription.currentPeriodEnd ?? now;
  const periodEnd = addPeriod(periodStart, cycle);

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const amount = plan ? (cycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice)) : 0;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      planId,
      cycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      failedAttempts: 0,
      lastFailedAt: null,
      pendingPlanId: null,
      pendingCycle: null,
    },
  });
  await prisma.tenant.update({ where: { id: subscription.tenantId }, data: { status: TenantStatus.ACTIVE } });
  await prisma.billingTransaction.create({
    data: {
      tenantId: subscription.tenantId,
      type: BillingTransactionType.SUBSCRIPTION_PAYMENT,
      amount,
      success: true,
      iyzicoPaymentId: orderReferenceCode,
      periodStart,
      periodEnd,
    },
  });
  // P6 makbuz maili (fire-and-forget)
  sendBillingMail(prisma, subscription.tenantId, 'receipt', {
    planName: plan?.name,
    amount,
    periodEnd,
  }).catch(() => {});
  invalidatePlanCache(subscription.tenantId);
}

// Yenileme taraması — dönem sonu geçmiş, autoRenew açık, ACTIVE/PAST_DUE abonelikler.
// NOT: iyzico Abonelik API'sine bağlı abonelikler HARİÇ (yenilemeyi iyzico döndürür,
// webhook/mutabakat işler) — saklı kart çekimi yalnız legacy/SIMULATION yolu.
export async function runRenewalSweep(prisma: PrismaClient = platformDb as PrismaClient): Promise<{ charged: number; failed: number }> {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: {
      autoRenew: true,
      currentPeriodEnd: { lte: now },
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
      iyzicoSubscriptionReferenceCode: null,
    },
    select: { tenantId: true },
  });
  let charged = 0;
  let failed = 0;
  for (const s of due) {
    const ok = await chargeAndRenew(s.tenantId);
    if (ok) charged++;
    else failed++;
  }
  return { charged, failed };
}

// Deneme süresi biten, aboneliği ACTIVE olmayan tenant'ları askıya al.
export async function runTrialSweep(prisma: PrismaClient = platformDb as PrismaClient): Promise<number> {
  const now = new Date();
  const expired = await prisma.tenant.findMany({
    where: {
      status: TenantStatus.TRIAL,
      trialEndsAt: { lte: now },
    },
    select: { id: true, subscription: { select: { status: true } } },
  });
  let suspended = 0;
  for (const t of expired) {
    if (t.subscription?.status === SubscriptionStatus.ACTIVE) continue;
    await prisma.tenant.update({ where: { id: t.id }, data: { status: TenantStatus.SUSPENDED } });
    // P5: deneme bitti — kilit + ödeme linki maili
    sendBillingMail(prisma, t.id, 'trialEnded').catch(() => {});
    invalidatePlanCache(t.id);
    suspended++;
  }
  return suspended;
}

// Deneme hatırlatma taraması (P4) — bitişe ≤2 gün kalan TRIAL tenant'lara
// bir kez mail. Tekrarı EmailLog üzerinden engellenir (son 3 günde
// 'trial-reminder' gönderilmişse atla) — saatlik tick'te güvenle çalışır.
export async function runTrialReminderSweep(prisma: PrismaClient = platformDb as PrismaClient): Promise<number> {
  const now = Date.now();
  const soon = await prisma.tenant.findMany({
    where: {
      status: TenantStatus.TRIAL,
      trialEndsAt: { gt: new Date(now), lte: new Date(now + 2 * 864e5) },
    },
    select: { id: true, trialEndsAt: true },
  });
  let sent = 0;
  for (const t of soon) {
    const already = await prisma.emailLog.findFirst({
      where: { tenantId: t.id, template: 'trial-reminder', createdAt: { gt: new Date(now - 3 * 864e5) } },
      select: { id: true },
    });
    if (already) continue;
    const daysLeft = Math.max(1, Math.ceil((t.trialEndsAt!.getTime() - now) / 864e5));
    await sendBillingMail(prisma, t.id, 'trialReminder', { daysLeft });
    sent++;
  }
  return sent;
}

// iyzico mutabakat taraması — webhook kaçarsa emniyet ağı. Dönem sonu 6 saatten
// fazla geçmiş, iyzico'ya bağlı ACTIVE/PAST_DUE abonelikleri iyzico'dan sorgula:
//   ACTIVE → dönemi uzat (ödeme iyzico'da dönmüş, webhook kaçmış)
//   UNPAID → başarısızlık kaydet (grace akışı)
//   CANCELED/EXPIRED → EXPIRED + tenant SUSPENDED
export async function runIyzicoReconcileSweep(prisma: PrismaClient = platformDb as PrismaClient): Promise<{ reconciled: number; failed: number }> {
  const cutoff = new Date(Date.now() - 6 * 3600_000);
  const due = await prisma.subscription.findMany({
    where: {
      iyzicoSubscriptionReferenceCode: { not: null },
      currentPeriodEnd: { lt: cutoff },
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
    },
  });
  let reconciled = 0;
  let failed = 0;
  for (const sub of due) {
    try {
      const remote = await retrieveSubscription(sub.iyzicoSubscriptionReferenceCode!);
      const status = String(remote.status || '').toUpperCase();
      if (status === 'ACTIVE') {
        // orderReferenceCode işareti benzersiz → webhook idempotency ile çakışmaz
        await extendFromIyzico(prisma, sub, `reconcile-${sub.id}-${Date.now()}`);
        reconciled++;
      } else if (status === 'UNPAID') {
        await recordFailure(sub.tenantId, sub.failedAttempts, 'iyzico mutabakat: UNPAID');
        failed++;
      } else if (status === 'CANCELED' || status === 'CANCELLED' || status === 'EXPIRED') {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: SubscriptionStatus.EXPIRED } });
        await prisma.tenant.update({ where: { id: sub.tenantId }, data: { status: TenantStatus.SUSPENDED } });
        invalidatePlanCache(sub.tenantId);
        failed++;
      }
    } catch {
      // Tek tenant'ın hatası taramayı durdurmasın
      failed++;
    }
  }
  return { reconciled, failed };
}

// main.ts scheduler'ı — saatte bir yenileme + iyzico mutabakatı + deneme taraması.
export function startBillingScheduler(prisma: PrismaClient, log: (msg: string, err?: unknown) => void): void {
  const tick = async () => {
    try {
      const r = await runRenewalSweep(prisma);
      const rec = await runIyzicoReconcileSweep(prisma);
      const s = await runTrialSweep(prisma);
      const rem = await runTrialReminderSweep(prisma);
      if (r.charged || r.failed || rec.reconciled || rec.failed || s || rem) {
        log(`[billing] yenileme ok=${r.charged} fail=${r.failed}, iyzico-mutabakat ok=${rec.reconciled} fail=${rec.failed}, deneme-askı=${s}, deneme-hatırlatma=${rem}`);
      }
    } catch (e) {
      log('[billing] tick hatası', e);
    }
  };
  setInterval(tick, 3600_000); // saatte bir
  setTimeout(tick, 90_000); // başlangıçta 90 sn sonra ilk tick
}
