// Gider CRUD + filtreleme + onay + istatistik.
// Roller: ADMIN/MANAGER full CRUD + approve; CASHIER read all + create + edit/delete own only.
// Auto-approve: ADMIN/MANAGER her zaman APPROVED. CASHIER amount >= threshold ise PENDING_APPROVAL.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ExpenseStatus, PaymentMethod, UserRole, Prisma } from '@prisma/client';
import { verifyAuth, verifyAdmin } from '../middleware/auth';
import type { DbLike } from '../lib/tenant-db';

type AuthUser = { userId: string; role: UserRole };

const EXPENSE_VIEWER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER];

function hasViewAccess(user: AuthUser | undefined): boolean {
  return !!user && EXPENSE_VIEWER_ROLES.includes(user.role);
}

function canEditExpense(user: AuthUser, expense: { createdById: string }): boolean {
  if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) return true;
  if (user.role === UserRole.CASHIER && expense.createdById === user.userId) return true;
  return false;
}

async function getAutoApproveThreshold(prisma: DbLike): Promise<number> {
  const setting = await prisma.settings.findFirst({
    where: { key: 'expense_auto_approve_threshold' },
  });
  const v = setting?.value as { amount?: number } | null;
  return typeof v?.amount === 'number' ? v.amount : 10000;
}

export default async function expenseRoutes(server: FastifyInstance) {
  // List with filters
  server.get('/', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    if (!hasViewAccess(user)) {
      return reply.status(403).send({ error: 'Bu sayfaya erişim yetkiniz yok' });
    }

    const q = (request.query ?? {}) as {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      paymentMethod?: string;
      createdById?: string;
      status?: string;
      search?: string;
      sortBy?: 'expenseDate' | 'amount';
      sortOrder?: 'asc' | 'desc';
      page?: string;
      pageSize?: string;
    };

    const where: Prisma.ExpenseWhereInput = {};
    if (q.startDate || q.endDate) {
      where.expenseDate = {};
      if (q.startDate) (where.expenseDate as any).gte = new Date(q.startDate);
      if (q.endDate) (where.expenseDate as any).lte = new Date(q.endDate);
    }
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.paymentMethod) where.paymentMethod = q.paymentMethod as PaymentMethod;
    if (q.createdById) where.createdById = q.createdById;
    if (q.status) where.status = q.status as ExpenseStatus;
    if (q.search) {
      where.OR = [
        { description: { contains: q.search, mode: 'insensitive' } },
        { vendor: { contains: q.search, mode: 'insensitive' } },
        { notes: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = q.sortBy === 'amount' ? 'amount' : 'expenseDate';
    const sortOrder = q.sortOrder === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 50));

    const [expenses, total] = await Promise.all([
      request.db.expense.findMany({
        where,
        include: {
          category: true,
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      request.db.expense.count({ where }),
    ]);

    return { expenses, total, page, pageSize };
  });

  // Stats — 4 kart için
  server.get('/stats', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    if (!hasViewAccess(user)) return reply.status(403).send({ error: 'Yetkisiz' });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [monthAgg, weekAgg, pendingCount, monthExpenses] = await Promise.all([
      request.db.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: monthStart, lte: monthEnd }, status: ExpenseStatus.APPROVED },
      }),
      request.db.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: weekStart, lte: now }, status: ExpenseStatus.APPROVED },
      }),
      request.db.expense.count({ where: { status: ExpenseStatus.PENDING_APPROVAL } }),
      request.db.expense.findMany({
        where: { expenseDate: { gte: monthStart, lte: monthEnd }, status: ExpenseStatus.APPROVED },
        include: { category: true },
      }),
    ]);

    const byCategory: Record<string, { name: string; amount: number; categoryId: string; icon?: string | null; color?: string | null }> = {};
    for (const e of monthExpenses) {
      const k = e.categoryId;
      if (!byCategory[k]) {
        byCategory[k] = { name: e.category.name, amount: 0, categoryId: k, icon: e.category.icon, color: e.category.color };
      }
      byCategory[k].amount += Number(e.amount);
    }
    const topCategories = Object.values(byCategory).sort((a, b) => b.amount - a.amount).slice(0, 3);

    return {
      monthTotal: Number(monthAgg._sum.amount || 0),
      weekTotal: Number(weekAgg._sum.amount || 0),
      pendingCount,
      topCategories,
    };
  });

  // Summary — Reports için aylık özet
  server.get('/summary', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const q = (request.query ?? {}) as { year?: string; month?: string };
    const year = Number(q.year) || new Date().getFullYear();
    const month = (Number(q.month) || new Date().getMonth() + 1) - 1; // 0-based
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const expenses = await request.db.expense.findMany({
      where: { expenseDate: { gte: start, lte: end }, status: ExpenseStatus.APPROVED },
      include: { category: true },
    });
    const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, { name: string; amount: number; count: number }> = {};
    const byPayment: Record<string, number> = {};
    for (const e of expenses) {
      const k = e.categoryId;
      if (!byCategory[k]) byCategory[k] = { name: e.category.name, amount: 0, count: 0 };
      byCategory[k].amount += Number(e.amount);
      byCategory[k].count += 1;
      byPayment[e.paymentMethod] = (byPayment[e.paymentMethod] || 0) + Number(e.amount);
    }
    return {
      year,
      month: month + 1,
      total,
      count: expenses.length,
      byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
      byPayment,
    };
  });

  // Single
  server.get('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    if (!hasViewAccess(user)) return reply.status(403).send({ error: 'Yetkisiz' });
    const { id } = request.params as { id: string };
    const expense = await request.db.expense.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!expense) return reply.status(404).send({ error: 'Gider bulunamadı' });
    return { expense };
  });

  // Create
  server.post('/', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    if (!hasViewAccess(user)) return reply.status(403).send({ error: 'Bu işlem için yetkiniz yok' });

    const body = request.body as {
      amount?: number;
      categoryId?: string;
      description?: string;
      expenseDate?: string;
      vendor?: string;
      paymentMethod?: string;
      receiptUrl?: string;
      notes?: string;
      locationId?: string;
    };

    if (body.amount == null || Number(body.amount) <= 0) {
      return reply.status(400).send({ error: 'Geçerli bir tutar girin' });
    }
    if (!body.categoryId) return reply.status(400).send({ error: 'Kategori seçin' });
    if (!body.expenseDate) return reply.status(400).send({ error: 'Tarih girin' });

    const cat = await request.db.expenseCategory.findUnique({ where: { id: body.categoryId } });
    if (!cat) return reply.status(400).send({ error: 'Kategori bulunamadı' });

    const amount = Number(body.amount);
    const threshold = await getAutoApproveThreshold(request.db);
    const isAdminOrManager = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const needsApproval = !isAdminOrManager && amount >= threshold;
    const status: ExpenseStatus = needsApproval ? ExpenseStatus.PENDING_APPROVAL : ExpenseStatus.APPROVED;

    const expense = await request.db.expense.create({
      data: {
        amount,
        categoryId: body.categoryId,
        expenseDate: new Date(body.expenseDate),
        description: body.description ?? null,
        vendor: body.vendor ?? null,
        paymentMethod: (body.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
        receiptUrl: body.receiptUrl ?? null,
        notes: body.notes ?? null,
        status,
        createdById: user.userId,
        approvedById: status === ExpenseStatus.APPROVED ? user.userId : null,
        approvedAt: status === ExpenseStatus.APPROVED ? new Date() : null,
        locationId: body.locationId ?? null,
      },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    return { expense };
  });

  // Update
  server.put('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    if (!hasViewAccess(user)) return reply.status(403).send({ error: 'Yetkisiz' });

    const { id } = request.params as { id: string };
    const existing = await request.db.expense.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Gider bulunamadı' });
    if (!canEditExpense(user, existing)) {
      return reply.status(403).send({ error: 'Bu gideri düzenleme yetkiniz yok' });
    }

    const body = request.body as Record<string, any>;
    const isAdminOrManager = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;

    const data: Prisma.ExpenseUpdateInput = {};
    if (body.amount != null && Number(body.amount) > 0) data.amount = Number(body.amount);
    if (body.categoryId) data.category = { connect: { id: body.categoryId } };
    if (body.expenseDate) data.expenseDate = new Date(body.expenseDate);
    if (body.description !== undefined) data.description = body.description;
    if (body.vendor !== undefined) data.vendor = body.vendor;
    if (body.paymentMethod) data.paymentMethod = body.paymentMethod as PaymentMethod;
    if (body.receiptUrl !== undefined) data.receiptUrl = body.receiptUrl;
    if (body.notes !== undefined) data.notes = body.notes;
    // Sadece admin status'u değiştirebilir
    if (isAdminOrManager && body.status) data.status = body.status as ExpenseStatus;

    const expense = await request.db.expense.update({
      where: { id },
      data,
      include: {
        category: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    return { expense };
  });

  // Approve
  server.patch('/:id/approve', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { id } = request.params as { id: string };
    const existing = await request.db.expense.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Gider bulunamadı' });

    const expense = await request.db.expense.update({
      where: { id },
      data: { status: ExpenseStatus.APPROVED, approvedById: user.userId, approvedAt: new Date() },
      include: { category: true, createdBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } },
    });
    return { expense };
  });

  // Reject
  server.patch('/:id/reject', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { id } = request.params as { id: string };
    const existing = await request.db.expense.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Gider bulunamadı' });

    const expense = await request.db.expense.update({
      where: { id },
      data: { status: ExpenseStatus.REJECTED, approvedById: user.userId, approvedAt: new Date() },
      include: { category: true, createdBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } },
    });
    return { expense };
  });

  // Delete
  server.delete('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    if (!hasViewAccess(user)) return reply.status(403).send({ error: 'Yetkisiz' });

    const { id } = request.params as { id: string };
    const existing = await request.db.expense.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Gider bulunamadı' });

    const isAdminOrManager = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (!isAdminOrManager) {
      // CASHIER kendi ekledikleri ve REJECTED olmayanı silebilir (audit için)
      if (existing.createdById !== user.userId) {
        return reply.status(403).send({ error: 'Bu gideri silme yetkiniz yok' });
      }
      if (existing.status === ExpenseStatus.REJECTED) {
        return reply.status(403).send({ error: 'Reddedilmiş gider silinemez (audit kaydı)' });
      }
    }

    await request.db.expense.delete({ where: { id } });
    return { ok: true };
  });
}
