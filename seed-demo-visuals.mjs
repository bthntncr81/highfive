// Landing ekran görüntüleri için demo-a tenant'ını zenginleştirir (LOKAL DB).
// Gerçek Akçakoca menü adları/fiyatları/görselleriyle (public API'den) masa + sipariş üretir.
// Çalıştırma: DATABASE_URL=postgresql://highfive:highfive123@localhost:55432/otorder_dev node seed-demo-visuals.mjs
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const IMG = 'https://api.highfivepps.com/uploads/';
const MENU = [
  { name: 'Margherita', price: 400, image: IMG + '4ca1b502-958a-4fc7-b350-aa728560d02f.png' },
  { name: 'Pepperoni', price: 450, image: IMG + 'e4127dfd-2de9-4e14-a866-621955563270.png' },
  { name: 'Karışık', price: 500, image: IMG + '5d30fbea-632f-4a35-ac13-949b04d6c041.png' },
  { name: 'Dört Peynirli', price: 450, image: IMG + 'a216b46e-1089-47ed-a7f3-406109b900af.png' },
  { name: 'Anadolu', price: 600, image: IMG + 'c3e28808-349f-4e66-b6db-7aaa9b88649a.png' },
  { name: 'High Five Cheddar', price: 650, image: IMG + '3fc7d685-5e14-47e3-bfd4-0ece34e9c0ed.png' },
];

const t = await p.tenant.findUnique({ where: { subdomain: 'demo-a' } });
if (!t) throw new Error('demo-a yok');
const tid = t.id;
const loc = await p.location.findFirst({ where: { tenantId: tid } });

// Restoran adını ekran görüntüsü için güzelleştir
await p.settings.upsert({
  where: { tenantId_key: { tenantId: tid, key: 'restaurant' } },
  update: { value: { name: 'Pizzacı Mehmet', phone: '0555 000 00 00' } },
  create: { tenantId: tid, key: 'restaurant', value: { name: 'Pizzacı Mehmet', phone: '0555 000 00 00' } },
});

// Kategori + gerçek görselli ürünler
let cat = await p.category.findFirst({ where: { tenantId: tid, name: 'Pizzalar' } });
if (!cat) cat = await p.category.create({ data: { tenantId: tid, name: 'Pizzalar', icon: '🍕', sortOrder: 1 } });
const items = [];
for (const m of MENU) {
  let it = await p.menuItem.findFirst({ where: { tenantId: tid, name: m.name } });
  if (!it) it = await p.menuItem.create({ data: { tenantId: tid, categoryId: cat.id, name: m.name, price: m.price, image: m.image, available: true } });
  else it = await p.menuItem.update({ where: { id: it.id }, data: { image: m.image, price: m.price, categoryId: cat.id } });
  items.push(it);
}

// 12 masa
for (let n = 1; n <= 12; n++) {
  await p.table.upsert({
    where: { tenantId_locationId_number: { tenantId: tid, locationId: loc.id, number: n } },
    update: {},
    create: { tenantId: tid, locationId: loc.id, number: n, name: `Masa ${n}`, capacity: 4 },
  });
}
const tables = await p.table.findMany({ where: { tenantId: tid }, orderBy: { number: 'asc' } });

// Eski demo siparişleri temizle (idempotent yeniden koşum)
await p.orderItem.deleteMany({ where: { tenantId: tid } });
await p.order.deleteMany({ where: { tenantId: tid } });
await p.table.updateMany({ where: { tenantId: tid }, data: { status: 'FREE' } });

const mins = (n) => new Date(Date.now() - n * 60000);
async function mkOrder({ type, status, tableNo, customerName, customerAddress, note, picks, ago }) {
  const table = tableNo ? tables.find((x) => x.number === tableNo) : null;
  const lines = picks.map(([idx, q]) => ({ item: items[idx], q }));
  const subtotal = lines.reduce((s, l) => s + Number(l.item.price) * l.q, 0);
  const o = await p.order.create({
    data: {
      tenantId: tid,
      locationId: loc.id,
      tableId: table?.id ?? null,
      type, status,
      customerName: customerName ?? null,
      customerAddress: customerAddress ?? null,
      customerPhone: customerName ? '0555 111 22 33' : null,
      notes: note ?? null,
      source: 'POS',
      subtotal, total: subtotal,
      createdAt: mins(ago), updatedAt: mins(ago),
      items: {
        create: lines.map((l) => ({
          tenantId: tid,
          menuItemId: l.item.id,
          menuItemName: l.item.name,
          quantity: l.q,
          unitPrice: l.item.price,
          total: Number(l.item.price) * l.q,
          status,
        })),
      },
    },
  });
  if (table) await p.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
  return o;
}

await mkOrder({ type: 'DINE_IN', status: 'PREPARING', tableNo: 3, picks: [[0, 1], [1, 2]], ago: 12, note: 'Az pişmiş olmasın' });
await mkOrder({ type: 'DELIVERY', status: 'PENDING', customerName: 'İpek A.', customerAddress: 'Cumhuriyet Mah. İstanbul Cad. No:151', picks: [[2, 2], [3, 1]], ago: 2 });
await mkOrder({ type: 'TAKEAWAY', status: 'READY', customerName: 'Murat K.', picks: [[4, 1]], ago: 25 });
await mkOrder({ type: 'DINE_IN', status: 'PENDING', tableNo: 6, picks: [[5, 1], [0, 1]], ago: 1 });
await mkOrder({ type: 'DINE_IN', status: 'PREPARING', tableNo: 9, picks: [[1, 1]], ago: 8 });

console.log('demo görsel verisi hazır:', { tenant: tid, items: items.length, tables: tables.length, orders: 5 });
await p.$disconnect();
