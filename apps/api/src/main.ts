// İnce başlatıcı: sunucu kurulumu server.ts'teki buildServer()'da.
// Burada yalnızca: prisma client, listen, zamanlanmış işler, graceful shutdown.
// (Testler buildServer()'ı listen etmeden inject ile kullanır.)

import { PrismaClient } from '@prisma/client';
import { buildServer } from './server';
import { processScheduledNotifications } from './routes/notifications';
import { processBirthdayPrograms } from './lib/loyalty-engine';
import { startDailyCloseScheduler } from './lib/daily-close';
import { startWinbackScheduler } from './lib/winback';
import { scheduleCourierLocationCleanup } from './lib/courier-location-cleanup';

const prisma = new PrismaClient();

const start = async () => {
  const server = await buildServer({ prisma });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await prisma.$disconnect();
    await server.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 HighFive API running on http://localhost:${port}`);

    // Push notification scheduler — her 30 saniyede bir scheduled bildirimleri işle
    setInterval(() => {
      processScheduledNotifications(prisma).catch((e) =>
        server.log.error({ err: e }, '[push-scheduler] tick failed'),
      );
    }, 30_000);

    // Doğum günü programları — saatte bir kontrol et (gün başında push gönderir)
    setInterval(() => {
      processBirthdayPrograms(prisma).catch((e) =>
        server.log.error({ err: e }, '[birthday-scheduler] tick failed'),
      );
    }, 3600_000);
    // İlk tick (uygulama yeni başlatıldığında 1 dk sonra)
    setTimeout(() => {
      processBirthdayPrograms(prisma).catch(() => {});
    }, 60_000);

    // Gün sonu auto-close — her gece 00:00'da açık siparişleri COMPLETED yap,
    // masaları FREE'ye çek (servisin garson "ödendi" basmayı unutmasına karşı).
    startDailyCloseScheduler(prisma);

    // Win-back kampanyası — sabah 10:00'da uzun süredir sipariş geçmeyen
    // pushConsent açık müşterilere %15 indirim teklifi push'u gönderir.
    startWinbackScheduler(prisma);

    // Courier konum geçmişi temizleme — 24 saatten eski kayıtlar saatte 1 kez silinir.
    scheduleCourierLocationCleanup(prisma);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
