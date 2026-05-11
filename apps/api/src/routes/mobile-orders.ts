// Mobile (Customer) Orders — Customer-bound, auth zorunlu
// POST  /api/mobile/orders          - Yeni sipariş (TAKEAWAY/DELIVERY) + CustomerOrder bağlama
// GET   /api/mobile/orders          - Müşterinin sipariş listesi (tarih sıralı)
// GET   /api/mobile/orders/:id      - Sipariş detay (kurye + items + status + payment)
// POST  /api/mobile/orders/:id/cancel - PENDING durumundakileri iptal et

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, OrderStatus, OrderType, PaymentStatus, PaymentMethod } from '@prisma/client';
import { verifyCustomerAuth, signCustomerToken } from '../lib/customer-auth';
import { sendOrderCreatedPush, sendOrderStatusPush } from '../lib/order-push';
import { broadcastNewOrder, broadcastOrderUpdate } from '../websocket';
import { expandBundles } from '../lib/bundle-expansion';
import { evaluateCartOffers } from '../lib/cart-offers';

const DELIVERY_FEE = 29; // Sabit (CUSTOMER_API.md ile uyumlu)

// Telefon normalize: +90555..., 0555..., 555... → 5xxxxxxxxx
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let p = digits;
  if (p.startsWith('90') && p.length === 12) p = p.slice(2);
  if (p.startsWith('0') && p.length === 11) p = p.slice(1);
  if (p.length !== 10 || !p.startsWith('5')) return null;
  return p;
}

export default async function mobileOrdersRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== CREATE ORDER ====================
  server.post('/', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const body = (request.body ?? {}) as {
      type: OrderType;
      addressId?: string;                                       // DELIVERY için kayıtlı adres
      customerAddress?: string;                                 // DELIVERY için manuel adres (addressId yoksa)
      customerLatitude?: number;                                // Manuel adres için opsiyonel GPS
      customerLongitude?: number;
      customerName?: string;                                    // override; yoksa Customer.name
      customerPhone?: string;                                   // override; yoksa Customer.phone
      items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
      bundles?: {
        bundleId: string;
        quantity?: number;
        // Yeni: slot bazlı (assignmentId + slotIndex)
        selections?: { assignmentId: string; slotIndex: number; optionGroupItemIds: string[] }[];
        // Eski: groupId bazlı (geriye uyumluluk)
        assignedSelections?: { optionGroupId: string; optionGroupItemIds: string[] }[];
      }[];
      notes?: string;
      tip?: number;                                             // bahşiş
      pointsToRedeem?: number;                                  // puanla indirim
      couponCode?: string;
      paymentMethod?: 'CASH' | 'ONLINE' | 'CREDIT_CARD';        // ONLINE = iyzico 3DS akışı
    };

    if ((!body.items || body.items.length === 0) && (!body.bundles || body.bundles.length === 0)) {
      return reply.status(400).send({ error: 'En az bir ürün veya paket gerekli' });
    }
    if (!body.type || !['TAKEAWAY', 'DELIVERY'].includes(body.type)) {
      return reply.status(400).send({ error: 'Geçersiz sipariş tipi' });
    }

    // Customer'ı çek
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyTier: true },
    });
    if (!customer) {
      return reply.status(404).send({ error: 'Müşteri bulunamadı' });
    }
    if (!customer.isVerified) {
      return reply.status(403).send({ error: 'Telefon doğrulanmamış' });
    }

    // Service availability kontrolü
    const servicesSetting = await prisma.settings.findUnique({ where: { key: 'services' } });
    const services = (servicesSetting?.value as any) || { takeawayEnabled: true, deliveryEnabled: true };
    if (body.type === 'TAKEAWAY' && services.takeawayEnabled === false) {
      return reply.status(403).send({ error: 'Gel Al siparişi şu anda kapalıdır' });
    }
    if (body.type === 'DELIVERY' && services.deliveryEnabled === false) {
      return reply.status(403).send({ error: 'Eve Servis şu anda kapalıdır' });
    }

    // DELIVERY için adres
    let deliveryAddressText: string | null = null;
    let deliveryLat: number | null = null;
    let deliveryLng: number | null = null;
    if (body.type === 'DELIVERY') {
      if (body.addressId) {
        const addr = await prisma.address.findFirst({
          where: { id: body.addressId, customerId },
        });
        if (!addr) return reply.status(404).send({ error: 'Adres bulunamadı' });
        deliveryAddressText = [addr.fullAddress, addr.district, addr.city]
          .filter(Boolean)
          .join(', ');
        if (addr.notes) deliveryAddressText += ` (${addr.notes})`;
        deliveryLat = addr.latitude;
        deliveryLng = addr.longitude;
      } else if (body.customerAddress) {
        deliveryAddressText = body.customerAddress;
        // Manuel adres ise body'den geo
        if (typeof body.customerLatitude === 'number') deliveryLat = body.customerLatitude;
        if (typeof body.customerLongitude === 'number') deliveryLng = body.customerLongitude;
      } else {
        return reply.status(400).send({ error: 'Eve servis için adres gerekli' });
      }
    }

    // Items + subtotal
    let subtotal = 0;
    const orderItems: any[] = [];
    for (const item of body.items || []) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });
      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `Ürün mevcut değil: ${item.menuItemId}` });
      }
      // İndirimli fiyat varsa onu kullan
      const price = (menuItem as any).discountPrice && (menuItem as any).discountUntil
        && new Date((menuItem as any).discountUntil) > new Date()
        ? Number((menuItem as any).discountPrice)
        : Number(menuItem.price);
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || [],
      });
    }

    // Bundle expansion: paket fiyatı + reusable opsiyon grupları seçimleri
    if (body.bundles && body.bundles.length > 0) {
      const res = await expandBundles(prisma, body.bundles);
      if (!res.ok) return reply.status(400).send({ error: res.error });
      subtotal += res.subtotalDelta;
      for (const oi of res.orderItems) orderItems.push(oi);
    }

    // Tax
    const restaurantSettings = await prisma.settings.findUnique({ where: { key: 'restaurant' } });
    const taxRate = (restaurantSettings?.value as any)?.taxRate ?? 0;
    const tax = subtotal * (taxRate / 100);

    // Loyalty discount (puan kullan)
    let pointsSpent = 0;
    let pointsDiscount = 0;
    if (body.pointsToRedeem && body.pointsToRedeem >= 100) {
      const maxRedeemable = Math.min(
        Math.floor(customer.totalPoints / 100) * 100,
        body.pointsToRedeem,
      );
      pointsSpent = maxRedeemable;
      pointsDiscount = maxRedeemable / 10; // 100 puan = 10 ₺
    }

    // Coupon (basit doğrulama)
    let couponDiscount = 0;
    let couponId: string | null = null;
    if (body.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: body.couponCode.trim().toUpperCase() },
      });
      if (coupon && coupon.isActive && coupon.startDate <= new Date() && coupon.endDate >= new Date()) {
        const minOk = !coupon.minPurchase || subtotal >= Number(coupon.minPurchase);
        if (minOk) {
          couponDiscount = coupon.discountType === 'PERCENT'
            ? subtotal * (Number(coupon.discountValue) / 100)
            : Number(coupon.discountValue);
          couponId = coupon.id;
        }
      }
    }

    // Tier indirimi (varsa)
    const tierDiscount = customer.loyaltyTier?.discountPercent
      ? subtotal * (Number(customer.loyaltyTier.discountPercent) / 100)
      : 0;

    // Otomatik en avantajlı sadakat offer'ı (puan/kupon kullanılmadıysa)
    // — UI'de sepette gösterilen 🎁 banner indirimi backend'de re-evaluate edilerek
    //   güvenli şekilde uygulanır. Kullanıcı kupon veya puan kullanmadıysa devreye girer.
    let autoOfferDiscount = 0;
    let autoOfferLabel: string | null = null;
    if (couponDiscount === 0 && pointsDiscount === 0) {
      const cartItemsForOffer = orderItems
        .filter((oi) => oi.menuItemId)
        .map((oi) => ({
          menuItemId: oi.menuItemId as string,
          quantity: oi.quantity,
          unitPrice: Number(oi.unitPrice),
        }));
      // Bundle wrapper line'ları da subtotal'a dahil etmek için fake menuItemId ile ekle
      for (const oi of orderItems.filter((x) => !x.menuItemId)) {
        cartItemsForOffer.push({
          menuItemId: 'bundle-line',
          quantity: oi.quantity,
          unitPrice: Number(oi.unitPrice),
        });
      }
      try {
        const offerRes = await evaluateCartOffers(prisma, customerId, cartItemsForOffer);
        if (offerRes.bestOffer && offerRes.bestOffer.calculatedDiscount > 0) {
          autoOfferDiscount = offerRes.bestOffer.calculatedDiscount;
          autoOfferLabel = offerRes.bestOffer.name;
        }
      } catch {
        // offer hesabı patlarsa siparişi durdurmayalım
      }
    }

    const totalDiscount = pointsDiscount + couponDiscount + tierDiscount + autoOfferDiscount;
    const tipAmount = Math.max(0, body.tip || 0);
    const deliveryAmount = body.type === 'DELIVERY' ? DELIVERY_FEE : 0;
    const finalTotal = Math.max(0, subtotal + tax + tipAmount + deliveryAmount - totalDiscount);

    // Sipariş oluştur — paymentMethod'u doğru kaydet
    // ONLINE: 3DS ödeme akışı tamamlanana kadar bu sipariş POS'a görünmeyecek (broadcast yok).
    // CASH: kapıda ödeme — direkt POS'a düşer.
    const orderPaymentMethod =
      body.paymentMethod === 'ONLINE'
        ? PaymentMethod.ONLINE
        : body.paymentMethod === 'CREDIT_CARD'
        ? PaymentMethod.CREDIT_CARD
        : PaymentMethod.CASH;

    const order = await prisma.order.create({
      data: {
        customerName: body.customerName ?? customer.name ?? null,
        customerPhone: body.customerPhone ?? customer.phone,
        customerEmail: customer.email ?? null,
        customerAddress: deliveryAddressText,
        customerLatitude: deliveryLat,
        customerLongitude: deliveryLng,
        type: body.type,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: orderPaymentMethod,
        subtotal,
        tax,
        discount: totalDiscount,
        deliveryFee: deliveryAmount,
        tip: tipAmount,
        total: finalTotal,
        notes: body.notes,
        source: 'MOBILE',
        items: { create: orderItems },
      },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    // CustomerOrder bağlantısı (puan kazanım hesabı orderlar tamamlanınca yapılır)
    const basePoints = Math.floor(subtotal / 10); // 10 ₺ = 1 puan
    const multiplier = customer.loyaltyTier?.pointsMultiplier
      ? Number(customer.loyaltyTier.pointsMultiplier)
      : 1;
    const pointsEarnedAtComplete = Math.floor(basePoints * multiplier);

    await prisma.customerOrder.create({
      data: {
        customerId,
        orderId: order.id,
        pointsEarned: 0,             // sipariş COMPLETED olunca yazılır
        pointsSpent,
      },
    });

    // Puan harcaması anında kaydet (kullanım anında düşer)
    if (pointsSpent > 0) {
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customerId },
          data: { totalPoints: { decrement: pointsSpent } },
        }),
        prisma.pointsTransaction.create({
          data: {
            customerId,
            orderId: order.id,
            points: -pointsSpent,
            type: 'SPEND',
            description: `Sipariş #${order.orderNumber} için kullanıldı`,
          },
        }),
      ]);
    }

    // Coupon usage kaydı
    if (couponId) {
      await prisma.couponUsage.create({
        data: { couponId, customerId, orderId: order.id, discount: couponDiscount },
      }).catch(() => {});
    }

    // Push (sadece ONLINE değilse hemen — ONLINE'da ödeme tamamlanınca tetiklenir)
    if (body.paymentMethod !== 'ONLINE') {
      broadcastNewOrder(order);
      sendOrderCreatedPush(prisma, order).catch(() => {});
    }

    return {
      order: {
        ...order,
        pointsEarned: pointsEarnedAtComplete,
        pointsSpent,
        discountBreakdown: {
          points: pointsDiscount,
          coupon: couponDiscount,
          tier: tierDiscount,
          autoOffer: autoOfferDiscount,
          autoOfferLabel,
        },
      },
    };
  });

  // ==================== LIST CUSTOMER ORDERS ====================
  server.get('/', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
  ) => {
    const customerId = (request as any).customerId as string;
    const { limit, status, before } = (request.query ?? {}) as {
      limit?: string;
      status?: string;                                          // PENDING,CONFIRMED... (virgülle)
      before?: string;                                          // ISO tarih (cursor)
    };

    const take = Math.min(parseInt(limit || '20', 10), 50);
    const statusFilter = status?.split(',').filter(Boolean) as OrderStatus[] | undefined;

    const customerOrders = await prisma.customerOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(before ? { cursor: undefined } : {}),
      include: {
        // CustomerOrder'da Order direct relation yok; manual fetch
      },
    });

    // Order detaylarını topla
    const orderIds = customerOrders.map((co) => co.orderId);
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, image: true } } } },
        courier: { select: { id: true, name: true, phone: true } },
        payments: true,
      },
    });

    // CustomerOrder ile birleştir (points info için)
    const ordersWithPoints = orders.map((o) => {
      const co = customerOrders.find((c) => c.orderId === o.id);
      return {
        ...o,
        pointsEarned: co?.pointsEarned ?? 0,
        pointsSpent: co?.pointsSpent ?? 0,
      };
    });

    return { orders: ordersWithPoints };
  });

  // ==================== ORDER DETAIL ====================
  server.get('/:id', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { id } = request.params as { id: string };

    // Sahiplik kontrolü
    const co = await prisma.customerOrder.findUnique({
      where: { orderId: id },
    });
    if (!co || co.customerId !== customerId) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, image: true } } } },
        courier: { select: { id: true, name: true, phone: true } },
        payments: true,
        table: { select: { id: true, number: true, name: true } },
      },
    });
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı' });

    return {
      order: {
        ...order,
        pointsEarned: co.pointsEarned,
        pointsSpent: co.pointsSpent,
      },
    };
  });

  // ==================== CANCEL ORDER ====================
  server.post('/:id/cancel', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { id } = request.params as { id: string };

    const co = await prisma.customerOrder.findUnique({ where: { orderId: id } });
    if (!co || co.customerId !== customerId) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı' });

    if (order.status !== OrderStatus.PENDING) {
      return reply.status(400).send({
        error: 'Bu sipariş artık iptal edilemez',
        code: 'CANNOT_CANCEL',
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: {
        items: { include: { menuItem: true } },
        courier: { select: { id: true, name: true, phone: true } },
        payments: true,
      },
    });

    // Harcanan puanları geri yükle
    if (co.pointsSpent > 0) {
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customerId },
          data: { totalPoints: { increment: co.pointsSpent } },
        }),
        prisma.pointsTransaction.create({
          data: {
            customerId,
            orderId: id,
            points: co.pointsSpent,
            type: 'BONUS',
            description: `Sipariş #${order.orderNumber} iptal — puan iadesi`,
          },
        }),
      ]);
    }

    broadcastOrderUpdate(updated);
    sendOrderStatusPush(prisma, updated, 'CANCELLED').catch(() => {});

    return { order: updated };
  });

  // ==================== GUEST ORDER (no auth) ====================
  // Telefon doğrulaması olmadan hızlı sipariş.
  // Customer kaydı oluşur (isVerified=false), token döner, sonradan üye olabilir.
  server.post('/guest', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as {
      type: OrderType;
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      customerAddress?: string;
      customerLatitude?: number;
      customerLongitude?: number;
      items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
      bundles?: {
        bundleId: string;
        quantity?: number;
        selections?: { assignmentId: string; slotIndex: number; optionGroupItemIds: string[] }[];
        assignedSelections?: { optionGroupId: string; optionGroupItemIds: string[] }[];
      }[];
      notes?: string;
      tip?: number;
      paymentMethod?: 'CASH' | 'ONLINE' | 'CREDIT_CARD';
    };

    if (!body.customerName?.trim() || !body.customerPhone?.trim()) {
      return reply.status(400).send({ error: 'Ad ve telefon gerekli' });
    }
    if ((!body.items || body.items.length === 0) && (!body.bundles || body.bundles.length === 0)) {
      return reply.status(400).send({ error: 'En az bir ürün veya paket gerekli' });
    }
    if (!body.type || !['TAKEAWAY', 'DELIVERY'].includes(body.type)) {
      return reply.status(400).send({ error: 'Geçersiz sipariş tipi' });
    }

    const phoneNorm = normalizePhone(body.customerPhone);
    if (!phoneNorm) {
      return reply.status(400).send({ error: 'Geçersiz telefon numarası' });
    }

    // Service availability
    const servicesSetting = await prisma.settings.findUnique({ where: { key: 'services' } });
    const services = (servicesSetting?.value as any) || { takeawayEnabled: true, deliveryEnabled: true };
    if (body.type === 'TAKEAWAY' && services.takeawayEnabled === false) {
      return reply.status(403).send({ error: 'Gel Al siparişi şu anda kapalıdır' });
    }
    if (body.type === 'DELIVERY' && services.deliveryEnabled === false) {
      return reply.status(403).send({ error: 'Eve Servis şu anda kapalıdır' });
    }
    if (body.type === 'DELIVERY' && !body.customerAddress?.trim()) {
      return reply.status(400).send({ error: 'Eve servis için adres gerekli' });
    }

    // Customer upsert (isVerified=false — guest)
    const customer = await prisma.customer.upsert({
      where: { phone: phoneNorm },
      update: {
        // Ad/email yoksa doldur, varsa dokunma
        name: body.customerName.trim() || undefined,
        email: body.customerEmail?.trim() || undefined,
      },
      create: {
        phone: phoneNorm,
        name: body.customerName.trim(),
        email: body.customerEmail?.trim() || null,
        isVerified: false,
        isActive: true,
      },
    });

    // Items + subtotal
    let subtotal = 0;
    const orderItems: any[] = [];
    for (const item of body.items || []) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `Ürün mevcut değil: ${item.menuItemId}` });
      }
      const price = (menuItem as any).discountPrice && (menuItem as any).discountUntil
        && new Date((menuItem as any).discountUntil) > new Date()
        ? Number((menuItem as any).discountPrice)
        : Number(menuItem.price);
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || [],
      });
    }
    // Bundle expansion (guest)
    if (body.bundles && body.bundles.length > 0) {
      const res = await expandBundles(prisma, body.bundles);
      if (!res.ok) return reply.status(400).send({ error: res.error });
      subtotal += res.subtotalDelta;
      for (const oi of res.orderItems) orderItems.push(oi);
    }

    const restaurantSettings = await prisma.settings.findUnique({ where: { key: 'restaurant' } });
    const taxRate = (restaurantSettings?.value as any)?.taxRate ?? 0;
    const tax = subtotal * (taxRate / 100);

    const tipAmount = Math.max(0, body.tip || 0);
    const deliveryAmount = body.type === 'DELIVERY' ? DELIVERY_FEE : 0;
    const finalTotal = subtotal + tax + tipAmount + deliveryAmount;

    const guestPaymentMethod =
      body.paymentMethod === 'ONLINE'
        ? PaymentMethod.ONLINE
        : body.paymentMethod === 'CREDIT_CARD'
        ? PaymentMethod.CREDIT_CARD
        : PaymentMethod.CASH;

    const order = await prisma.order.create({
      data: {
        customerName: body.customerName.trim(),
        customerPhone: phoneNorm,
        customerEmail: body.customerEmail?.trim() || null,
        customerAddress: body.customerAddress?.trim() || null,
        customerLatitude: typeof body.customerLatitude === 'number' ? body.customerLatitude : null,
        customerLongitude: typeof body.customerLongitude === 'number' ? body.customerLongitude : null,
        type: body.type,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: guestPaymentMethod,
        subtotal,
        tax,
        deliveryFee: deliveryAmount,
        tip: tipAmount,
        total: finalTotal,
        notes: body.notes,
        source: 'MOBILE_GUEST',
        items: { create: orderItems },
      },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    await prisma.customerOrder.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        pointsEarned: 0,
        pointsSpent: 0,
      },
    });

    // Misafir token: app sipariş takibi yapabilsin diye verir
    // (customer isVerified=false ama yine de mobile-orders/* endpoint'lerine erişebilir)
    const token = signCustomerToken(customer.id);

    if (body.paymentMethod !== 'ONLINE') {
      broadcastNewOrder(order);
      sendOrderCreatedPush(prisma, order).catch(() => {});
    }

    return {
      order,
      token,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        isVerified: customer.isVerified,
      },
    };
  });
}
