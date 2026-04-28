import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { toNumber, formatTL, formatDateShort, getPaymentMethodText, getOrderTypeText } from '../lib/format';

export function registerAnalyticsTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'get_daily_report',
    'Günlük satış raporunu getir',
    {
      date: z.string().optional().describe('Tarih (YYYY-MM-DD, varsayılan: bugün)'),
    },
    async ({ date }) => {
      try {
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const orders = await prisma.order.findMany({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: { not: 'CANCELLED' },
          },
          include: {
            items: { include: { menuItem: { select: { name: true } } } },
            payments: true,
          },
        });

        const cancelled = await prisma.order.count({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
            status: 'CANCELLED',
          },
        });

        const totalRevenue = orders.reduce((sum, o) => sum + toNumber(o.total), 0);
        const totalTips = orders.reduce((sum, o) => sum + toNumber(o.tip), 0);

        // Payment method breakdown
        const paymentBreakdown: Record<string, number> = {};
        for (const order of orders) {
          for (const payment of order.payments) {
            const method = payment.method;
            paymentBreakdown[method] = (paymentBreakdown[method] || 0) + toNumber(payment.amount);
          }
        }

        // Order type breakdown
        const typeBreakdown: Record<string, number> = {};
        for (const order of orders) {
          typeBreakdown[order.type] = (typeBreakdown[order.type] || 0) + 1;
        }

        // Top items
        const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
        for (const order of orders) {
          for (const item of order.items) {
            const key = item.menuItemId;
            if (!itemCounts[key]) {
              itemCounts[key] = { name: item.menuItem.name, count: 0, revenue: 0 };
            }
            itemCounts[key].count += item.quantity;
            itemCounts[key].revenue += toNumber(item.total);
          }
        }
        const topItems = Object.values(itemCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Hourly breakdown
        const hourly: Record<number, { count: number; revenue: number }> = {};
        for (const order of orders) {
          const hour = order.createdAt.getHours();
          if (!hourly[hour]) hourly[hour] = { count: 0, revenue: 0 };
          hourly[hour].count++;
          hourly[hour].revenue += toNumber(order.total);
        }

        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

        const text = [
          `=== Günlük Rapor: ${formatDateShort(targetDate)} ===`,
          '',
          `Toplam Sipariş: ${orders.length}`,
          `İptal Edilen: ${cancelled}`,
          `Toplam Gelir: ${formatTL(totalRevenue)}`,
          `Toplam Bahşiş: ${formatTL(totalTips)}`,
          `Ort. Sipariş Tutarı: ${formatTL(avgOrderValue)}`,
          '',
          '--- Ödeme Yöntemleri ---',
          ...Object.entries(paymentBreakdown).map(
            ([method, amount]) => `  ${getPaymentMethodText(method)}: ${formatTL(amount)}`
          ),
          '',
          '--- Sipariş Türleri ---',
          ...Object.entries(typeBreakdown).map(
            ([type, count]) => `  ${getOrderTypeText(type)}: ${count}`
          ),
          '',
          '--- En Çok Satan Ürünler ---',
          ...topItems.map(
            (item, i) => `  ${i + 1}. ${item.name}: ${item.count} adet (${formatTL(item.revenue)})`
          ),
          '',
          '--- Saatlik Dağılım ---',
          ...Object.entries(hourly)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(
              ([hour, data]) => `  ${String(hour).padStart(2, '0')}:00 - ${data.count} sipariş (${formatTL(data.revenue)})`
            ),
        ].join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_top_selling_items',
    'En çok satan ürünleri getir',
    {
      startDate: z.string().optional().describe('Başlangıç tarihi (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Bitiş tarihi (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Sonuç limiti (varsayılan: 20)'),
    },
    async ({ startDate, endDate, limit }) => {
      try {
        const where: Record<string, unknown> = {
          order: { status: { not: 'CANCELLED' } },
        };

        if (startDate || endDate) {
          const dateFilter: Record<string, Date> = {};
          if (startDate) dateFilter.gte = new Date(startDate);
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
          }
          where.createdAt = dateFilter;
        }

        const orderItems = await prisma.orderItem.findMany({
          where,
          include: {
            menuItem: { select: { name: true, price: true, categoryId: true } },
          },
        });

        const itemStats: Record<string, { name: string; count: number; revenue: number }> = {};
        for (const item of orderItems) {
          const key = item.menuItemId;
          if (!itemStats[key]) {
            itemStats[key] = { name: item.menuItem.name, count: 0, revenue: 0 };
          }
          itemStats[key].count += item.quantity;
          itemStats[key].revenue += toNumber(item.total);
        }

        const sorted = Object.values(itemStats)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit || 20);

        if (sorted.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Bu dönemde satış verisi bulunamadı.' }] };
        }

        const lines = sorted.map(
          (item, i) => `  ${i + 1}. ${item.name}: ${item.count} adet | ${formatTL(item.revenue)}`
        );

        const period = startDate && endDate
          ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
          : 'Tüm zamanlar';

        return {
          content: [{
            type: 'text' as const,
            text: `=== En Çok Satan Ürünler (${period}) ===\n\n${lines.join('\n')}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_revenue_summary',
    'Gelir özetini getir (günlük/haftalık/aylık)',
    {
      period: z.enum(['daily', 'weekly', 'monthly']).describe('Dönem: daily, weekly, monthly'),
      date: z.string().optional().describe('Referans tarih (YYYY-MM-DD, varsayılan: bugün)'),
    },
    async ({ period, date }) => {
      try {
        const refDate = date ? new Date(date) : new Date();
        let startDate: Date;
        let endDate: Date;

        if (period === 'daily') {
          startDate = new Date(refDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(refDate);
          endDate.setHours(23, 59, 59, 999);
        } else if (period === 'weekly') {
          startDate = new Date(refDate);
          startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
          endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const orders = await prisma.order.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: { not: 'CANCELLED' },
          },
          include: { payments: true },
        });

        const totalRevenue = orders.reduce((sum, o) => sum + toNumber(o.total), 0);
        const totalTips = orders.reduce((sum, o) => sum + toNumber(o.tip), 0);
        const totalServiceCharge = orders.reduce((sum, o) => sum + toNumber(o.serviceCharge), 0);
        const totalDiscount = orders.reduce((sum, o) => sum + toNumber(o.discount), 0);

        const completed = orders.filter((o) => o.status === 'COMPLETED').length;
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

        // Payment method breakdown
        const paymentBreakdown: Record<string, number> = {};
        for (const order of orders) {
          for (const payment of order.payments) {
            paymentBreakdown[payment.method] = (paymentBreakdown[payment.method] || 0) + toNumber(payment.amount);
          }
        }

        // Order type breakdown
        const typeBreakdown: Record<string, { count: number; revenue: number }> = {};
        for (const order of orders) {
          if (!typeBreakdown[order.type]) typeBreakdown[order.type] = { count: 0, revenue: 0 };
          typeBreakdown[order.type].count++;
          typeBreakdown[order.type].revenue += toNumber(order.total);
        }

        const periodLabel = period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık';

        const text = [
          `=== ${periodLabel} Gelir Özeti ===`,
          `Dönem: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`,
          '',
          `Toplam Sipariş: ${orders.length}`,
          `Tamamlanan: ${completed}`,
          `Toplam Gelir: ${formatTL(totalRevenue)}`,
          `Toplam İndirim: ${formatTL(totalDiscount)}`,
          `Servis Ücreti: ${formatTL(totalServiceCharge)}`,
          `Bahşiş: ${formatTL(totalTips)}`,
          `Ort. Sipariş: ${formatTL(avgOrderValue)}`,
          '',
          '--- Ödeme Yöntemleri ---',
          ...Object.entries(paymentBreakdown).map(
            ([method, amount]) => `  ${getPaymentMethodText(method)}: ${formatTL(amount)}`
          ),
          '',
          '--- Sipariş Türleri ---',
          ...Object.entries(typeBreakdown).map(
            ([type, data]) => `  ${getOrderTypeText(type)}: ${data.count} sipariş (${formatTL(data.revenue)})`
          ),
        ].join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );
}
