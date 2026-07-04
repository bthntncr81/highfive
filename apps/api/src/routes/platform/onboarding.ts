// ============================================================================
// Onboarding sihirbazı — /api/platform/onboarding/* (OWNER token gerekli).
// ============================================================================
// Adımlar: 1=hesap (signup'ta), 2=menü şablonu, 3=masa/QR, 4=iyzico(sipariş), 5=tamam.
// Her adım Tenant.onboardingStep'i ilerletir; final adım onboardingCompletedAt yazar.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { platformDb } from '../../lib/tenant-db';
import { dbFor } from '../../lib/tenant-db';
import { verifyOwner, OwnerToken } from '../../lib/platform-auth';

// Basit menü şablonları (pizza/pasta/sandwich odaklı) — onboarding hızlandırıcı.
const MENU_TEMPLATES: Record<string, Array<{ category: string; items: Array<{ name: string; price: number }> }>> = {
  pizza: [
    { category: 'Pizzalar', items: [
      { name: 'Margherita', price: 180 },
      { name: 'Sucuklu', price: 220 },
      { name: 'Karışık', price: 240 },
    ] },
    { category: 'İçecekler', items: [{ name: 'Kola', price: 40 }, { name: 'Ayran', price: 25 }] },
  ],
  pasta: [
    { category: 'Makarnalar', items: [
      { name: 'Napoliten', price: 160 },
      { name: 'Alfredo', price: 190 },
      { name: 'Bolonez', price: 200 },
    ] },
    { category: 'İçecekler', items: [{ name: 'Kola', price: 40 }, { name: 'Su', price: 15 }] },
  ],
  sandwich: [
    { category: 'Sandviçler', items: [
      { name: 'Tavuklu', price: 120 },
      { name: 'Kaşarlı', price: 110 },
    ] },
    { category: 'İçecekler', items: [{ name: 'Kola', price: 40 }] },
  ],
};

export default async function onboardingRoutes(server: FastifyInstance) {
  server.addHook('preHandler', verifyOwner);

  server.get('/onboarding/status', async (request: FastifyRequest) => {
    const owner = (request as any).platformOwner as OwnerToken;
    const tenant = await platformDb.tenant.findUnique({
      where: { id: owner.tenantId },
      select: { onboardingStep: true, onboardingCompletedAt: true, name: true, subdomain: true },
    });
    return { ...tenant, templates: Object.keys(MENU_TEMPLATES) };
  });

  // Menü şablonu uygula (adım 2)
  server.post('/onboarding/menu-template', async (request: FastifyRequest, reply: FastifyReply) => {
    const owner = (request as any).platformOwner as OwnerToken;
    const { template } = request.body as { template?: string };
    const tpl = MENU_TEMPLATES[(template || '').toLowerCase()];
    if (!tpl) return reply.status(400).send({ error: 'Geçersiz şablon', options: Object.keys(MENU_TEMPLATES) });

    const db = dbFor(owner.tenantId);
    let sort = 0;
    for (const cat of tpl) {
      const category = await db.category.create({ data: { name: cat.category, sortOrder: sort++ } });
      for (const item of cat.items) {
        await db.menuItem.create({
          data: { categoryId: category.id, name: item.name, price: item.price, available: true },
        });
      }
    }
    await platformDb.tenant.update({
      where: { id: owner.tenantId },
      data: { onboardingStep: Math.max(2, await currentStep(owner.tenantId)) },
    });
    return { success: true, categories: tpl.length };
  });

  // Masa/QR oluştur (adım 3)
  server.post('/onboarding/tables', async (request: FastifyRequest, reply: FastifyReply) => {
    const owner = (request as any).platformOwner as OwnerToken;
    const { count } = request.body as { count?: number };
    const n = Math.min(Math.max(Number(count) || 0, 0), 200);
    if (n <= 0) return reply.status(400).send({ error: 'Geçerli masa sayısı gerekli (1-200)' });

    const db = dbFor(owner.tenantId);
    const location = await db.location.findFirst({ where: { isDefault: true } });
    if (!location) return reply.status(400).send({ error: 'Varsayılan şube yok' });

    let created = 0;
    for (let i = 1; i <= n; i++) {
      try {
        await db.table.create({ data: { locationId: location.id, number: i, name: `Masa ${i}` } });
        created++;
      } catch { /* zaten var — atla */ }
    }
    await platformDb.tenant.update({
      where: { id: owner.tenantId },
      data: { onboardingStep: Math.max(3, await currentStep(owner.tenantId)) },
    });
    return { success: true, tablesCreated: created };
  });

  // Adımı işaretle / tamamla (jenerik ilerletme; step=5 → tamamlandı)
  server.post('/onboarding/advance', async (request: FastifyRequest) => {
    const owner = (request as any).platformOwner as OwnerToken;
    const { step } = request.body as { step?: number };
    const target = Math.min(Math.max(Number(step) || (await currentStep(owner.tenantId)) + 1, 1), 5);
    const done = target >= 5;
    const tenant = await platformDb.tenant.update({
      where: { id: owner.tenantId },
      data: { onboardingStep: target, onboardingCompletedAt: done ? new Date() : null },
      select: { onboardingStep: true, onboardingCompletedAt: true },
    });
    return { success: true, ...tenant };
  });
}

async function currentStep(tenantId: string): Promise<number> {
  const t = await platformDb.tenant.findUnique({ where: { id: tenantId }, select: { onboardingStep: true } });
  return t?.onboardingStep ?? 1;
}
