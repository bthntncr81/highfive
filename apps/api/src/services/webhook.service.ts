import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

/**
 * Webhook Dispatcher Service
 * Sipariş durumu değiştiğinde ilgili integration partner'ların webhook URL'lerine POST atar
 */
class WebhookService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s

  /**
   * Sipariş durumu değiştiğinde webhook gönder
   */
  async dispatchOrderStatusChanged(order: any): Promise<void> {
    try {
      // Sadece dış sistemden gelen siparişler için webhook gönder
      if (!order.externalOrderId) return;

      // ExternalOrderId'ye sahip partner'ı bul
      // Partner'ı bulmak için source'a bak veya tüm aktif partner'ları kontrol et
      const partners = await prisma.integrationPartner.findMany({
        where: {
          isActive: true,
          webhookUrl: { not: null },
        },
      });

      if (partners.length === 0) return;

      const payload: WebhookPayload = {
        event: `order.${order.status.toLowerCase()}`,
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          externalOrderId: order.externalOrderId,
          status: order.status,
          type: order.type,
          customerName: order.customerName,
          total: order.total ? Number(order.total) : undefined,
          updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
        },
      };

      // Her partner'a webhook gönder
      for (const partner of partners) {
        if (!partner.webhookUrl) continue;
        this.sendWebhookWithRetry(partner, payload).catch((err) => {
          console.error(`❌ [Webhook] Final failure for partner ${partner.name}:`, err.message);
        });
      }
    } catch (error) {
      console.error('❌ [Webhook] Dispatch error:', error);
    }
  }

  /**
   * Menü değiştiğinde webhook gönder
   */
  async dispatchMenuUpdated(): Promise<void> {
    try {
      const partners = await prisma.integrationPartner.findMany({
        where: {
          isActive: true,
          webhookUrl: { not: null },
        },
      });

      if (partners.length === 0) return;

      const payload: WebhookPayload = {
        event: 'menu.updated',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Menu has been updated. Please re-sync.',
        },
      };

      for (const partner of partners) {
        if (!partner.webhookUrl) continue;
        this.sendWebhookWithRetry(partner, payload).catch((err) => {
          console.error(`❌ [Webhook] Menu update failure for ${partner.name}:`, err.message);
        });
      }
    } catch (error) {
      console.error('❌ [Webhook] Menu dispatch error:', error);
    }
  }

  /**
   * Webhook gönder (retry ile)
   */
  private async sendWebhookWithRetry(partner: any, payload: WebhookPayload): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.sendWebhook(partner, payload);

        // Log success
        await this.logWebhook(partner.id, payload.event, payload, result.statusCode, null, attempt + 1);

        console.log(
          `✅ [Webhook] ${payload.event} → ${partner.name} (attempt ${attempt + 1}, status: ${result.statusCode})`,
        );
        return;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `⚠️ [Webhook] ${payload.event} → ${partner.name} attempt ${attempt + 1} failed: ${error.message}`,
        );

        if (attempt < this.MAX_RETRIES - 1) {
          await this.sleep(this.RETRY_DELAYS[attempt]);
        }
      }
    }

    // All retries failed
    await this.logWebhook(
      partner.id,
      payload.event,
      payload,
      null,
      lastError?.message || 'Unknown error',
      this.MAX_RETRIES,
    );
  }

  /**
   * Tek bir webhook isteği gönder
   */
  private async sendWebhook(
    partner: any,
    payload: WebhookPayload,
  ): Promise<{ statusCode: number }> {
    const body = JSON.stringify(payload);

    // HMAC-SHA256 imza oluştur
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
    };

    if (partner.webhookSecret) {
      const signature = createHmac('sha256', partner.webhookSecret).update(body).digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(partner.webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { statusCode: response.status };
  }

  /**
   * Webhook log kaydet
   */
  private async logWebhook(
    partnerId: string,
    event: string,
    payload: any,
    statusCode: number | null,
    error: string | null,
    attempts: number,
  ): Promise<void> {
    try {
      await prisma.webhookLog.create({
        data: {
          partnerId,
          event,
          payload,
          statusCode,
          error,
          attempts,
        },
      });
    } catch (err) {
      console.error('❌ [Webhook] Log save error:', err);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const webhookService = new WebhookService();
