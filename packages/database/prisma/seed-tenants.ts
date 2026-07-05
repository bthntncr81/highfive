// OtOrder SaaS — demo tenant seed'i (izolasyon harness yakıtı).
// 3 plan + 2 tenant üretir. Tenant B'nin TÜM satırları "XTENANT_B_<Model>"
// marker'ı taşır: Faz 3 harness'ı, A kimliğiyle yapılan HİÇBİR istekte
// bu marker'ların görünmediğini assert eder.
// Çalıştırma: DATABASE_URL=... npx ts-node packages/database/prisma/seed-tenants.ts

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLANS = [
  { key: 'STARTER', name: 'Başlangıç', monthlyPrice: 990, annualPrice: 9900, maxLocations: 1, maxUsers: 5, sortOrder: 1,
    features: { loyalty: false, campaigns: false, analytics: false, whatsappLink: false, brandedApp: false, customLanding: false, marketplace: false } },
  { key: 'PRO', name: 'Pro', monthlyPrice: 1990, annualPrice: 19900, maxLocations: 3, maxUsers: 15, sortOrder: 2,
    features: { loyalty: true, campaigns: true, analytics: true, whatsappLink: true, brandedApp: false, customLanding: false, marketplace: true } },
  { key: 'ENTERPRISE', name: 'Kurumsal', monthlyPrice: 3990, annualPrice: 39900, maxLocations: -1, maxUsers: -1, sortOrder: 3,
    features: { loyalty: true, campaigns: true, analytics: true, whatsappLink: true, brandedApp: true, customLanding: true, marketplace: true } },
];

// mark('A'|'B', 'Model') → tenant satırlarını ayırt eden isim üretir
const mark = (t: 'A' | 'B', model: string) => (t === 'B' ? `XTENANT_B_${model}` : `TenantA ${model}`);

async function seedTenant(t: 'A' | 'B', planId: string) {
  const sub = t === 'A' ? 'demo-a' : 'demo-b';
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: sub },
    update: {},
    create: { name: mark(t, 'Tenant'), subdomain: sub, status: 'ACTIVE' },
  });
  const tid = tenant.id;

  await prisma.subscription.upsert({
    where: { tenantId: tid },
    update: {},
    create: { tenantId: tid, planId, status: 'ACTIVE', cycle: 'MONTHLY' },
  });

  // Owner user + membership (PIN: A→1111, B→2222 — tenant içinde benzersiz)
  const owner = await prisma.user.upsert({
    where: { email: `owner@${sub}.test` },
    update: {},
    create: {
      email: `owner@${sub}.test`,
      password: await bcrypt.hash('demo1234', 10),
      name: mark(t, 'Owner'),
    },
  });
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: owner.id, tenantId: tid } },
    update: {},
    create: { userId: owner.id, tenantId: tid, role: UserRole.OWNER, pin: t === 'A' ? '1111' : '2222' },
  });

  const location = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tid, code: 'merkez' } },
    update: {},
    create: { tenantId: tid, name: mark(t, 'Location'), code: 'merkez', isDefault: true },
  });

  const category = await prisma.category.create({
    data: { tenantId: tid, name: mark(t, 'Category'), sortOrder: 1 },
  });

  await prisma.menuItem.create({
    data: { tenantId: tid, categoryId: category.id, name: mark(t, 'MenuItem'), price: 100, available: true },
  });

  await prisma.table.upsert({
    where: { tenantId_locationId_number: { tenantId: tid, locationId: location.id, number: 1 } },
    update: {},
    create: { tenantId: tid, locationId: location.id, number: 1, name: mark(t, 'Table') },
  });

  await prisma.customer.create({
    data: {
      tenantId: tid,
      name: mark(t, 'Customer'),
      phone: t === 'A' ? '5550000001' : '5550000002',
      email: `musteri@${sub}.test`,
    },
  });

  await prisma.settings.upsert({
    where: { tenantId_key: { tenantId: tid, key: 'restaurant' } },
    update: {},
    create: { tenantId: tid, key: 'restaurant', value: { name: mark(t, 'Settings'), phone: '0555' } },
  });

  await prisma.coupon.create({
    data: {
      tenantId: tid, code: 'HOSGELDIN20', name: mark(t, 'Coupon'),
      discountType: 'PERCENT', discountValue: 20,
      startDate: new Date(), endDate: new Date(Date.now() + 365 * 864e5),
    },
  });

  console.log(`✓ tenant ${sub} (${tid}) seed edildi`);
  return tenant;
}

async function main() {
  // Planlar
  const plans: Record<string, string> = {};
  for (const p of PLANS) {
    const row = await prisma.plan.upsert({
      where: { key: p.key },
      update: { maxLocations: p.maxLocations, maxUsers: p.maxUsers, features: p.features },
      create: { ...p, features: p.features },
    });
    plans[p.key] = row.id;
  }
  console.log(`✓ ${PLANS.length} plan hazır`);

  await seedTenant('A', plans['PRO']);
  await seedTenant('B', plans['PRO']);
  console.log('✓ demo tenant seed tamam (A: temiz isimler, B: XTENANT_B_* markerlar)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
