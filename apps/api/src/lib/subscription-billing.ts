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
import { chargeStoredCard } from './platform-iyzico';
import { invalidatePlanCache } from './plan-limits';

const GRACE_MAX_ATTEMPTS = 3; // 3 başarısız denemeden sonra askıya al

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

async function recordFailure(tenantId: string, prevAttempts: number, _msg: string): Promise<void> {
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
  invalidatePlanCache(tenantId);
}

// Yenileme taraması — dönem sonu geçmiş, autoRenew açık, ACTIVE/PAST_DUE abonelikler.
export async function runRenewalSweep(prisma: PrismaClient = platformDb as PrismaClient): Promise<{ charged: number; failed: number }> {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: {
      autoRenew: true,
      currentPeriodEnd: { lte: now },
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
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
    invalidatePlanCache(t.id);
    suspended++;
  }
  return suspended;
}

// main.ts scheduler'ı — saatte bir yenileme + deneme taraması.
export function startBillingScheduler(prisma: PrismaClient, log: (msg: string, err?: unknown) => void): void {
  const tick = async () => {
    try {
      const r = await runRenewalSweep(prisma);
      const s = await runTrialSweep(prisma);
      if (r.charged || r.failed || s) log(`[billing] yenileme ok=${r.charged} fail=${r.failed}, deneme-askı=${s}`);
    } catch (e) {
      log('[billing] tick hatası', e);
    }
  };
  setInterval(tick, 3600_000); // saatte bir
  setTimeout(tick, 90_000); // başlangıçta 90 sn sonra ilk tick
}
