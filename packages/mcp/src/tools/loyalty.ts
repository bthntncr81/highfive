import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { toNumber, formatTL, formatDate } from '../lib/format';

export function registerLoyaltyTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'search_customers',
    'Sadakat programı müşterilerini ara',
    {
      search: z.string().describe('Telefon, isim veya e-posta ile arama'),
      tierId: z.string().optional().describe('Sadakat seviyesi ID filtresi'),
    },
    async ({ search, tierId }) => {
      try {
        const where: Record<string, unknown> = {
          OR: [
            { phone: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };
        if (tierId) where.loyaltyTierId = tierId;

        const customers = await prisma.customer.findMany({
          where,
          include: {
            loyaltyTier: { select: { name: true, color: true } },
          },
          take: 30,
          orderBy: { updatedAt: 'desc' },
        });

        if (customers.length === 0) {
          return { content: [{ type: 'text' as const, text: `"${search}" ile eşleşen müşteri bulunamadı.` }] };
        }

        const lines = customers.map((c) => {
          const tier = c.loyaltyTier ? ` [${c.loyaltyTier.name}]` : '';
          return [
            `  ${c.name || 'İsimsiz'} | ${c.phone}${tier}`,
            `    Puan: ${c.totalPoints} | Harcama: ${formatTL(toNumber(c.totalSpent))} | Sipariş: ${c.orderCount}`,
            `    ID: ${c.id}`,
          ].join('\n');
        });

        return {
          content: [{ type: 'text' as const, text: `=== Müşteriler (${customers.length}) ===\n\n${lines.join('\n\n')}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_customer_details',
    'Müşteri detayını ve puan geçmişini getir',
    { customerId: z.string().describe('Müşteri ID') },
    async ({ customerId }) => {
      try {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          include: {
            loyaltyTier: true,
            pointsHistory: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
            orders: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });

        if (!customer) {
          return { content: [{ type: 'text' as const, text: `Müşteri bulunamadı: ${customerId}` }] };
        }

        const pointsHistory = customer.pointsHistory
          .map((p) => `  ${p.points > 0 ? '+' : ''}${p.points} puan | ${p.type} | ${p.description || '-'} | ${formatDate(p.createdAt)}`)
          .join('\n');

        const text = [
          `=== Müşteri: ${customer.name || 'İsimsiz'} ===`,
          `Telefon: ${customer.phone}`,
          customer.email ? `E-posta: ${customer.email}` : null,
          customer.birthDate ? `Doğum Tarihi: ${customer.birthDate.toLocaleDateString('tr-TR')}` : null,
          '',
          '--- Sadakat Bilgileri ---',
          `Seviye: ${customer.loyaltyTier?.name || 'Yok'}`,
          `Mevcut Puan: ${customer.totalPoints}`,
          `Toplam Kazanılan: ${customer.lifetimePoints}`,
          `Toplam Harcama: ${formatTL(toNumber(customer.totalSpent))}`,
          `Sipariş Sayısı: ${customer.orderCount}`,
          customer.lastOrderAt ? `Son Sipariş: ${formatDate(customer.lastOrderAt)}` : null,
          '',
          '--- İzinler ---',
          `SMS: ${customer.smsConsent ? 'Evet' : 'Hayır'}`,
          `E-posta: ${customer.emailConsent ? 'Evet' : 'Hayır'}`,
          `Push: ${customer.pushConsent ? 'Evet' : 'Hayır'}`,
          '',
          customer.pointsHistory.length > 0
            ? `--- Puan Geçmişi (son 20) ---\n${pointsHistory}`
            : 'Puan geçmişi yok.',
          '',
          `Kayıt: ${formatDate(customer.createdAt)}`,
          `ID: ${customer.id}`,
        ]
          .filter(Boolean)
          .join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );
}
