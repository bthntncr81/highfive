// Thermal Printer Integration Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, PrinterType } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';
import * as net from 'net';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a0`,
  ALIGN_CENTER: `${ESC}a1`,
  ALIGN_RIGHT: `${ESC}a2`,
  BOLD_ON: `${ESC}E1`,
  BOLD_OFF: `${ESC}E0`,
  DOUBLE_HEIGHT_ON: `${GS}!0x10`,
  DOUBLE_WIDTH_ON: `${GS}!0x20`,
  DOUBLE_ON: `${GS}!0x30`,
  NORMAL: `${GS}!0x00`,
  CUT: `${GS}V66\n`,
  FEED: '\n',
  LINE: ''.padEnd(48, '-'),
  DOUBLE_LINE: ''.padEnd(48, '='),
};

export default async function printerRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Get all printers
  server.get(
    '/printers',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const printers = await prisma.printer.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return { printers };
    }
  );

  // Add printer
  server.post(
    '/printers',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, type, ipAddress, port, paperWidth, categories } = request.body as {
        name: string;
        type: PrinterType;
        ipAddress?: string;
        port?: number;
        paperWidth?: number;
        categories?: string[];
      };

      const printer = await prisma.printer.create({
        data: {
          name,
          type,
          ipAddress,
          port: port || 9100,
          paperWidth: paperWidth || 80,
          categories: categories || [],
        },
      });

      return { success: true, printer };
    }
  );

  // Update printer
  server.put(
    '/printers/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const printer = await prisma.printer.update({
        where: { id },
        data,
      });

      return { success: true, printer };
    }
  );

  // Delete printer
  server.delete(
    '/printers/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      await prisma.printer.delete({ where: { id } });

      return { success: true };
    }
  );

  // Test printer connection
  server.post(
    '/printers/:id/test',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const printer = await prisma.printer.findUnique({ where: { id } });
      if (!printer) {
        return reply.status(404).send({ error: 'Yazıcı bulunamadı' });
      }

      if (!printer.ipAddress) {
        return reply.status(400).send({ error: 'Yazıcı IP adresi tanımlı değil' });
      }

      try {
        const testContent = [
          ESCPOS.INIT,
          ESCPOS.ALIGN_CENTER,
          ESCPOS.BOLD_ON,
          'HIGH FIVE',
          ESCPOS.BOLD_OFF,
          ESCPOS.FEED,
          'Yazici Testi Basarili!',
          ESCPOS.FEED,
          new Date().toLocaleString('tr-TR'),
          ESCPOS.FEED,
          ESCPOS.FEED,
          ESCPOS.CUT,
        ].join('\n');

        await printToNetwork(printer.ipAddress, printer.port, testContent);

        return { success: true, message: 'Test fişi yazdırıldı' };
      } catch (error: any) {
        return reply.status(500).send({ error: `Yazıcı hatası: ${error.message}` });
      }
    }
  );

  // Print order receipt
  server.post(
    '/print/receipt/:orderId',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orderId } = request.params as { orderId: string };
      const { printerId } = request.body as { printerId?: string };

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          user: true,
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Sipariş bulunamadı' });
      }

      // Find printer
      let printer;
      if (printerId) {
        printer = await prisma.printer.findUnique({ where: { id: printerId } });
      } else {
        printer = await prisma.printer.findFirst({
          where: { type: 'RECEIPT', active: true, isDefault: true },
        });
      }

      if (!printer || !printer.ipAddress) {
        return reply.status(404).send({ error: 'Aktif fiş yazıcısı bulunamadı' });
      }

      const receipt = generateReceipt(order, printer.paperWidth);

      try {
        await printToNetwork(printer.ipAddress, printer.port, receipt);

        // Log print job
        await prisma.printJob.create({
          data: {
            printerId: printer.id,
            orderId,
            content: receipt,
            status: 'COMPLETED',
            printedAt: new Date(),
          },
        });

        return { success: true, message: 'Fiş yazdırıldı' };
      } catch (error: any) {
        await prisma.printJob.create({
          data: {
            printerId: printer.id,
            orderId,
            content: receipt,
            status: 'FAILED',
            error: error.message,
          },
        });

        return reply.status(500).send({ error: `Yazıcı hatası: ${error.message}` });
      }
    }
  );

  // Print kitchen ticket
  server.post(
    '/print/kitchen/:orderId',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orderId } = request.params as { orderId: string };

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { menuItem: { include: { category: true } } } },
          table: true,
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Sipariş bulunamadı' });
      }

      // Find kitchen printers
      const printers = await prisma.printer.findMany({
        where: { type: 'KITCHEN', active: true },
      });

      if (printers.length === 0) {
        return reply.status(404).send({ error: 'Mutfak yazıcısı bulunamadı' });
      }

      const results = [];

      for (const printer of printers) {
        // Filter items by category if printer has category filter
        let itemsToPrint = order.items;
        if (printer.categories && printer.categories.length > 0) {
          itemsToPrint = order.items.filter((item) =>
            printer.categories.includes(item.menuItem.categoryId)
          );
        }

        if (itemsToPrint.length === 0) continue;

        const ticket = generateKitchenTicket(order, itemsToPrint, printer.paperWidth);

        try {
          if (printer.ipAddress) {
            await printToNetwork(printer.ipAddress, printer.port, ticket);
            results.push({ printer: printer.name, success: true });
          }
        } catch (error: any) {
          results.push({ printer: printer.name, success: false, error: error.message });
        }
      }

      return { success: true, results };
    }
  );

  // Get print queue
  server.get(
    '/print/queue',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const jobs = await prisma.printJob.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });

      return { jobs };
    }
  );

  // Retry failed print job
  server.post(
    '/print/retry/:jobId',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { jobId } = request.params as { jobId: string };

      const job = await prisma.printJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return reply.status(404).send({ error: 'Yazdırma işi bulunamadı' });
      }

      const printer = await prisma.printer.findUnique({
        where: { id: job.printerId },
      });

      if (!printer || !printer.ipAddress) {
        return reply.status(404).send({ error: 'Yazıcı bulunamadı' });
      }

      try {
        await printToNetwork(printer.ipAddress, printer.port, job.content);

        await prisma.printJob.update({
          where: { id: jobId },
          data: { status: 'COMPLETED', printedAt: new Date(), error: null },
        });

        return { success: true };
      } catch (error: any) {
        await prisma.printJob.update({
          where: { id: jobId },
          data: { error: error.message },
        });

        return reply.status(500).send({ error: error.message });
      }
    }
  );
}

// Helper function to print to network printer
async function printToNetwork(ip: string, port: number, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.connect(port, ip, () => {
      socket.write(content, 'binary', (err) => {
        if (err) {
          socket.destroy();
          reject(err);
        } else {
          socket.end();
          resolve();
        }
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Yazıcı bağlantı zaman aşımı'));
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

// Generate receipt content
function generateReceipt(order: any, paperWidth: number): string {
  const width = paperWidth === 58 ? 32 : 48;
  const line = ''.padEnd(width, '-');
  const doubleLine = ''.padEnd(width, '=');

  const lines = [
    ESCPOS.INIT,
    ESCPOS.ALIGN_CENTER,
    ESCPOS.BOLD_ON,
    'HIGH FIVE',
    ESCPOS.BOLD_OFF,
    'Pizza • Makarna • Sandvic',
    ESCPOS.FEED,
    line,
    ESCPOS.ALIGN_LEFT,
    `Siparis No: #${order.orderNumber}`,
    `Tarih: ${new Date(order.createdAt).toLocaleString('tr-TR')}`,
    order.table ? `Masa: ${order.table.name}` : `Tip: ${order.type === 'TAKEAWAY' ? 'Gel Al' : order.type}`,
    order.customerName ? `Musteri: ${order.customerName}` : '',
    line,
    ESCPOS.FEED,
  ];

  // Items
  for (const item of order.items) {
    const name = item.menuItem.name.substring(0, width - 15);
    const qty = `${item.quantity}x`;
    const price = `${Number(item.total).toFixed(2)} TL`;
    lines.push(`${qty} ${name.padEnd(width - qty.length - price.length - 2)} ${price}`);

    if (item.notes) {
      lines.push(`   Not: ${item.notes}`);
    }
    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`   ${item.modifiers.join(', ')}`);
    }
  }

  lines.push(ESCPOS.FEED, line);

  // Totals
  const formatTotal = (label: string, amount: number) => {
    const amountStr = `${amount.toFixed(2)} TL`;
    return `${label.padEnd(width - amountStr.length)}${amountStr}`;
  };

  lines.push(formatTotal('Ara Toplam:', Number(order.subtotal)));

  if (Number(order.serviceCharge) > 0) {
    lines.push(formatTotal('Servis Ucreti:', Number(order.serviceCharge)));
  }
  if (Number(order.tax) > 0) {
    lines.push(formatTotal('KDV:', Number(order.tax)));
  }
  if (Number(order.discount) > 0) {
    lines.push(formatTotal('Indirim:', -Number(order.discount)));
  }
  if (Number(order.tip) > 0) {
    lines.push(formatTotal('Bahsis:', Number(order.tip)));
  }

  lines.push(doubleLine);
  lines.push(ESCPOS.BOLD_ON);
  lines.push(formatTotal('TOPLAM:', Number(order.total) + Number(order.tip)));
  lines.push(ESCPOS.BOLD_OFF);
  lines.push(doubleLine);

  // Footer
  lines.push(
    ESCPOS.FEED,
    ESCPOS.ALIGN_CENTER,
    'Tesekkur Ederiz!',
    'Afiyet Olsun!',
    ESCPOS.FEED,
    ESCPOS.FEED,
    ESCPOS.CUT
  );

  return lines.filter(Boolean).join('\n');
}

// Generate kitchen ticket
function generateKitchenTicket(order: any, items: any[], paperWidth: number): string {
  const width = paperWidth === 58 ? 32 : 48;
  const line = ''.padEnd(width, '-');

  const lines = [
    ESCPOS.INIT,
    ESCPOS.ALIGN_CENTER,
    ESCPOS.DOUBLE_ON,
    `#${order.orderNumber}`,
    ESCPOS.NORMAL,
    ESCPOS.FEED,
    order.table ? order.table.name : order.type === 'TAKEAWAY' ? 'GEL AL' : order.type,
    ESCPOS.FEED,
    line,
    ESCPOS.ALIGN_LEFT,
    `Saat: ${new Date(order.createdAt).toLocaleTimeString('tr-TR')}`,
    line,
    ESCPOS.FEED,
  ];

  // Items
  for (const item of items) {
    lines.push(ESCPOS.BOLD_ON);
    lines.push(`${item.quantity}x ${item.menuItem.name}`);
    lines.push(ESCPOS.BOLD_OFF);

    if (item.notes) {
      lines.push(`   >>> ${item.notes} <<<`);
    }
    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`   - ${item.modifiers.join('\n   - ')}`);
    }
    lines.push(ESCPOS.FEED);
  }

  lines.push(line);

  if (order.notes) {
    lines.push('SIPARIS NOTU:');
    lines.push(order.notes);
    lines.push(line);
  }

  lines.push(ESCPOS.FEED, ESCPOS.FEED, ESCPOS.CUT);

  return lines.join('\n');
}

