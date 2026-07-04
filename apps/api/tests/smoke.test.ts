// buildServer() smoke testi — DB'siz: sunucu kurulur, /health cevap verir,
// route registry dolu gelir (Faz 3 izolasyon coverage-gate'inin temeli).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildServer, RouteInfo } from '../src/server';

let server: FastifyInstance;

beforeAll(async () => {
  // PrismaClient ilk sorguya kadar bağlanmaz — /health DB'ye dokunmaz.
  server = await buildServer({ prisma: new PrismaClient(), logger: false });
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

describe('buildServer', () => {
  it('boots and serves /health', async () => {
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('registers the full API surface into routeRegistry', async () => {
    const registry = (server as any).routeRegistry as RouteInfo[];
    expect(registry.length).toBeGreaterThan(100); // 33+ route modülü — geniş yüzey
    const urls = registry.map((r) => `${r.method} ${r.url}`);
    // temel yüzey örneklemleri
    expect(urls).toContain('GET /health');
    expect(urls.some((u) => u.startsWith('POST /api/orders'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/settings'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/external'))).toBe(true);
  });

  it('does not expose HEAD/OPTIONS noise in registry', () => {
    const registry = (server as any).routeRegistry as RouteInfo[];
    expect(registry.every((r) => r.method !== 'HEAD' && r.method !== 'OPTIONS')).toBe(true);
  });
});
