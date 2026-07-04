// Mobile (Customer) Addresses CRUD — Customer auth zorunlu
// GET    /api/mobile/addresses
// POST   /api/mobile/addresses
// PATCH  /api/mobile/addresses/:id
// DELETE /api/mobile/addresses/:id
// POST   /api/mobile/addresses/:id/default

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyCustomerAuth } from '../lib/customer-auth';

export default async function mobileAddressesRoutes(server: FastifyInstance) {
  // LIST
  server.get('/', { preHandler: verifyCustomerAuth }, async (request: FastifyRequest) => {
    const customerId = (request as any).customerId as string;
    const addresses = await request.db.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { addresses };
  });

  // CREATE
  server.post('/', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const body = (request.body ?? {}) as {
      label?: string;
      fullAddress?: string;
      district?: string;
      city?: string;
      zipCode?: string;
      latitude?: number;
      longitude?: number;
      notes?: string;
      isDefault?: boolean;
    };
    if (!body.label || !body.fullAddress) {
      return reply.status(400).send({ error: 'label ve fullAddress gerekli' });
    }

    // Eğer isDefault=true ise eski default'u kapat
    if (body.isDefault) {
      await request.db.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    } else {
      // İlk adres ise otomatik default
      const count = await request.db.address.count({ where: { customerId } });
      if (count === 0) body.isDefault = true;
    }

    const address = await request.db.address.create({
      data: {
        customerId,
        label: body.label,
        fullAddress: body.fullAddress,
        district: body.district,
        city: body.city,
        zipCode: body.zipCode,
        latitude: body.latitude,
        longitude: body.longitude,
        notes: body.notes,
        isDefault: body.isDefault ?? false,
      },
    });
    return { address };
  });

  // UPDATE
  server.patch('/:id', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { id } = request.params as { id: string };
    const existing = await request.db.address.findFirst({ where: { id, customerId } });
    if (!existing) return reply.status(404).send({ error: 'Adres bulunamadı' });

    const body = (request.body ?? {}) as Record<string, any>;
    const data: any = {};
    for (const k of [
      'label', 'fullAddress', 'district', 'city', 'zipCode',
      'latitude', 'longitude', 'notes',
    ]) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    if (body.isDefault === true && !existing.isDefault) {
      await request.db.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
      data.isDefault = true;
    }

    const updated = await request.db.address.update({ where: { id }, data });
    return { address: updated };
  });

  // DELETE
  server.delete('/:id', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { id } = request.params as { id: string };
    const existing = await request.db.address.findFirst({ where: { id, customerId } });
    if (!existing) return reply.status(404).send({ error: 'Adres bulunamadı' });

    await request.db.address.delete({ where: { id } });

    // Default silindiyse en eskiyi default yap
    if (existing.isDefault) {
      const next = await request.db.address.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await request.db.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { ok: true };
  });

  // SET DEFAULT
  server.post('/:id/default', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { id } = request.params as { id: string };
    const existing = await request.db.address.findFirst({ where: { id, customerId } });
    if (!existing) return reply.status(404).send({ error: 'Adres bulunamadı' });

    await request.db.$transaction([
      request.db.address.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      }),
      request.db.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return { ok: true };
  });
}
