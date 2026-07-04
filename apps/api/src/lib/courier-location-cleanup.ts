// Courier location TTL cleanup.
// 24 saatten eski kayıtları siler. Tablo şişmesin diye günde 1 kez çalışır.

import { PrismaClient } from '@prisma/client';

const RETENTION_HOURS = 24;
const BATCH_SIZE = 5000;

export async function cleanupOldCourierLocations(prisma: PrismaClient): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
  let totalDeleted = 0;

  // Büyük tablolarda tek deleteMany lock yapabilir; batch'le sil.
  // Performance index: CourierLocation_createdAt_idx
  while (true) {
    const batch = await prisma.courierLocation.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    const result = await prisma.courierLocation.deleteMany({
      where: { id: { in: batch.map((r) => r.id) } },
    });
    totalDeleted += result.count;

    if (batch.length < BATCH_SIZE) break;
  }

  return totalDeleted;
}

export function scheduleCourierLocationCleanup(prisma: PrismaClient) {
  // İlk tick — app boot'tan 5dk sonra (DB ısınsın)
  setTimeout(() => {
    cleanupOldCourierLocations(prisma)
      .then((n) => console.log(`🧹 Courier location cleanup: ${n} kayıt silindi`))
      .catch((err) => console.error('🧹 Cleanup error:', err));
  }, 5 * 60 * 1000);

  // Sonra saatte 1 kez
  return setInterval(
    () => {
      cleanupOldCourierLocations(prisma)
        .then((n) => {
          if (n > 0) console.log(`🧹 Courier location cleanup: ${n} kayıt silindi`);
        })
        .catch((err) => console.error('🧹 Cleanup error:', err));
    },
    60 * 60 * 1000,
  );
}
