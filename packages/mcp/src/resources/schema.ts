import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';

export function registerSchemaResource(server: McpServer, prisma: PrismaClient): void {
  server.resource(
    'schema',
    'highfive://schema',
    {
      description: 'HighFive veritabanı şeması - 28 model, kayıt sayıları dahil',
      mimeType: 'text/plain',
    },
    async (uri) => {
      const counts = await Promise.all([
        prisma.location.count().then((c) => ({ model: 'Location', count: c })),
        prisma.user.count().then((c) => ({ model: 'User', count: c })),
        prisma.session.count().then((c) => ({ model: 'Session', count: c })),
        prisma.activityLog.count().then((c) => ({ model: 'ActivityLog', count: c })),
        prisma.table.count().then((c) => ({ model: 'Table', count: c })),
        prisma.category.count().then((c) => ({ model: 'Category', count: c })),
        prisma.menuItem.count().then((c) => ({ model: 'MenuItem', count: c })),
        prisma.modifier.count().then((c) => ({ model: 'Modifier', count: c })),
        prisma.rawMaterial.count().then((c) => ({ model: 'RawMaterial', count: c })),
        prisma.menuItemIngredient.count().then((c) => ({ model: 'MenuItemIngredient', count: c })),
        prisma.order.count().then((c) => ({ model: 'Order', count: c })),
        prisma.orderItem.count().then((c) => ({ model: 'OrderItem', count: c })),
        prisma.payment.count().then((c) => ({ model: 'Payment', count: c })),
        prisma.invoice.count().then((c) => ({ model: 'Invoice', count: c })),
        prisma.customer.count().then((c) => ({ model: 'Customer', count: c })),
        prisma.loyaltyTier.count().then((c) => ({ model: 'LoyaltyTier', count: c })),
        prisma.pointsTransaction.count().then((c) => ({ model: 'PointsTransaction', count: c })),
        prisma.campaign.count().then((c) => ({ model: 'Campaign', count: c })),
        prisma.coupon.count().then((c) => ({ model: 'Coupon', count: c })),
        prisma.bundleDeal.count().then((c) => ({ model: 'BundleDeal', count: c })),
        prisma.happyHour.count().then((c) => ({ model: 'HappyHour', count: c })),
        prisma.printer.count().then((c) => ({ model: 'Printer', count: c })),
        prisma.settings.count().then((c) => ({ model: 'Settings', count: c })),
        prisma.dailyReport.count().then((c) => ({ model: 'DailyReport', count: c })),
        prisma.analyticsEvent.count().then((c) => ({ model: 'AnalyticsEvent', count: c })),
      ]);

      const schemaText = `=== HighFive Database Schema ===

--- Enums ---
UserRole: ADMIN, MANAGER, WAITER, KITCHEN, CASHIER, COURIER
TableStatus: FREE, OCCUPIED, RESERVED, CLEANING
OrderStatus: PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, SERVED, COMPLETED, CANCELLED
OrderType: DINE_IN, TAKEAWAY, DELIVERY, ROOM_SERVICE
PaymentMethod: CASH, CREDIT_CARD, DEBIT_CARD, ONLINE, MULTINET, SODEXO, TICKET, TAB, DIGITAL_COIN, OTHER
PaymentStatus: PENDING, PARTIAL, PAID, REFUNDED, ON_TAB
Allergen: GLUTEN, DAIRY, EGGS, FISH, SHELLFISH, NUTS, PEANUTS, SOY, SESAME, CELERY, MUSTARD, SULPHITES, LUPIN, MOLLUSCS
RawMaterialUnit: GRAM, KILOGRAM, LITRE, MILLILITRE, ADET, PORSIYON
PrinterType: RECEIPT, KITCHEN, BAR, LABEL

--- Models & Record Counts ---
${counts.map((c) => `${c.model}: ${c.count} records`).join('\n')}

--- Key Relationships ---
Location -> Tables, Orders, Users, MenuItemLocations, HappyHours
User -> Orders (waiter), Orders (courier), Sessions, ActivityLogs
Table -> Orders, MergedTables
Category -> MenuItems
MenuItem -> Modifiers, Ingredients, OrderItems, Upsells, CrossSells, Locations, HappyHourItems, BundleItems
RawMaterial -> MenuItemIngredients
Order -> OrderItems, Payments, Invoice, Table, User (waiter), User (courier)
Customer -> LoyaltyTier, PointsTransactions, CustomerOrders, CouponUsages
Campaign -> HappyHours
BundleDeal -> BundleItems
Coupon -> CouponUsages`;

      return { contents: [{ uri: uri.href, text: schemaText }] };
    }
  );
}
