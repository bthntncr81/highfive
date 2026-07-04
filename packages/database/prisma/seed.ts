import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // PRODUCTION GUARD — seed sipariş/menü siler, prod'da koşmamalı
  const isProd = process.env.NODE_ENV === 'production';
  const allowed = process.env.ALLOW_PROD_SEED === '1';
  if (isProd && !allowed) {
    throw new Error(
      '⛔ Production seed bloklandı. seed.ts mevcut Order/MenuItem verisini siler.\n' +
      '   Devam etmek için: ALLOW_PROD_SEED=1 npm run db:seed\n' +
      '   Aksi halde sadece güvenli upsert\'leri çalıştır.'
    );
  }
  console.log('🌱 Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@highfive.com' },
    update: {},
    create: {
      email: 'admin@highfive.com',
      password: hashedPassword,
      name: 'Admin',
      role: UserRole.ADMIN,
      pin: '1234',
    },
  });

  // Create sample waiters
  const waiter1 = await prisma.user.upsert({
    where: { email: 'garson1@highfive.com' },
    update: {},
    create: {
      email: 'garson1@highfive.com',
      password: await bcrypt.hash('garson123', 10),
      name: 'Ahmet',
      role: UserRole.WAITER,
      pin: '1111',
    },
  });

  const waiter2 = await prisma.user.upsert({
    where: { email: 'garson2@highfive.com' },
    update: {},
    create: {
      email: 'garson2@highfive.com',
      password: await bcrypt.hash('garson123', 10),
      name: 'Mehmet',
      role: UserRole.WAITER,
      pin: '2222',
    },
  });

  // Create kitchen user
  const kitchen = await prisma.user.upsert({
    where: { email: 'mutfak@highfive.com' },
    update: {},
    create: {
      email: 'mutfak@highfive.com',
      password: await bcrypt.hash('mutfak123', 10),
      name: 'Mutfak',
      role: UserRole.KITCHEN,
      pin: '3333',
    },
  });

  console.log('✅ Users created:', { admin, waiter1, waiter2, kitchen });

  // Create tables
  const tables = [];
  for (let i = 1; i <= 10; i++) {
    // First try to find existing table by number
    const existingTable = await prisma.table.findFirst({
      where: { number: i },
    });
    
    if (existingTable) {
      tables.push(existingTable);
    } else {
      const table = await prisma.table.create({
        data: {
          number: i,
          name: `Masa ${i}`,
          capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
          positionX: ((i - 1) % 5) * 120 + 50,
          positionY: Math.floor((i - 1) / 5) * 120 + 50,
          floor: 1,
        },
      });
      tables.push(table);
    }
  }
  console.log('✅ Tables created:', tables.length);

  // Create categories
  const pizzaCategory = await prisma.category.upsert({
    where: { id: 'cat-pizza' },
    update: {},
    create: {
      id: 'cat-pizza',
      name: 'Pizza',
      icon: '🍕',
      sortOrder: 1,
    },
  });

  const pastaCategory = await prisma.category.upsert({
    where: { id: 'cat-makarna' },
    update: {},
    create: {
      id: 'cat-makarna',
      name: 'Makarna',
      icon: '🍝',
      sortOrder: 2,
    },
  });

  const sandwichCategory = await prisma.category.upsert({
    where: { id: 'cat-sandvic' },
    update: {},
    create: {
      id: 'cat-sandvic',
      name: 'Sandviç',
      icon: '🥪',
      sortOrder: 3,
    },
  });

  const drinkCategory = await prisma.category.upsert({
    where: { id: 'cat-icecek' },
    update: {},
    create: {
      id: 'cat-icecek',
      name: 'İçecek',
      icon: '🥤',
      sortOrder: 4,
    },
  });

  const dessertCategory = await prisma.category.upsert({
    where: { id: 'cat-tatli' },
    update: {},
    create: {
      id: 'cat-tatli',
      name: 'Tatlı',
      icon: '🍰',
      sortOrder: 5,
    },
  });

  console.log('✅ Categories created');

  // Delete existing menu items to avoid duplicates (and related data)
  // First delete order items, then orders, then menu items
  await prisma.orderItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.modifier.deleteMany({});
  await prisma.menuItem.deleteMany({});
  console.log('✅ Cleared existing menu data');

  // Create menu items - Pizzas (9 items)
  const pizzas = [
    { id: 'p1', name: 'Margherita', desc: 'Domates sos, mozzarella, taze fesleğen. İtalyan klasiği!', price: 149, image: '/placeholders/pizza-margherita.svg', badges: ['Popüler'] },
    { id: 'p2', name: 'Marinara', desc: 'Domates sos, sarımsak. Peynir sevmeyenler için sade lezzet!', price: 119, image: '/placeholders/pizza-marinara.svg', badges: ['Vegan'] },
    { id: 'p3', name: 'Ateş Dilimi', desc: 'Domates sos, mozzarella, sucuk, jalapeno, kırmızı biber. Cesurlar için!', price: 189, image: '/placeholders/pizza-ates-dilimi.svg', badges: ['Acılı', 'Popüler'] },
    { id: 'p4', name: 'Dört Peynirli', desc: 'Domates sos, mozzarella, cheddar, parmesan, gorgonzola. Peynir cenneti!', price: 199, image: '/placeholders/pizza-dort-peynirli.svg', badges: ['Popüler'] },
    { id: 'p5', name: 'Kavurmalı', desc: 'Domates sos, mozzarella, kavurma, mısır. Türk damak tadına özel!', price: 209, image: '/placeholders/pizza-kavurmali.svg', badges: ['Yeni'] },
    { id: 'p6', name: 'Füme Mantar', desc: 'Domates sos, mozzarella, füme et, mantar, soğan. Duman aroması!', price: 199, image: '/placeholders/pizza-fume-mantar.svg', badges: [] },
    { id: 'p7', name: 'Karışık', desc: 'Domates sos, mozzarella, sucuk, salam, mantar. Her şeyden biraz!', price: 209, image: '/placeholders/pizza-karisik.svg', badges: ['Popüler'] },
    { id: 'p8', name: 'Et Partisi', desc: 'Domates sos, mozzarella, isli et, sucuk, acı sos. Protein şöleni!', price: 229, image: '/placeholders/pizza-et-partisi.svg', badges: ['Acılı'] },
    { id: 'p9', name: 'High Five Özel', desc: 'Domates sos, mozzarella, sucuk, füme et, biber. Şefin imzası!', price: 239, image: '/placeholders/pizza-highfive-ozel.svg', badges: ['Yeni', 'Popüler'] },
  ];

  for (const pizza of pizzas) {
    await prisma.menuItem.create({
      data: {
        id: pizza.id,
        categoryId: pizzaCategory.id,
        name: pizza.name,
        description: pizza.desc,
        price: pizza.price,
        image: pizza.image,
        badges: pizza.badges,
        prepTime: 15,
        available: true,
      },
    });
  }

  // Create menu items - Pastas (10 items)
  const pastas = [
    { id: 'm1', name: 'Kremalı Mantarlı', desc: 'Krema sos, taze mantar. Hafif ve lezzetli!', price: 129, image: '/placeholders/pasta-kremali-mantarli.svg', badges: ['Popüler'] },
    { id: 'm2', name: 'Acılı Soslu Sosisli', desc: 'Domates sos, sosis, köz biber. Cesurlar için!', price: 139, image: '/placeholders/pasta-acili-ss.svg', badges: ['Acılı'] },
    { id: 'm3', name: '4 Peynirli', desc: 'Peynir sos, krema, 4 çeşit peynir. Peynir tutkunlarına!', price: 149, image: '/placeholders/pasta-dort-peynirli.svg', badges: ['Popüler'] },
    { id: 'm4', name: 'Beşamel Soslu', desc: 'Beşamel sos, kaşar peyniri. Kremsi lezzet!', price: 139, image: '/placeholders/pasta-besamel.svg', badges: [] },
    { id: 'm5', name: 'Köz Patlıcanlı', desc: 'Domates sos, köz patlıcan. Türk mutfağı esintisi!', price: 135, image: '/placeholders/pasta-koz-patlican.svg', badges: ['Yeni'] },
    { id: 'm6', name: 'Köz Biberli', desc: 'Krema sos, kaşar, köz biber. Hafif tütsü aroması!', price: 139, image: '/placeholders/pasta-koz-biber.svg', badges: [] },
    { id: 'm7', name: 'Acılı Domates Sarımsak', desc: 'Acı domates sos, bol sarımsak. Ateşli tercih!', price: 125, image: '/placeholders/pasta-acili-domates.svg', badges: ['Acılı'] },
    { id: 'm8', name: 'Bahçe Makarnası', desc: 'Zeytinyağı, taze sebze karışımı. Sağlıklı seçim!', price: 135, image: '/placeholders/pasta-bahce.svg', badges: ['Vegan'] },
    { id: 'm9', name: 'Etli Mantarlı', desc: 'Özel sos, füme et, mantar. Doyurucu lezzet!', price: 159, image: '/placeholders/pasta-etli-mantarli.svg', badges: ['Popüler'] },
    { id: 'm10', name: 'High Five Makarna', desc: 'Özel sos, füme et, parmesan, kaşar. Şefin imzası!', price: 169, image: '/placeholders/pasta-highfive-ozel.svg', badges: ['Yeni', 'Popüler'] },
  ];

  for (const pasta of pastas) {
    await prisma.menuItem.create({
      data: {
        id: pasta.id,
        categoryId: pastaCategory.id,
        name: pasta.name,
        description: pasta.desc,
        price: pasta.price,
        image: pasta.image,
        badges: pasta.badges,
        prepTime: 12,
        available: true,
      },
    });
  }

  // Create menu items - Sandwiches (20 items)
  const sandwiches = [
    { id: 's1', name: 'Mozzarella Classic', desc: 'Ciabatta ekmek, mozzarella, domates dilimleri, roka, pesto sos.', price: 180, image: '/placeholders/sandwich-mozzarella-classic.svg', badges: ['Popüler'] },
    { id: 's2', name: 'Füme Dana Schiacciatta', desc: 'Schiacciatta, dana füme, mozzarella, karamelize soğan, köz kapya, hardal.', price: 275, image: '/placeholders/sandwich-fume-dana.svg', badges: ['Popüler'] },
    { id: 's3', name: 'Pastırmalı Tulum', desc: 'Ciabatta, pastırma, tulum peyniri, köz patlıcan, roka, acılı domates sosu.', price: 247, image: '/placeholders/sandwich-pastirmali-tulum.svg', badges: ['Acılı'] },
    { id: 's4', name: 'Hindi Light', desc: 'Ciabatta, hindi füme, labne krem, marul, domates, zeytin ezmesi.', price: 165, image: '/placeholders/sandwich-hindi-light.svg', badges: [] },
    { id: 's5', name: 'Dört Peynir Schiacciatta', desc: 'Schiacciatta, mozzarella, kaşar, parmesan, labne krem, fesleğen.', price: 250, image: '/placeholders/sandwich-dort-peynir.svg', badges: ['Popüler'] },
    { id: 's6', name: 'Acılı Salam Jalapeno', desc: 'Ciabatta, dana salam, mozzarella, jalapeno, yeşil biber, acılı mayonez.', price: 240, image: '/placeholders/sandwich-acili-salam.svg', badges: ['Acılı'] },
    { id: 's7', name: 'Vejetaryen Köz Sebzeli', desc: 'Ciabatta, köz kapya, köz patlıcan, domates, roka, sarımsaklı yoğurt.', price: 140, image: '/placeholders/sandwich-vejetaryen.svg', badges: ['Vegan'] },
    { id: 's8', name: 'Et Bombası Schiacciatta', desc: 'Schiacciatta, dana salam, pastırma, dana füme, karamelize soğan, sour chilli sos.', price: 400, image: '/placeholders/sandwich-et-bombasi.svg', badges: ['Yeni', 'Popüler'] },
    { id: 's9', name: 'Pesto Hindi', desc: 'Ciabatta, hindi füme, mozzarella, pesto sos, domates, marul.', price: 200, image: '/placeholders/sandwich-pesto-hindi.svg', badges: [] },
    { id: 's10', name: 'Trüflü Füme Schiacciatta', desc: 'Schiacciatta, dana füme, mozzarella, karamelize soğan, jalapeno, trüflü mayonez.', price: 275, image: '/placeholders/sandwich-truflu-fume.svg', badges: ['Yeni'] },
    { id: 's11', name: 'Tulum & Salam Schiacciatta', desc: 'Schiacciatta, tulum peyniri, dana salam, köz kapya, kornişon, hardal.', price: 275, image: '/placeholders/sandwich-tulum-salam.svg', badges: [] },
    { id: 's12', name: 'Parmesan Pesto Veggie', desc: 'Ciabatta, parmesan, köz kapya, domates, roka, pesto sos, zeytin ezmesi.', price: 230, image: '/placeholders/sandwich-parmesan-veggie.svg', badges: ['Vegan'] },
    { id: 's13', name: 'Labneli Jalapeno Bomb', desc: 'Ciabatta, labne krem, jalapeno, kornişon, sour chilli sos, yeşil biber.', price: 155, image: '/placeholders/sandwich-labneli-jalapeno.svg', badges: ['Acılı'] },
    { id: 's14', name: 'Margherita Sandviç', desc: 'Ciabatta, mozzarella, domates dilimleri, fesleğen, zeytin ezmesi.', price: 150, image: '/placeholders/sandwich-margherita.svg', badges: [] },
    { id: 's15', name: 'Sarımsaklı Hindi Schiacciatta', desc: 'Schiacciatta, hindi füme, kaşar, sarımsaklı yoğurt, marul, karamelize soğan.', price: 175, image: '/placeholders/sandwich-sarimsakli-hindi.svg', badges: [] },
    { id: 's16', name: 'Dana Trio', desc: 'Ciabatta, dana salam, dana füme, pastırma, domates, marul, hardal.', price: 400, image: '/placeholders/sandwich-dana-trio.svg', badges: ['Yeni', 'Popüler'] },
    { id: 's17', name: 'Taze Otlu Peynir', desc: 'Ciabatta, kaşar, labne krem, fesleğen, roka, pesto sos.', price: 200, image: '/placeholders/sandwich-taze-otlu.svg', badges: [] },
    { id: 's18', name: 'Acılı Domates Mozzarella', desc: 'Schiacciatta, mozzarella, acılı domates sosu, jalapeno, yeşil biber, roka.', price: 167, image: '/placeholders/sandwich-acili-domates-mozz.svg', badges: ['Acılı'] },
    { id: 's19', name: 'Pickle Lovers', desc: 'Ciabatta, kornişon, jalapeno, zeytin ezmesi, marul, mozzarella.', price: 160, image: '/placeholders/sandwich-pickle-lovers.svg', badges: ['Yeni'] },
    { id: 's20', name: 'Full House Schiacciatta', desc: 'Schiacciatta, mozzarella, dana salam, köz kapya, karamelize soğan, kornişon, trüflü mayonez.', price: 265, image: '/placeholders/sandwich-full-house.svg', badges: ['Popüler'] },
  ];

  for (const sandwich of sandwiches) {
    await prisma.menuItem.create({
      data: {
        id: sandwich.id,
        categoryId: sandwichCategory.id,
        name: sandwich.name,
        description: sandwich.desc,
        price: sandwich.price,
        image: sandwich.image,
        badges: sandwich.badges,
        prepTime: 10,
        available: true,
      },
    });
  }

  // Create menu items - Drinks (3 items)
  const drinks = [
    { id: 'd1', name: 'Kola', desc: '330ml kutu', price: 25, image: '/placeholders/drink-1.svg', badges: [] },
    { id: 'd2', name: 'Limonata', desc: 'Taze sıkılmış, ev yapımı', price: 35, image: '/placeholders/drink-1.svg', badges: ['Yeni'] },
    { id: 'd3', name: 'Ayran', desc: 'Geleneksel, köpüklü', price: 20, image: '/placeholders/drink-1.svg', badges: [] },
  ];

  for (const drink of drinks) {
    await prisma.menuItem.create({
      data: {
        id: drink.id,
        categoryId: drinkCategory.id,
        name: drink.name,
        description: drink.desc,
        price: drink.price,
        image: drink.image,
        badges: drink.badges,
        prepTime: 1,
        available: true,
      },
    });
  }

  // Create menu items - Desserts (2 items)
  const desserts = [
    { id: 't1', name: 'Tiramisu', desc: 'İtalyan klasiği, kahve ve mascarpone', price: 75, image: '/placeholders/dessert-1.svg', badges: ['Popüler'] },
    { id: 't2', name: 'Çikolatalı Sufle', desc: 'Sıcak servis, akan çikolata', price: 85, image: '/placeholders/dessert-1.svg', badges: ['Yeni'] },
  ];

  for (const dessert of desserts) {
    await prisma.menuItem.create({
      data: {
        id: dessert.id,
        categoryId: dessertCategory.id,
        name: dessert.name,
        description: dessert.desc,
        price: dessert.price,
        image: dessert.image,
        badges: dessert.badges,
        prepTime: 8,
        available: true,
      },
    });
  }

  console.log('✅ Menu items created (44 items total)');

  // Create settings
  await prisma.settings.upsert({
    where: { key: 'restaurant' },
    update: {},
    create: {
      key: 'restaurant',
      value: {
        name: 'High Five',
        phone: '05056916831',
        address: 'Bağdat Caddesi No:123, Kadıköy, İstanbul',
        taxRate: 10,
        currency: 'TL',
        serviceChargePercent: 10,
      },
    },
  });

  await prisma.settings.upsert({
    where: { key: 'whatsapp' },
    update: {},
    create: {
      key: 'whatsapp',
      value: {
        enabled: false,
        phone: '905056916831',
        defaultMessage: 'Merhaba! Sipariş vermek istiyorum 🍕',
      },
    },
  });

  console.log('✅ Settings created');

  // ==================== EXPENSE CATEGORIES (sabit/default) ====================
  const defaultExpenseCategories = [
    { name: 'Personel', icon: '👥', color: '#3b82f6', sortOrder: 1 },
    { name: 'Kira', icon: '🏠', color: '#8b5cf6', sortOrder: 2 },
    { name: 'Elektrik', icon: '⚡', color: '#eab308', sortOrder: 3 },
    { name: 'Su', icon: '💧', color: '#06b6d4', sortOrder: 4 },
    { name: 'Doğalgaz', icon: '🔥', color: '#f97316', sortOrder: 5 },
    { name: 'İnternet & Telefon', icon: '📡', color: '#6366f1', sortOrder: 6 },
    { name: 'Malzeme / Hammadde', icon: '📦', color: '#10b981', sortOrder: 7 },
    { name: 'Ekipman / Onarım', icon: '🔧', color: '#64748b', sortOrder: 8 },
    { name: 'Vergi / Yasal', icon: '📋', color: '#ef4444', sortOrder: 9 },
    { name: 'Pazarlama / Reklam', icon: '📢', color: '#ec4899', sortOrder: 10 },
    { name: 'Yakıt / Ulaşım', icon: '🚚', color: '#14b8a6', sortOrder: 11 },
    { name: 'Temizlik', icon: '🧹', color: '#84cc16', sortOrder: 12 },
    { name: 'Diğer', icon: '💼', color: '#71717a', sortOrder: 99 },
  ];
  for (const cat of defaultExpenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, color: cat.color, sortOrder: cat.sortOrder, isSystem: true },
      create: { ...cat, isSystem: true, active: true },
    });
  }
  console.log(`✅ Expense categories seeded: ${defaultExpenseCategories.length}`);

  // Auto-approve threshold (büyük giderler admin onayı bekler)
  await prisma.settings.upsert({
    where: { key: 'expense_auto_approve_threshold' },
    update: {},
    create: { key: 'expense_auto_approve_threshold', value: { amount: 10000 } },
  });
  console.log('✅ Expense auto-approve threshold: 10000 ₺');

  console.log('🎉 Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
