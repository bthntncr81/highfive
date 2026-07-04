import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAdmin } from '../middleware/auth';

// Public /services yanıtında İZİN VERİLEN alanlar — iyzico anahtarları ve diğer
// sırlar ASLA public endpoint'ten dönmez (eski sürümde canlıda sızıyordu).
const PUBLIC_SERVICE_FIELDS = [
  'takeawayEnabled',
  'deliveryEnabled',
  'onlinePaymentEnabled',
  'cartEnabled',
  'deliveryFee',
  'busyMode',
  'busyMessage',
  'estimatedDeliveryTime',
  'orderHoursEnabled',
  'orderHoursStart',
  'orderHoursEnd',
  'orderHoursByDay',
] as const;

export default async function settingsRoutes(server: FastifyInstance) {
  // Get all settings (tenant'ın tümü — admin)
  server.get('/', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const settings = await request.db.settings.findMany();
    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return { settings: result };
  });

  // Get specific setting (tenant-scoped)
  server.get('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const setting = await request.db.settings.findFirst({ where: { key } });
    if (!setting) {
      return reply.status(404).send({ error: 'Ayar bulunamadı' });
    }
    return { [key]: setting.value };
  });

  // Update setting — composite unique [tenantId, key] ile upsert
  server.put('/:key', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: any };
    const tenantId = request.tenant!.id;

    const setting = await request.db.settings.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value },
      create: { key, value },
    });
    return { [key]: setting.value };
  });

  // Get public settings (for frontend) — tenant subdomain'den çözülür
  server.get('/public/restaurant', async (request: FastifyRequest) => {
    const restaurantSetting = await request.db.settings.findFirst({
      where: { key: 'restaurant' },
    });
    const whatsappSetting = await request.db.settings.findFirst({
      where: { key: 'whatsapp' },
    });
    return {
      restaurant: restaurantSetting?.value || {},
      whatsapp: whatsappSetting?.value || {},
    };
  });

  // Get public service settings — YALNIZ whitelist alanlar (sır sızmaz)
  server.get('/public/services', async (request: FastifyRequest) => {
    const servicesSetting = await request.db.settings.findFirst({
      where: { key: 'services' },
    });
    const raw = (servicesSetting?.value as Record<string, any>) || {};
    const services: Record<string, any> = {
      takeawayEnabled: true,
      deliveryEnabled: true,
      onlinePaymentEnabled: true,
    };
    for (const f of PUBLIC_SERVICE_FIELDS) {
      if (f in raw) services[f] = raw[f];
    }
    return { services };
  });

  // Backup all settings (tenant'ın verisi)
  server.get('/backup', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const settings = await request.db.settings.findMany();
    const categories = await request.db.category.findMany({
      include: { items: { include: { modifiers: true } } },
    });
    const tables = await request.db.table.findMany();
    // Kullanıcılar artık Membership üzerinden (rol/pin üyelikte)
    const memberships = await request.db.membership.findMany({
      include: { user: { select: { id: true, email: true, name: true, active: true } } },
    });
    const users = memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      pin: m.pin,
      active: m.active && m.user.active,
    }));

    return {
      exportDate: new Date().toISOString(),
      settings,
      categories,
      tables,
      users,
    };
  });

  // Restore from backup (tenant'a)
  server.post('/restore', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const backup = request.body as any;
    if (!backup || !backup.settings) {
      return reply.status(400).send({ error: 'Geçersiz yedek dosyası' });
    }
    const tenantId = request.tenant!.id;
    try {
      for (const setting of backup.settings) {
        await request.db.settings.upsert({
          where: { tenantId_key: { tenantId, key: setting.key } },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        });
      }
      return { success: true, message: 'Ayarlar başarıyla geri yüklendi' };
    } catch {
      return reply.status(500).send({ error: 'Geri yükleme başarısız' });
    }
  });
}
