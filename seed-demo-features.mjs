// Landing feature-ekran görüntüleri için demo-a'ya: kampanyalar, ham madde stoğu,
// sadakat programları, şans çarkı, bugünkü tamamlanmış siparişler (rapor için).
// Çalıştırma: DATABASE_URL=postgresql://highfive:highfive123@localhost:55432/otorder_dev node seed-demo-features.mjs
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const IMG = 'https://api.highfivepps.com/uploads/';
const t = await p.tenant.findUnique({ where: { subdomain: 'demo-a' } });
const tid = t.id;
const loc = await p.location.findFirst({ where: { tenantId: tid } });
const items = await p.menuItem.findMany({ where: { tenantId: tid }, orderBy: { price: 'asc' } });
const days = (n) => new Date(Date.now() - n * 864e5);

// --- Kampanyalar ---
await p.campaign.deleteMany({ where: { tenantId: tid } });
await p.campaign.createMany({
  data: [
    { tenantId: tid, name: '2 Pizza Alana Ayran Hediye', description: 'Salonda ve pakette geçerli', type: 'FREE_ITEM', discountType: 'FREE_ITEM', image: IMG + '5d30fbea-632f-4a35-ac13-949b04d6c041.png', startDate: days(3), endDate: days(-27), isActive: true, usageLimit: 500, currentUsage: 87 },
    { tenantId: tid, name: 'Hafta İçi %15 Öğle İndirimi', description: '12:00-15:00 arası tüm menüde', type: 'DISCOUNT', discountType: 'PERCENT', discountValue: 15, image: IMG + '4ca1b502-958a-4fc7-b350-aa728560d02f.png', startDate: days(10), endDate: days(-50), isActive: true, usageLimit: 1000, currentUsage: 214 },
    { tenantId: tid, name: '₺600 Üzeri Ücretsiz Teslimat', description: 'Online siparişlerde otomatik uygulanır', type: 'MIN_PURCHASE', minPurchase: 600, discountType: 'FIXED', discountValue: 0, image: IMG + 'c3e28808-349f-4e66-b6db-7aaa9b88649a.png', startDate: days(1), endDate: days(-60), isActive: true, usageLimit: null, currentUsage: 45 },
  ],
});

// --- Ham madde stoğu (2'si kritik seviyede) ---
await p.menuItemIngredient.deleteMany({ where: { tenantId: tid } });
await p.rawMaterial.deleteMany({ where: { tenantId: tid } });
await p.rawMaterial.createMany({
  data: [
    { tenantId: tid, name: 'Mozzarella (fior di latte)', unit: 'KILOGRAM', currentStock: 3.2, minStock: 5, costPerUnit: 420, supplier: 'Süt Dünyası' },
    { tenantId: tid, name: 'Pizza Unu (Tip 00)', unit: 'KILOGRAM', currentStock: 42, minStock: 25, costPerUnit: 38, supplier: 'Değirmen Gıda' },
    { tenantId: tid, name: 'San Marzano Domates', unit: 'KILOGRAM', currentStock: 18, minStock: 10, costPerUnit: 95, supplier: 'Ege Konserve' },
    { tenantId: tid, name: 'Kangal Sucuk', unit: 'KILOGRAM', currentStock: 1.4, minStock: 3, costPerUnit: 680, supplier: 'Kasap Osman' },
    { tenantId: tid, name: 'Taze Fesleğen', unit: 'ADET', currentStock: 22, minStock: 10, costPerUnit: 15, supplier: 'Sera Bahçe' },
    { tenantId: tid, name: 'Zeytinyağı (sızma)', unit: 'LITRE', currentStock: 12, minStock: 5, costPerUnit: 310, supplier: 'Ayvalık Zeytin' },
    { tenantId: tid, name: 'Cheddar', unit: 'KILOGRAM', currentStock: 7.5, minStock: 4, costPerUnit: 520, supplier: 'Süt Dünyası' },
    { tenantId: tid, name: 'Ayran (şişe)', unit: 'ADET', currentStock: 96, minStock: 48, costPerUnit: 11, supplier: 'Süt Dünyası' },
  ],
});

// --- Sadakat programları ---
await p.loyaltyProgram.deleteMany({ where: { tenantId: tid } });
await p.loyaltyProgram.createMany({
  data: [
    { tenantId: tid, type: 'BASIC_POINTS', name: 'Puan Kazan', description: 'Her ₺10 harcamaya 1 puan; 100 puan = ₺50 indirim', icon: '⭐', color: '#bb1e10', isActive: true, sortOrder: 1, config: { pointsPerTL: 10, redeemRate: 0.5 } },
    { tenantId: tid, type: 'STAMP_CARD', name: 'Pizza Damga Kartı', description: '9 pizza al, 10.su bizden', icon: '🍕', color: '#8a1610', isActive: true, sortOrder: 2, config: { required: 9, reward: 'FREE_ITEM' } },
    { tenantId: tid, type: 'BIRTHDAY', name: 'Doğum Günü Sürprizi', description: 'Doğum gününde tatlı ikramı + %20 indirim', icon: '🎂', color: '#d4382a', isActive: true, sortOrder: 3, config: { discountPercent: 20 } },
    { tenantId: tid, type: 'REFERRAL', name: 'Arkadaşını Getir', description: 'Davet ettiğin her arkadaş için 50 puan', icon: '🤝', color: '#f3726a', isActive: true, sortOrder: 4, config: { points: 50 } },
  ],
});

// --- Şans çarkı ---
await p.spinAttempt.deleteMany({ where: { tenantId: tid } });
await p.spinWheelConfig.deleteMany({ where: { tenantId: tid } });
await p.spinWheelConfig.create({
  data: {
    tenantId: tid, name: 'Şans Çarkı', description: 'Sipariş sonrası bir çevirme hakkı', cooldownHours: 24, minCartTotal: 300, isActive: true,
    slices: [
      { label: '%10 İndirim', emoji: '🎉', color: '#bb1e10', type: 'DISCOUNT_PERCENT', value: 10, weight: 25 },
      { label: 'Ayran Hediye', emoji: '🥛', color: '#d4382a', type: 'FREE_ITEM', value: 0, weight: 20 },
      { label: '25 Puan', emoji: '⭐', color: '#8a1610', type: 'POINTS', value: 25, weight: 25 },
      { label: 'Pas', emoji: '🙈', color: '#6e120d', type: 'NONE', value: 0, weight: 15 },
      { label: '%20 İndirim', emoji: '🔥', color: '#f3726a', type: 'DISCOUNT_PERCENT', value: 20, weight: 10 },
      { label: 'Tatlı Hediye', emoji: '🍰', color: '#5a0f0b', type: 'FREE_ITEM', value: 0, weight: 5 },
    ],
  },
});

// --- Bugün tamamlanmış siparişler (Raporlar sayfası için) ---
const doneTimes = [10.5, 11.2, 12.1, 12.7, 13.3, 19.4, 20.1, 20.8, 21.5];
for (const h of doneTimes) {
  const pick = items[Math.floor(h * 7) % items.length];
  const q = (Math.floor(h) % 2) + 1;
  const total = Number(pick.price) * q;
  const at = new Date(); at.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
  await p.order.create({
    data: {
      tenantId: tid, locationId: loc.id, type: h < 15 ? 'TAKEAWAY' : 'DELIVERY', status: 'COMPLETED',
      paymentStatus: 'PAID', paymentMethod: h % 2 > 1 ? 'CASH' : 'CREDIT_CARD',
      subtotal: total, total, source: 'POS', createdAt: at, updatedAt: at,
      items: { create: [{ tenantId: tid, menuItemId: pick.id, menuItemName: pick.name, quantity: q, unitPrice: pick.price, total, status: 'COMPLETED' }] },
    },
  });
}

console.log('feature seed tamam: 3 kampanya, 8 ham madde, 4 sadakat programı, 1 çark, 9 tamamlanmış sipariş');
await p.$disconnect();
