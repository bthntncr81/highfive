import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, OrderStatus, OrderType, PaymentMethod, PaymentStatus, TableStatus } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';
import { broadcastNewOrder, broadcastOrderUpdate, broadcastTableUpdate } from '../websocket';

// Award loyalty points after payment
async function awardLoyaltyPoints(prisma: PrismaClient, phone: string, orderId: string, totalAmount: number) {
  try {
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Find customer by phone
    const customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
      include: { loyaltyTier: true },
    });

    if (!customer) {
      console.log(`📍 Loyalty: No customer found for phone ${cleanPhone}`);
      return;
    }

    // Check if points already awarded for this order (prevent duplicates)
    const existingTransaction = await prisma.pointsTransaction.findFirst({
      where: { customerId: customer.id, orderId },
    });

    if (existingTransaction) {
      console.log(`📍 Loyalty: Points already awarded for order ${orderId}`);
      return;
    }

    // Get loyalty settings (default: 10 TL = 1 point)
    const settings = await prisma.settings.findUnique({ where: { key: 'loyalty' } });
    const pointsPerTL = (settings?.value as any)?.pointsPerTL || 10;
    
    // Calculate points (with tier multiplier)
    const basePoints = Math.floor(totalAmount / pointsPerTL);
    const multiplier = customer.loyaltyTier?.pointsMultiplier ? Number(customer.loyaltyTier.pointsMultiplier) : 1;
    const earnedPoints = Math.floor(basePoints * multiplier);

    if (earnedPoints <= 0) {
      console.log(`📍 Loyalty: No points to award for ${totalAmount} TL`);
      return;
    }

    // Update customer points
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalPoints: { increment: earnedPoints },
        lifetimePoints: { increment: earnedPoints },
        totalSpent: { increment: totalAmount },
        orderCount: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });

    // Create points transaction record
    await prisma.pointsTransaction.create({
      data: {
        customerId: customer.id,
        orderId,
        points: earnedPoints,
        type: 'EARN',
        description: `Sipariş #${orderId.slice(-6)} - ${totalAmount.toFixed(2)} TL`,
      },
    });

    // Create customer order record
    await prisma.customerOrder.upsert({
      where: { orderId },
      update: { pointsEarned: earnedPoints },
      create: {
        customerId: customer.id,
        orderId,
        pointsEarned: earnedPoints,
        pointsSpent: 0,
      },
    });

    console.log(`📍 Loyalty: Awarded ${earnedPoints} points to ${customer.name || cleanPhone} (Total: ${customer.totalPoints + earnedPoints})`);

    // Check for tier upgrade
    const tiers = await prisma.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { minPoints: 'desc' },
    });

    // Find the highest tier the customer qualifies for
    for (const tier of tiers) {
      if (customer.lifetimePoints + earnedPoints >= tier.minPoints) {
        if (customer.loyaltyTierId !== tier.id) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { loyaltyTierId: tier.id },
          });
          console.log(`📍 Loyalty: Upgraded ${customer.name || customer.phone} to ${tier.name}!`);
        }
        break;
      }
    }
  } catch (error) {
    console.error('❌ Loyalty points error:', error);
    // Don't throw - payment should still succeed even if points fail
  }
}

// Sipariş verildiğinde ham madde stoklarını düş
async function deductRawMaterialStock(
  prisma: PrismaClient,
  orderItems: { menuItemId: string; quantity: number }[]
) {
  try {
    for (const orderItem of orderItems) {
      // Bu menü ürününün içeriklerini getir
      const ingredients = await prisma.menuItemIngredient.findMany({
        where: { menuItemId: orderItem.menuItemId },
        include: { rawMaterial: true },
      });

      for (const ingredient of ingredients) {
        const deductAmount = Number(ingredient.amount) * orderItem.quantity;
        if (deductAmount <= 0) continue;

        const currentStock = Number(ingredient.rawMaterial.currentStock);
        const newStock = Math.max(0, currentStock - deductAmount);

        await prisma.rawMaterial.update({
          where: { id: ingredient.rawMaterialId },
          data: { currentStock: newStock },
        });

        console.log(
          `📦 Stok düşüldü: ${ingredient.rawMaterial.name} -${deductAmount} (${currentStock} → ${newStock})`
        );
      }
    }
  } catch (error) {
    console.error('❌ Ham madde stok düşüm hatası:', error);
    // Sipariş yine de oluşturulsun, stok hatası engellemesin
  }
}

// Sipariş iptal edildiğinde stokları geri ekle
async function restoreRawMaterialStock(
  prisma: PrismaClient,
  orderItems: { menuItemId: string; quantity: number }[]
) {
  try {
    for (const orderItem of orderItems) {
      const ingredients = await prisma.menuItemIngredient.findMany({
        where: { menuItemId: orderItem.menuItemId },
        include: { rawMaterial: true },
      });

      for (const ingredient of ingredients) {
        const restoreAmount = Number(ingredient.amount) * orderItem.quantity;
        if (restoreAmount <= 0) continue;

        await prisma.rawMaterial.update({
          where: { id: ingredient.rawMaterialId },
          data: {
            currentStock: { increment: restoreAmount },
          },
        });

        console.log(
          `📦 Stok geri eklendi: ${ingredient.rawMaterial.name} +${restoreAmount}`
        );
      }
    }
  } catch (error) {
    console.error('❌ Ham madde stok geri ekleme hatası:', error);
  }
}

export default async function orderRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Get all orders (with filters)
  server.get('/', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { status, type, date, tableId, limit } = request.query as {
      status?: OrderStatus;
      type?: OrderType;
      date?: string;
      tableId?: string;
      limit?: string;
    };

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (tableId) {
      where.tableId = tableId;
    }
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 100,
    });

    return { orders };
  });

  // Get active orders (for kitchen display) - no auth required for kitchen screens
  server.get('/active', async () => {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY],
        },
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: {
              include: {
                ingredients: {
                  include: { rawMaterial: true },
                  orderBy: { rawMaterial: { name: 'asc' } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { orders };
  });

  // Get single order
  server.get('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: true,
        invoice: true,
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    return { order };
  });

  // Get order status (public - for customer tracking)
  server.get('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        type: true,
        customerName: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            menuItem: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    // Format response for client
    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        type: order.type,
        customerName: order.customerName,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          name: item.menuItem.name,
          quantity: item.quantity,
        })),
      },
    };
  });

  // Create customer order (public - for QR code orders from landing page)
  server.post('/customer', async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      tableId,
      sessionToken,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      type,
      items,
      notes,
      tip,
      deliveryFee,
    } = request.body as {
      tableId?: string;
      sessionToken?: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      type?: OrderType;
      items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
      notes?: string;
      tip?: number;
      deliveryFee?: number;
    };

    if (!items || items.length === 0) {
      return reply.status(400).send({ error: 'En az bir ürün gerekli' });
    }

    // Validate session token for table orders
    if (tableId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table) {
        return reply.status(404).send({ error: 'Masa bulunamadı' });
      }

      // Check if session token is valid
      if (!sessionToken || table.sessionToken !== sessionToken) {
        return reply.status(403).send({ 
          error: 'Oturum süresi dolmuş. Lütfen QR kodu tekrar okutun.',
          code: 'SESSION_EXPIRED'
        });
      }

      // Check if table is still occupied (session active)
      if (table.status === 'FREE') {
        return reply.status(403).send({ 
          error: 'Bu masa için oturum kapatılmış. Lütfen QR kodu tekrar okutun.',
          code: 'SESSION_CLOSED'
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `Ürün mevcut değil: ${item.menuItemId}` });
      }

      const itemTotal = Number(menuItem.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || [],
      });
    }

    // Get tax rate from settings
    const settings = await prisma.settings.findUnique({ where: { key: 'restaurant' } });
    const taxRate = (settings?.value as any)?.taxRate || 10;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // Determine order type
    let orderType = type;
    if (!orderType) {
      orderType = tableId ? OrderType.DINE_IN : OrderType.TAKEAWAY;
    }

    // Create order - include tip and delivery fee in total if provided
    const tipAmount = tip || 0;
    const deliveryAmount = deliveryFee || 0;
    const finalTotal = total + tipAmount + deliveryAmount;
    
    const order = await prisma.order.create({
      data: {
        tableId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        type: orderType,
        status: OrderStatus.PENDING,
        subtotal,
        tax,
        total: finalTotal,
        tip: tipAmount,
        deliveryFee: deliveryAmount,
        notes,
        source: tableId ? 'QR' : 'WEB',
        items: {
          create: orderItems,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Ham madde stoklarını düş
    await deductRawMaterialStock(prisma, items);

    // Update table status if table order
    if (tableId) {
      const table = await prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED },
      });
      broadcastTableUpdate(table);
    }

    // Broadcast new order
    broadcastNewOrder(order);

    return { order };
  });

  // Create order (POS - requires auth)
  server.post('/', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      tableId,
      customerName,
      customerPhone,
      type,
      items,
      notes,
      source,
    } = request.body as {
      tableId?: string;
      customerName?: string;
      customerPhone?: string;
      type?: OrderType;
      items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
      notes?: string;
      source?: string;
    };

    if (!items || items.length === 0) {
      return reply.status(400).send({ error: 'En az bir ürün gerekli' });
    }

    const user = (request as any).user;

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `Ürün mevcut değil: ${item.menuItemId}` });
      }

      const itemTotal = Number(menuItem.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || [],
      });
    }

    // Get tax rate from settings
    const settings = await prisma.settings.findUnique({ where: { key: 'restaurant' } });
    const taxRate = (settings?.value as any)?.taxRate || 10;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // Create order
    const order = await prisma.order.create({
      data: {
        tableId,
        userId: user.userId,
        customerName,
        customerPhone,
        type: type || (tableId ? OrderType.DINE_IN : OrderType.TAKEAWAY),
        status: OrderStatus.PENDING,
        subtotal,
        tax,
        total,
        notes,
        source: source || 'POS',
        items: {
          create: orderItems,
        },
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Ham madde stoklarını düş
    await deductRawMaterialStock(prisma, items);

    // Update table status if table order
    if (tableId) {
      const table = await prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED },
      });
      broadcastTableUpdate(table);
    }

    // Broadcast new order
    broadcastNewOrder(order);

    return { order };
  });

  // Update order status - open for kitchen screens
  server.patch('/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: OrderStatus };

    if (!status) {
      return reply.status(400).send({ error: 'Durum gerekli' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    const updateData: any = { status };
    
    if (status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
      
      // Free up table if table order
      if (order.tableId) {
        const table = await prisma.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.CLEANING },
        });
        broadcastTableUpdate(table);
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Update individual item statuses
    if (status === OrderStatus.PREPARING || status === OrderStatus.READY || status === OrderStatus.SERVED) {
      await prisma.orderItem.updateMany({
        where: { orderId: id },
        data: { status },
      });
    }

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder };
  });

  // Update individual item status (for kitchen) - open for kitchen screens
  server.patch('/:id/items/:itemId/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const { status } = request.body as { status: OrderStatus };

    const orderItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
    });

    // Check if all items have the same status
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        table: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (order) {
      const allSameStatus = order.items.every((item) => item.status === status);
      if (allSameStatus && order.status !== status) {
        await prisma.order.update({
          where: { id },
          data: { status },
        });
      }
      
      broadcastOrderUpdate(order);
    }

    return { item: orderItem };
  });

  // Add items to existing order
  server.post('/:id/items', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { items } = request.body as {
      items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
    };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      return reply.status(400).send({ error: 'Bu siparişe ürün eklenemez' });
    }

    let additionalTotal = 0;
    const newItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.available) {
        return reply.status(400).send({ error: `Ürün mevcut değil: ${item.menuItemId}` });
      }

      const itemTotal = Number(menuItem.price) * item.quantity;
      additionalTotal += itemTotal;

      newItems.push({
        orderId: id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        notes: item.notes,
        modifiers: item.modifiers || [],
        status: OrderStatus.PENDING,
      });
    }

    await prisma.orderItem.createMany({
      data: newItems,
    });

    // Ham madde stoklarını düş (eklenen ürünler için)
    await deductRawMaterialStock(prisma, items);

    // Update order totals
    const settings = await prisma.settings.findUnique({ where: { key: 'restaurant' } });
    const taxRate = (settings?.value as any)?.taxRate || 10;
    const newSubtotal = Number(order.subtotal) + additionalTotal;
    const newTax = newSubtotal * (taxRate / 100);
    const newTotal = newSubtotal + newTax;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder };
  });

  // Process payment (with optional item-specific payment for split bills)
  server.post('/:id/payment', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { amount, method, tip, paidItems } = request.body as {
      amount: number;
      method: PaymentMethod;
      tip?: number;
      paidItems?: { [itemId: string]: number }; // itemId -> quantity for split payment
    };

    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        payments: { where: { refunded: false } },
        items: true,
      },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    // Calculate paid amount (only non-refunded payments)
    const paidAmount = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalWithTip = Number(order.total) + (tip || 0);
    const remaining = totalWithTip - paidAmount;

    if (amount > remaining + 0.01) { // Small tolerance for rounding
      return reply.status(400).send({ error: 'Ödeme tutarı kalan tutardan fazla olamaz' });
    }

    // Create payment with item info
    await prisma.payment.create({
      data: {
        orderId: id,
        amount,
        method,
        paidItems: paidItems ? paidItems : undefined,
      },
    });

    // Update item paid quantities if split payment
    if (paidItems) {
      for (const [itemId, qty] of Object.entries(paidItems)) {
        const item = order.items.find(i => i.id === itemId);
        if (item) {
          await prisma.orderItem.update({
            where: { id: itemId },
            data: { paidQuantity: item.paidQuantity + qty },
          });
        }
      }
    } else {
      // If full payment, mark all items as paid
      const newPaidAmount = paidAmount + amount;
      if (newPaidAmount >= totalWithTip) {
        // Mark all items as fully paid
        for (const item of order.items) {
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { paidQuantity: item.quantity },
          });
        }
      }
    }

    // Update order
    const newPaidAmount = paidAmount + amount;
    const isPaid = newPaidAmount >= totalWithTip;
    const newPaymentStatus = isPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: newPaymentStatus,
        paymentMethod: method,
        tip: tip || order.tip,
        status: isPaid ? OrderStatus.COMPLETED : order.status,
        completedAt: isPaid ? new Date() : order.completedAt,
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: { where: { refunded: false } },
      },
    });

    // Award loyalty points if payment is complete and customer phone exists
    if (isPaid && order.customerPhone) {
      await awardLoyaltyPoints(prisma, order.customerPhone, order.id, Number(order.total));
    }

    // Free table if paid
    if (isPaid && order.tableId) {
      const table = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.CLEANING },
      });
      broadcastTableUpdate(table);
    }

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder };
  });

  // Refund payment
  server.post('/:id/payment/:paymentId/refund', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, paymentId } = request.params as { id: string; paymentId: string };
    const user = (request as any).user;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });

    if (!payment || payment.orderId !== id) {
      return reply.status(404).send({ error: 'Ödeme bulunamadı' });
    }

    if (payment.refunded) {
      return reply.status(400).send({ error: 'Bu ödeme zaten iade edilmiş' });
    }

    // Mark payment as refunded
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        refunded: true,
        refundedAt: new Date(),
        refundedBy: user?.userId,
      },
    });

    // If payment had item-specific info, reduce paidQuantity
    if (payment.paidItems) {
      const paidItems = payment.paidItems as { [itemId: string]: number };
      for (const [itemId, qty] of Object.entries(paidItems)) {
        const item = payment.order.items.find(i => i.id === itemId);
        if (item) {
          await prisma.orderItem.update({
            where: { id: itemId },
            data: { paidQuantity: Math.max(0, item.paidQuantity - qty) },
          });
        }
      }
    }

    // Recalculate order payment status
    const remainingPayments = await prisma.payment.findMany({
      where: { orderId: id, refunded: false },
    });
    const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const order = await prisma.order.findUnique({ where: { id } });
    
    let newPaymentStatus: PaymentStatus;
    if (totalPaid <= 0) {
      newPaymentStatus = PaymentStatus.PENDING;
    } else if (totalPaid >= Number(order!.total)) {
      newPaymentStatus = PaymentStatus.PAID;
    } else {
      newPaymentStatus = PaymentStatus.PARTIAL;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus: newPaymentStatus,
        status: newPaymentStatus === PaymentStatus.PAID ? OrderStatus.COMPLETED : OrderStatus.SERVED,
        completedAt: newPaymentStatus === PaymentStatus.PAID ? new Date() : null,
      },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        items: { include: { menuItem: true } },
        payments: { where: { refunded: false } },
      },
    });

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder, message: 'Ödeme iade edildi' };
  });

  // Cancel order
  server.post('/:id/cancel', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };

    const order = await prisma.order.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    if (order.status === OrderStatus.COMPLETED) {
      return reply.status(400).send({ error: 'Tamamlanmış sipariş iptal edilemez' });
    }

    // İptal edilen siparişin ürünlerini al ve stokları geri ekle
    const cancelledItems = await prisma.orderItem.findMany({
      where: { orderId: id },
      select: { menuItemId: true, quantity: true },
    });
    await restoreRawMaterialStock(prisma, cancelledItems);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        notes: reason ? `${order.notes || ''}\nİptal nedeni: ${reason}` : order.notes,
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Free table
    if (order.tableId) {
      const table = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.FREE },
      });
      broadcastTableUpdate(table);
    }

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder };
  });

  // ==================== COURIER ROUTES ====================

  // Kurye siparişi alsın (pickup)
  server.patch('/:id/courier/pickup', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { courierId } = request.body as { courierId?: string };
    const user = (request as any).user;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    if (order.type !== 'TAKEAWAY' && order.type !== 'DELIVERY') {
      return reply.status(400).send({ error: 'Bu sipariş paket/teslimat değil' });
    }

    if (order.status !== 'READY') {
      return reply.status(400).send({ error: 'Sipariş henüz hazır değil' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        courierId: courierId || user.id,
        assignedAt: order.assignedAt || new Date(),
        pickedUpAt: new Date(),
        status: OrderStatus.SERVED, // Yola çıktı
      },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        courier: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
    });

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder, message: 'Sipariş alındı' };
  });

  // Kurye siparişi teslim etsin
  server.patch('/:id/courier/deliver', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    if (!order.pickedUpAt) {
      return reply.status(400).send({ error: 'Sipariş henüz alınmadı' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveredAt: new Date(),
        completedAt: new Date(),
        status: OrderStatus.COMPLETED,
      },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        courier: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
    });

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder, message: 'Sipariş teslim edildi' };
  });

  // Kuryeye sipariş atama (admin/manager)
  server.patch('/:id/courier/assign', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { courierId } = request.body as { courierId: string };

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    const courier = await prisma.user.findUnique({
      where: { id: courierId },
    });

    if (!courier || courier.role !== 'COURIER') {
      return reply.status(400).send({ error: 'Geçersiz kurye' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        courierId,
        assignedAt: new Date(),
      },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
        courier: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
    });

    broadcastOrderUpdate(updatedOrder);

    return { order: updatedOrder, message: 'Kurye atandı' };
  });

  // Kuryeleri listele
  server.get('/couriers/list', { preHandler: verifyAuth }, async () => {
    const couriers = await prisma.user.findMany({
      where: {
        role: 'COURIER',
        active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
      },
    });

    // Her kurye için aktif sipariş sayısını hesapla
    const couriersWithStats = await Promise.all(
      couriers.map(async (courier) => {
        const activeOrders = await prisma.order.count({
          where: {
            courierId: courier.id,
            status: {
              in: ['READY', 'SERVED'], // Hazır veya yolda
            },
          },
        });

        const todayDeliveries = await prisma.order.count({
          where: {
            courierId: courier.id,
            status: 'COMPLETED',
            completedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        });

        return {
          ...courier,
          activeOrders,
          todayDeliveries,
        };
      })
    );

    return { couriers: couriersWithStats };
  });
}

