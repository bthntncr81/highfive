import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAdmin } from '../middleware/auth';

export default async function settingsRoutes(server: FastifyInstance) {
  // Get all settings
  server.get('/', { preHandler: verifyAdmin }, async () => {
    const settings = await request.db.settings.findMany();
    
    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    
    return { settings: result };
  });

  // Get specific setting
  server.get('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    
    const setting = await request.db.settings.findUnique({
      where: { key },
    });

    if (!setting) {
      return reply.status(404).send({ error: 'Ayar bulunamadı' });
    }

    return { [key]: setting.value };
  });

  // Update setting
  server.put('/:key', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: any };

    const setting = await request.db.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return { [key]: setting.value };
  });

  // Get public settings (for frontend)
  server.get('/public/restaurant', async () => {
    const restaurantSetting = await request.db.settings.findUnique({
      where: { key: 'restaurant' },
    });

    const whatsappSetting = await request.db.settings.findUnique({
      where: { key: 'whatsapp' },
    });

    return {
      restaurant: restaurantSetting?.value || {},
      whatsapp: whatsappSetting?.value || {},
    };
  });

  // Get public service settings (takeaway, delivery, online payment)
  server.get('/public/services', async () => {
    const servicesSetting = await request.db.settings.findUnique({
      where: { key: 'services' },
    });

    const defaults = {
      takeawayEnabled: true,
      deliveryEnabled: true,
      onlinePaymentEnabled: true,
    };

    return { services: servicesSetting?.value || defaults };
  });

  // Backup all settings
  server.get('/backup', { preHandler: verifyAdmin }, async () => {
    const settings = await request.db.settings.findMany();
    const categories = await request.db.category.findMany({
      include: { items: { include: { modifiers: true } } },
    });
    const tables = await request.db.table.findMany();
    const users = await request.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        active: true,
      },
    });

    return {
      exportDate: new Date().toISOString(),
      settings,
      categories,
      tables,
      users,
    };
  });

  // Restore from backup
  server.post('/restore', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const backup = request.body as any;

    if (!backup || !backup.settings) {
      return reply.status(400).send({ error: 'Geçersiz yedek dosyası' });
    }

    try {
      // Restore settings
      for (const setting of backup.settings) {
        await request.db.settings.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        });
      }

      return { success: true, message: 'Ayarlar başarıyla geri yüklendi' };
    } catch (err) {
      return reply.status(500).send({ error: 'Geri yükleme başarısız' });
    }
  });
}

