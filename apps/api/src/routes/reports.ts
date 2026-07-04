import { FastifyInstance, FastifyRequest } from 'fastify';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';

export default async function reportRoutes(server: FastifyInstance) {
  // Get daily summary
  server.get('/daily', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { date } = request.query as { date?: string };
    
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get orders for the day
    const orders = await request.db.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: OrderStatus.COMPLETED,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: true,
      },
    });

    // Calculate stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalTips = orders.reduce((sum, order) => sum + Number(order.tip || 0), 0);
    
    const cashAmount = orders
      .filter((o) => o.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, o) => sum + Number(o.total), 0);
    
    const cardAmount = orders
      .filter((o) => o.paymentMethod === PaymentMethod.CREDIT_CARD || o.paymentMethod === PaymentMethod.DEBIT_CARD)
      .reduce((sum, o) => sum + Number(o.total), 0);
    
    const otherAmount = totalRevenue - cashAmount - cardAmount;

    // Cancelled orders
    const cancelledOrders = await request.db.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: OrderStatus.CANCELLED,
      },
    });

    // Top selling items
    const itemSales: Record<string, { id: string; name: string; count: number; revenue: number }> = {};
    
    for (const order of orders) {
      for (const item of order.items) {
        const key = String(item.menuItemId || item.id);
        if (!itemSales[key]) {
          itemSales[key] = {
            id: String(item.menuItemId || item.id),
            name: item.menuItem?.name || 'Silinmiş Ürün',
            count: 0,
            revenue: 0,
          };
        }
        itemSales[key].count += item.quantity;
        itemSales[key].revenue += Number(item.total);
      }
    }

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average order time (from creation to completion)
    const orderTimes = orders
      .filter((o) => o.completedAt)
      .map((o) => (o.completedAt!.getTime() - o.createdAt.getTime()) / 60000); // in minutes
    
    const avgOrderTime = orderTimes.length > 0
      ? Math.round(orderTimes.reduce((sum, t) => sum + t, 0) / orderTimes.length)
      : null;

    // Hourly breakdown
    const hourlyBreakdown: Record<number, { orders: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyBreakdown[i] = { orders: 0, revenue: 0 };
    }
    
    for (const order of orders) {
      const hour = order.createdAt.getHours();
      hourlyBreakdown[hour].orders += 1;
      hourlyBreakdown[hour].revenue += Number(order.total);
    }

    // ===== Günlük giderler =====
    const dayExpenses = await request.db.expense.findMany({
      where: {
        expenseDate: { gte: startOfDay, lte: endOfDay },
        status: 'APPROVED',
      },
      include: { category: true },
    });
    const totalExpenses = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const expensesByCategoryMap: Record<string, { name: string; amount: number; icon?: string | null; color?: string | null }> = {};
    for (const e of dayExpenses) {
      const k = e.categoryId;
      if (!expensesByCategoryMap[k]) {
        expensesByCategoryMap[k] = { name: e.category.name, amount: 0, icon: e.category.icon, color: e.category.color };
      }
      expensesByCategoryMap[k].amount += Number(e.amount);
    }
    const expensesByCategory = Object.values(expensesByCategoryMap).sort((a, b) => b.amount - a.amount);
    const netProfit = totalRevenue - totalExpenses;

    return {
      date: targetDate.toISOString().split('T')[0],
      summary: {
        totalOrders,
        totalRevenue,
        totalTips,
        cashAmount,
        cardAmount,
        otherAmount,
        cancelledOrders,
        avgOrderTime,
        totalExpenses,
        netProfit,
      },
      topItems,
      hourlyBreakdown,
      expensesByCategory,
    };
  });

  // Get weekly summary
  server.get('/weekly', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { startDate } = request.query as { startDate?: string };
    
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const orders = await request.db.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
        status: OrderStatus.COMPLETED,
      },
    });

    // Daily breakdown
    const dailyBreakdown: Record<string, { orders: number; revenue: number }> = {};
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dailyBreakdown[days[i]] = { orders: 0, revenue: 0 };
    }

    for (const order of orders) {
      const dayName = days[order.createdAt.getDay()];
      dailyBreakdown[dayName].orders += 1;
      dailyBreakdown[dayName].revenue += Number(order.total);
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgDailyOrders = Math.round(totalOrders / 7);
    const avgDailyRevenue = Math.round(totalRevenue / 7);

    return {
      weekStart: start.toISOString().split('T')[0],
      weekEnd: new Date(end.getTime() - 1).toISOString().split('T')[0],
      summary: {
        totalOrders,
        totalRevenue,
        avgDailyOrders,
        avgDailyRevenue,
      },
      dailyBreakdown,
    };
  });

  // Get monthly summary
  server.get('/monthly', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { year, month, detailed } = request.query as {
      year?: string; month?: string; detailed?: string;
    };

    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const orders = await request.db.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: OrderStatus.COMPLETED,
      },
      include: {
        items: {
          include: {
            menuItem: { include: { category: true } },
          },
        },
        payments: { where: { refunded: false } },
      },
    });

    // Category breakdown
    const categoryBreakdown: Record<string, { name: string; orders: number; revenue: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!item.menuItem) continue;
        const catId = item.menuItem.categoryId;
        if (!categoryBreakdown[catId]) {
          categoryBreakdown[catId] = {
            name: item.menuItem.category.name,
            orders: 0,
            revenue: 0,
          };
        }
        categoryBreakdown[catId].orders += item.quantity;
        categoryBreakdown[catId].revenue += Number(item.total);
      }
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const daysInMonth = end.getDate();
    const avgDailyOrders = Math.round(totalOrders / daysInMonth);
    const avgDailyRevenue = Math.round(totalRevenue / daysInMonth);

    // ===== Aylık giderler =====
    const monthExpenses = await request.db.expense.findMany({
      where: { expenseDate: { gte: start, lte: end }, status: 'APPROVED' },
      include: { category: true },
    });
    const totalExpenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const expenseByCategoryMap: Record<string, { name: string; amount: number; count: number; icon?: string | null; color?: string | null }> = {};
    for (const e of monthExpenses) {
      const k = e.categoryId;
      if (!expenseByCategoryMap[k]) {
        expenseByCategoryMap[k] = { name: e.category.name, amount: 0, count: 0, icon: e.category.icon, color: e.category.color };
      }
      expenseByCategoryMap[k].amount += Number(e.amount);
      expenseByCategoryMap[k].count += 1;
    }
    const netProfit = totalRevenue - totalExpenses;

    const result: any = {
      year: targetYear,
      month: targetMonth + 1,
      summary: {
        totalOrders,
        totalRevenue,
        avgDailyOrders,
        avgDailyRevenue,
        daysInMonth,
        totalExpenses,
        netProfit,
      },
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.revenue - a.revenue),
      expenseBreakdown: Object.values(expenseByCategoryMap).sort((a, b) => b.amount - a.amount),
    };

    // Detailed breakdown — adds per-day stats with hourly distribution and
    // top items per day. Used by the AI-prompt generator on the Reports page.
    if (detailed === 'true' || detailed === '1') {
      const days: Record<string, {
        date: string;
        orders: number;
        revenue: number;
        cancelled: number;
        cashAmount: number;
        cardAmount: number;
        otherAmount: number;
        expenses: number;
        netProfit: number;
        hourly: Record<number, { orders: number; revenue: number }>;
        topItems: Record<string, { name: string; count: number; revenue: number }>;
      }> = {};

      // Seed every day in the month so empty days still appear in the prompt.
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(targetYear, targetMonth, d);
        const key = day.toISOString().split('T')[0];
        days[key] = {
          date: key, orders: 0, revenue: 0, cancelled: 0,
          cashAmount: 0, cardAmount: 0, otherAmount: 0,
          expenses: 0, netProfit: 0,
          hourly: {}, topItems: {},
        };
      }

      // Daily expenses fold-in
      for (const e of monthExpenses) {
        const key = e.expenseDate.toISOString().split('T')[0];
        if (days[key]) days[key].expenses += Number(e.amount);
      }

      // Also pull cancelled orders for the cancellation column
      const cancelled = await request.db.order.findMany({
        where: { createdAt: { gte: start, lte: end }, status: OrderStatus.CANCELLED },
        select: { createdAt: true },
      });
      for (const c of cancelled) {
        const key = c.createdAt.toISOString().split('T')[0];
        if (days[key]) days[key].cancelled += 1;
      }

      for (const o of orders) {
        const key = o.createdAt.toISOString().split('T')[0];
        const day = days[key];
        if (!day) continue;
        day.orders += 1;
        day.revenue += Number(o.total);
        const hour = o.createdAt.getHours();
        if (!day.hourly[hour]) day.hourly[hour] = { orders: 0, revenue: 0 };
        day.hourly[hour].orders += 1;
        day.hourly[hour].revenue += Number(o.total);

        for (const item of o.items) {
          if (!item.menuItem) continue;
          const id = item.menuItem.id;
          if (!day.topItems[id]) {
            day.topItems[id] = { name: item.menuItem.name, count: 0, revenue: 0 };
          }
          day.topItems[id].count += item.quantity;
          day.topItems[id].revenue += Number(item.total);
        }

        // Payment breakdown per day (cash / card / other)
        for (const p of o.payments || []) {
          const amt = Number(p.amount);
          if (p.method === 'CASH') day.cashAmount += amt;
          else if (p.method === 'CREDIT_CARD' || p.method === 'DEBIT_CARD' || p.method === 'ONLINE') day.cardAmount += amt;
          else day.otherAmount += amt;
        }
      }

      // Reduce topItems per day to a sorted top-5 list (smaller payload)
      result.dailyBreakdown = Object.values(days)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          date: d.date,
          orders: d.orders,
          revenue: d.revenue,
          cancelled: d.cancelled,
          cashAmount: d.cashAmount,
          cardAmount: d.cardAmount,
          otherAmount: d.otherAmount,
          expenses: d.expenses,
          netProfit: d.revenue - d.expenses,
          hourly: d.hourly,
          topItems: Object.values(d.topItems)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        }));
    }

    return result;
  });

  // Get staff performance
  server.get('/staff', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await request.db.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: OrderStatus.COMPLETED,
        userId: { not: null },
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    const staffStats: Record<string, { 
      id: string; 
      name: string; 
      role: string;
      orderCount: number; 
      totalRevenue: number;
      avgOrderValue: number;
    }> = {};

    for (const order of orders) {
      if (!order.userId) continue;
      
      if (!staffStats[order.userId]) {
        staffStats[order.userId] = {
          id: order.userId,
          name: order.user?.name || 'Bilinmiyor',
          role: order.user?.role || 'WAITER',
          orderCount: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        };
      }
      
      staffStats[order.userId].orderCount += 1;
      staffStats[order.userId].totalRevenue += Number(order.total);
    }

    // Calculate averages
    for (const staff of Object.values(staffStats)) {
      staff.avgOrderValue = staff.orderCount > 0 
        ? Math.round(staff.totalRevenue / staff.orderCount) 
        : 0;
    }

    return {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      staff: Object.values(staffStats).sort((a, b) => b.totalRevenue - a.totalRevenue),
    };
  });
}

