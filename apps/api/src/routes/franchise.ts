// Franchise başvurusu — tenant'ın landing'indeki formdan (public, tenant-scoped).
// Başvuru restoran sahibine tenant markalı mailin yanında EmailLog'a da düşer.
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { platformDb } from '../lib/tenant-db';
import { sendTenantMail, renderTenantEmail } from '../lib/mailer';

// IP başına 60 sn throttle (spam koruması — tek instance yeterli)
const lastByIp = new Map<string, number>();

export default async function franchiseRoutes(server: FastifyInstance) {
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant as { id: string; name: string } | undefined;
    if (!tenant) return reply.status(404).send({ error: 'Restoran bulunamadı' });

    const now = Date.now();
    if (now - (lastByIp.get(request.ip) || 0) < 60_000) {
      return reply.status(429).send({ error: 'Çok sık deneme — biraz sonra tekrar dene' });
    }

    const { name, phone, email, city, message } = (request.body || {}) as Record<string, string>;
    if (!name?.trim() || !phone?.trim() || !city?.trim()) {
      return reply.status(400).send({ error: 'Ad, telefon ve şehir zorunlu' });
    }
    lastByIp.set(request.ip, now);

    // Sahibin e-postası (Reply-To zaten owner'a çözülür; alıcı da owner)
    const owner = await platformDb.membership.findFirst({
      where: { tenantId: tenant.id, role: 'OWNER' },
      include: { user: { select: { email: true } } },
    });
    const to = owner?.user?.email;
    if (!to) return reply.status(500).send({ error: 'Başvuru iletilemedi' });

    const esc = (s: string) => String(s || '').replace(/</g, '&lt;').slice(0, 500);
    sendTenantMail(platformDb, tenant.id, {
      to,
      subject: `🤝 Yeni franchise başvurusu — ${esc(name)} (${esc(city)})`,
      template: 'franchise-application',
      render: (brand) =>
        renderTenantEmail(brand, {
          preheader: `${esc(name)} · ${esc(city)} · ${esc(phone)}`,
          title: 'Franchise Başvurusu',
          body: `
            <h1 style="font-size:20px;font-weight:700;margin:0 0 16px;">Yeni franchise başvurusu 🤝</h1>
            <table role="presentation" width="100%" style="background:#f5f5f2;border-radius:12px;">
              <tr><td style="padding:12px 16px;font-size:14px;color:#6b6b6b;width:110px;">Ad Soyad</td><td style="padding:12px 16px;font-size:14px;font-weight:700;">${esc(name)}</td></tr>
              <tr><td style="padding:0 16px 12px;font-size:14px;color:#6b6b6b;">Telefon</td><td style="padding:0 16px 12px;font-size:14px;font-weight:700;">${esc(phone)}</td></tr>
              <tr><td style="padding:0 16px 12px;font-size:14px;color:#6b6b6b;">E-posta</td><td style="padding:0 16px 12px;font-size:14px;font-weight:700;">${esc(email)}</td></tr>
              <tr><td style="padding:0 16px 12px;font-size:14px;color:#6b6b6b;">Şehir</td><td style="padding:0 16px 12px;font-size:14px;font-weight:700;">${esc(city)}</td></tr>
              ${message ? `<tr><td style="padding:0 16px 12px;font-size:14px;color:#6b6b6b;">Mesaj</td><td style="padding:0 16px 12px;font-size:14px;">${esc(message)}</td></tr>` : ''}
            </table>`,
        }),
    }).catch(() => {});

    return { ok: true, message: 'Başvurun alındı! En kısa sürede dönüş yapacağız.' };
  });
}
