import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { toNumber, formatTL, formatDate, formatOrderNumber, getOrderStatusText, getOrderTypeText, getPaymentMethodText } from '../lib/format';

export function registerOrderTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'list_orders',
    'Siparişleri filtrele ve listele',
    {
      status: z.string().optional().describe('Sipariş durumu: PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, SERVED, COMPLETED, CANCELLED'),
      type: z.string().optional().describe('Sipariş türü: DINE_IN, TAKEAWAY, DELIVERY, ROOM_SERVICE'),
      date: z.string().optional().describe('Tarih filtresi (YYYY-MM-DD)'),
      tableId: z.string().optional().describe('Masa ID filtresi'),
      limit: z.number().optional().describe('Sonuç limiti (varsayılan: 50)'),
    },
    async ({ status, type, date, tableId, limit }) => {
      try {
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (type) where.type = type;
        if (tableId) where.tableId = tableId;
        if (date) {
          const start = new Date(date);
          const end = new Date(date);
          end.setDate(end.getDate() + 1);
          where.createdAt = { gte: start, lt: end };
        }

        const orders = await prisma.order.findMany({
          where,
          include: {
            table: true,
            user: { select: { name: true } },
            items: { include: { menuItem: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit || 50,
        });

        if (orders.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Sipariş bulunamadı.' }] };
        }

        const lines = orders.map((o) => {
          const items = o.items.map((i) => `  - ${i.menuItem.name} x${i.quantity}`).join('\n');
          return [
            `${formatOrderNumber(o.orderNumber)} | ${getOrderStatusText(o.status)} | ${getOrderTypeText(o.type)}`,
            `  Masa: ${o.table?.name || o.table?.number || '-'} | Garson: ${o.user?.name || '-'}`,
            `  Toplam: ${formatTL(toNumber(o.total))} | ${formatDate(o.createdAt)}`,
            items,
          ].join('\n');
        });

        return {
          content: [{ type: 'text' as const, text: `=== Siparişler (${orders.length}) ===\n\n${lines.join('\n\n')}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_order',
    'Sipariş detayını getir (ürünler, ödemeler dahil)',
    { orderId: z.string().describe('Sipariş ID') },
    async ({ orderId }) => {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            table: true,
            user: { select: { name: true, role: true } },
            courier: { select: { name: true, phone: true } },
            items: {
              include: {
                menuItem: {
                  select: { name: true, price: true },
                },
              },
            },
            payments: true,
            invoice: true,
          },
        });

        if (!order) {
          return { content: [{ type: 'text' as const, text: `Sipariş bulunamadı: ${orderId}` }] };
        }

        const items = order.items
          .map((i) => `  - ${i.menuItem.name} x${i.quantity} = ${formatTL(toNumber(i.total))}${i.notes ? ` (${i.notes})` : ''}${i.modifiers.length > 0 ? ` [${i.modifiers.join(', ')}]` : ''}`)
          .join('\n');

        const payments = order.payments
          .map((p) => `  - ${getPaymentMethodText(p.method)}: ${formatTL(toNumber(p.amount))}${p.tipAmount && toNumber(p.tipAmount) > 0 ? ` (+${formatTL(toNumber(p.tipAmount))} bahşiş)` : ''}`)
          .join('\n');

        const text = [
          `=== Sipariş ${formatOrderNumber(order.orderNumber)} ===`,
          `Durum: ${getOrderStatusText(order.status)}`,
          `Tür: ${getOrderTypeText(order.type)}`,
          `Masa: ${order.table?.name || order.table?.number || '-'}`,
          `Garson: ${order.user?.name || '-'}`,
          order.courier ? `Kurye: ${order.courier.name} (${order.courier.phone})` : null,
          order.customerName ? `Müşteri: ${order.customerName}` : null,
          order.customerPhone ? `Telefon: ${order.customerPhone}` : null,
          order.customerAddress ? `Adres: ${order.customerAddress}` : null,
          order.notes ? `Not: ${order.notes}` : null,
          order.source ? `Kaynak: ${order.source}` : null,
          '',
          '--- Ürünler ---',
          items,
          '',
          '--- Fiyatlandırma ---',
          `  Ara Toplam: ${formatTL(toNumber(order.subtotal))}`,
          toNumber(order.discount) > 0 ? `  İndirim: -${formatTL(toNumber(order.discount))}` : null,
          toNumber(order.tax) > 0 ? `  KDV: ${formatTL(toNumber(order.tax))}` : null,
          toNumber(order.serviceCharge) > 0 ? `  Servis: ${formatTL(toNumber(order.serviceCharge))}` : null,
          toNumber(order.deliveryFee) > 0 ? `  Kurye: ${formatTL(toNumber(order.deliveryFee))}` : null,
          toNumber(order.tip) > 0 ? `  Bahşiş: ${formatTL(toNumber(order.tip))}` : null,
          `  TOPLAM: ${formatTL(toNumber(order.total))}`,
          '',
          order.payments.length > 0 ? `--- Ödemeler ---\n${payments}` : 'Ödeme: Henüz yapılmadı',
          '',
          `Oluşturulma: ${formatDate(order.createdAt)}`,
          order.completedAt ? `Tamamlanma: ${formatDate(order.completedAt)}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'update_order_status',
    'Sipariş durumunu güncelle',
    {
      orderId: z.string().describe('Sipariş ID'),
      status: z.enum([
        'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
        'OUT_FOR_DELIVERY', 'DELIVERED', 'SERVED', 'COMPLETED', 'CANCELLED',
      ]).describe('Yeni sipariş durumu'),
    },
    async ({ orderId, status }) => {
      try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          return { content: [{ type: 'text' as const, text: `Sipariş bulunamadı: ${orderId}` }] };
        }

        const updateData: Record<string, unknown> = { status };
        if (status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }

        const updated = await prisma.order.update({
          where: { id: orderId },
          data: updateData,
        });

        // If completed and has a table, set table to CLEANING
        if (status === 'COMPLETED' && updated.tableId) {
          await prisma.table.update({
            where: { id: updated.tableId },
            data: { status: 'CLEANING' },
          });
        }

        return {
          content: [{
            type: 'text' as const,
            text: `Sipariş ${formatOrderNumber(updated.orderNumber)} durumu güncellendi: ${getOrderStatusText(status)}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_active_orders',
    'Aktif siparişleri getir (mutfak görünümü)',
    {},
    async () => {
      try {
        const orders = await prisma.order.findMany({
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
          },
          include: {
            table: true,
            user: { select: { name: true } },
            items: {
              include: {
                menuItem: {
                  select: { name: true },
                  },
                },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (orders.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Aktif sipariş yok.' }] };
        }

        const lines = orders.map((o) => {
          const elapsed = Math.round((Date.now() - o.createdAt.getTime()) / 60000);
          const items = o.items
            .map((i) => `    ${i.menuItem.name} x${i.quantity} [${getOrderStatusText(i.status)}]${i.notes ? ` - ${i.notes}` : ''}`)
            .join('\n');
          return [
            `${formatOrderNumber(o.orderNumber)} | ${getOrderStatusText(o.status)} | ${elapsed} dk`,
            `  ${o.table ? `Masa: ${o.table.name || o.table.number}` : 'Paket'} | ${getOrderTypeText(o.type)}`,
            items,
          ].join('\n');
        });

        return {
          content: [{ type: 'text' as const, text: `=== Aktif Siparişler (${orders.length}) ===\n\n${lines.join('\n\n')}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );
}
