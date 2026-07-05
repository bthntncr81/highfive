// buildServer(): Fastify instance kurulumu — plugin'ler + tüm route'lar + WebSocket.
// main.ts'ten ayrıldı ki testler listen etmeden `server.inject()` ile TÜM API'yi
// vurabilsin (izolasyon harness'ının temeli). Davranış birebir main.ts'teki gibi.
//
// NOT (Faz 2'de değişecek): prisma şimdilik `server.decorate('prisma')` ile
// veriliyor. Çok-kiracılı izolasyonda bu decorate SİLİNECEK ve route'lar
// request-scoped `req.db` (dbFor(tenantId)) kullanacak — decorate kalkınca
// derleyici tüm çağrı noktalarını tek tek buldurur.

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tableRoutes from './routes/tables';
import categoryRoutes from './routes/categories';
import menuRoutes from './routes/menu';
import orderRoutes from './routes/orders';
import reportRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import paymentRoutes from './routes/payment';
import stockRoutes from './routes/stock';
import upsellRoutes from './routes/upsell';
import happyHourRoutes from './routes/happyhour';
import printerRoutes from './routes/printer';
import tipRoutes from './routes/tip';
import locationRoutes from './routes/location';
import loyaltyRoutes from './routes/loyalty';
import loyaltyProgramsRoutes from './routes/loyalty-programs';
import loyaltyClaimsRoutes from './routes/loyalty-claims';
import campaignsRoutes from './routes/campaigns';
import optionGroupsRoutes from './routes/option-groups';
import gamesRoutes from './routes/games';
import pizzaGameRoutes from './routes/pizza-game';
import builderRoutes from './routes/builder';
import googleReviewsRoutes from './routes/google-reviews';
import rawMaterialRoutes from './routes/rawmaterials';
import expenseCategoryRoutes from './routes/expense-categories';
import expenseRoutes from './routes/expenses';
import uploadRoutes from './routes/upload';
import externalRoutes from './routes/external';
import integrationPartnerRoutes from './routes/integration-partners';
import mobileAuthRoutes from './routes/mobile-auth';
import devicesRoutes from './routes/devices';
import notificationRoutes from './routes/notifications';
import mobileOrdersRoutes from './routes/mobile-orders';
import mobileLoyaltyRoutes from './routes/mobile-loyalty';
import mobileAddressesRoutes from './routes/mobile-addresses';
import mobileFavoritesRoutes from './routes/mobile-favorites';
import mobilePrefsRoutes from './routes/mobile-prefs';
import courierRoutes from './routes/courier';
import platformRoutes from './routes/platform';
import integrationRoutes from './routes/integrations';
import marketplaceRoutes from './routes/marketplace';

// WebSocket handler
import { setupWebSocket } from './websocket';

// Tenant çözümleme (req.tenant + req.db)
import tenantPlugin from './plugins/tenant';

export interface RouteInfo {
  method: string;
  url: string;
}

export interface BuildServerOpts {
  prisma: PrismaClient;
  logger?: boolean | object;
}

export async function buildServer(opts: BuildServerOpts): Promise<FastifyInstance> {
  const server = Fastify({
    logger:
      opts.logger ?? {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
  });

  // Route registry — izolasyon harness'ının coverage-gate'i için TÜM endpoint'leri
  // kayıt altına alır (Faz 3: her kayıtlı route'un tenant-sızıntı fixture'ı olmalı).
  const routeRegistry: RouteInfo[] = [];
  server.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const m of methods) {
      if (m === 'HEAD' || m === 'OPTIONS') continue;
      routeRegistry.push({ method: m, url: route.url });
    }
  });
  server.decorate('routeRegistry', routeRegistry);

  // Plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await server.register(websocket);
  await server.register(formbody); // For 3DS callback form data
  await server.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

  // Serve uploaded files statically
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  await server.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // FAZ 2: server.prisma decorate'i KALDIRILDI. Route'lar artık request-scoped
  // req.db (dbFor — tenant-zorlamalı) kullanır; platform işleri platformDb.
  // Tenant çözümleme hook'u: JWT → X-Tenant-ID → subdomain.
  await server.register(tenantPlugin);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API Routes
  server.register(authRoutes, { prefix: '/api/auth' });
  server.register(userRoutes, { prefix: '/api/users' });
  server.register(tableRoutes, { prefix: '/api/tables' });
  server.register(categoryRoutes, { prefix: '/api/categories' });
  server.register(menuRoutes, { prefix: '/api/menu' });
  server.register(orderRoutes, { prefix: '/api/orders' });
  server.register(reportRoutes, { prefix: '/api/reports' });
  server.register(settingsRoutes, { prefix: '/api/settings' });
  server.register(paymentRoutes, { prefix: '/api/payment' });
  server.register(stockRoutes, { prefix: '/api/stock' });
  server.register(upsellRoutes, { prefix: '/api' }); // /api/upsells, /api/crosssells
  server.register(happyHourRoutes, { prefix: '/api' }); // /api/happyhours
  server.register(printerRoutes, { prefix: '/api' }); // /api/printers, /api/print
  server.register(tipRoutes, { prefix: '/api' }); // tip routes
  server.register(locationRoutes, { prefix: '/api' }); // /api/locations
  server.register(loyaltyRoutes, { prefix: '/api/loyalty' }); // Loyalty program
  server.register(loyaltyProgramsRoutes, { prefix: '/api/loyalty/programs' }); // Loyalty Programs (12 tür)
  server.register(loyaltyClaimsRoutes, { prefix: '/api/loyalty' }); // Admin claim onayı (Google review screenshot)
  server.register(campaignsRoutes, { prefix: '/api' }); // /api/campaigns, /api/bundles, /api/coupons
  server.register(optionGroupsRoutes, { prefix: '/api/option-groups' }); // Reusable bundle opsiyon grupları
  server.register(gamesRoutes, { prefix: '/api/games' }); // Spin wheel + achievements + scratch card
  server.register(pizzaGameRoutes, { prefix: '/api/pizza-game' }); // Pizza Şefi mini-oyun global liderlik
  server.register(builderRoutes, { prefix: '/api/builder' }); // Pizza & Sandwich builder
  server.register(googleReviewsRoutes, { prefix: '/api/google-reviews' }); // Google Places reviews + curated fallback
  server.register(rawMaterialRoutes, { prefix: '/api/raw-materials' }); // Ham madde yönetimi
  server.register(expenseCategoryRoutes, { prefix: '/api/expense-categories' }); // Gider kategorileri (sabit + custom)
  server.register(expenseRoutes, { prefix: '/api/expenses' }); // Gider CRUD + approve + stats
  server.register(uploadRoutes, { prefix: '/api/upload' }); // File upload
  server.register(externalRoutes, { prefix: '/api/external' }); // External integration API
  server.register(integrationPartnerRoutes, { prefix: '/api/integration-partners' }); // Partner management UI
  server.register(mobileAuthRoutes, { prefix: '/api/mobile' }); // Mobile (Customer) auth: phone+OTP
  server.register(devicesRoutes, { prefix: '/api/mobile/devices' }); // Push token register
  server.register(notificationRoutes, { prefix: '/api' }); // /api/notifications/* (admin push)
  server.register(mobileOrdersRoutes, { prefix: '/api/mobile/orders' }); // Mobile customer orders
  server.register(mobileLoyaltyRoutes, { prefix: '/api/mobile/loyalty' }); // Mobile loyalty
  server.register(mobileAddressesRoutes, { prefix: '/api/mobile/addresses' }); // Mobile addresses
  server.register(mobileFavoritesRoutes, { prefix: '/api/mobile/favorites' }); // Mobile favorites
  server.register(mobilePrefsRoutes, { prefix: '/api/mobile/prefs' }); // Mobile notification prefs
  server.register(courierRoutes, { prefix: '/api/courier' }); // Courier mobile app endpoints

  // Platform (SaaS) — kayıt/onboarding/abonelik/süper-admin. Tenant hook ATLAR
  // (plugins/tenant.ts SKIP_PREFIXES: '/api/platform/'); kendi auth'unu kullanır.
  server.register(platformRoutes, { prefix: '/api/platform' });

  // "Bağlan" akışı — WhatsApp Sipariş Modülü entegrasyonu (Pro+ feature-flag)
  server.register(integrationRoutes, { prefix: '/api/integrations' });

  // Pazar yeri entegrasyonları — Trendyol GO bağlantı + eşleme (marketplace feature-flag)
  server.register(marketplaceRoutes, { prefix: '/api/marketplace' });

  // WebSocket - must be registered AFTER websocket plugin is ready
  server.after(() => {
    setupWebSocket(server);
  });

  return server;
}
