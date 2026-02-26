import Fastify from 'fastify';
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
import campaignsRoutes from './routes/campaigns';
import rawMaterialRoutes from './routes/rawmaterials';
import uploadRoutes from './routes/upload';

// WebSocket handler
import { setupWebSocket } from './websocket';

const prisma = new PrismaClient();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Plugins
server.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});

server.register(websocket);
server.register(formbody); // For 3DS callback form data
server.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// Serve uploaded files statically
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
server.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
  decorateReply: false,
});

// Decorate with prisma
server.decorate('prisma', prisma);

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
server.register(campaignsRoutes, { prefix: '/api' }); // /api/campaigns, /api/bundles, /api/coupons
server.register(rawMaterialRoutes, { prefix: '/api/raw-materials' }); // Ham madde yönetimi
server.register(uploadRoutes, { prefix: '/api/upload' }); // File upload

// WebSocket
setupWebSocket(server);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 HighFive API running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
