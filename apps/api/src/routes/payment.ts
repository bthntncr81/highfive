import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { broadcastOrderUpdate } from '../websocket';
import crypto from 'crypto';

// iyzico Configuration
const IYZICO_API_KEY = process.env.IYZICO_API_KEY || 'sandbox-ifkcjkaPdtshoWkt36gjOwpZ9Z5XsUZM';
const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || 'sandbox-0PfKYCdPshA2ZhqfdGq6JxfB5dXQWeqa';
const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

/**
 * iyzico HMACSHA256 Authentication
 * Reference: https://docs.iyzico.com/on-hazirliklar/kimlik-dogrulama/hmacsha256-kimlik-dogrulama
 * 
 * Format: IYZWSv2 base64EncodedAuthorization
 * encryptedData = HMACSHA256(randomKey + uri_path + request_body, secretKey)
 * authorizationString = "apiKey:" + apiKey + "&randomKey:" + randomKey + "&signature:" + encryptedData
 * base64EncodedAuthorization = base64(authorizationString)
 */
function generateAuthorizationHeader(uriPath: string, requestBody: string): { authorization: string; randomKey: string } {
  // Generate random key (timestamp + random string)
  const randomKey = Date.now().toString() + crypto.randomBytes(8).toString('hex');
  
  // Create payload: randomKey + uri_path + request_body
  const payload = randomKey + uriPath + requestBody;
  
  // Generate HMACSHA256 signature
  const encryptedData = crypto
    .createHmac('sha256', IYZICO_SECRET_KEY)
    .update(payload, 'utf8')
    .digest('hex');
  
  // Build authorization string
  const authorizationString = `apiKey:${IYZICO_API_KEY}&randomKey:${randomKey}&signature:${encryptedData}`;
  
  // Base64 encode
  const base64EncodedAuthorization = Buffer.from(authorizationString).toString('base64');
  
  // Final authorization header: IYZWSv2 + space + base64EncodedAuthorization
  const authorization = `IYZWSv2 ${base64EncodedAuthorization}`;
  
  console.log('🔐 Auth Debug:');
  console.log('  randomKey:', randomKey);
  console.log('  uriPath:', uriPath);
  console.log('  payload (first 100 chars):', payload.substring(0, 100));
  console.log('  signature:', encryptedData);
  console.log('  authorization (first 50 chars):', authorization.substring(0, 50) + '...');
  
  return { authorization, randomKey };
}

// Award loyalty points after payment
async function awardLoyaltyPoints(prisma: any, phone: string, orderId: string, totalAmount: number) {
  try {
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Find customer by phone
    const customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
      include: { loyaltyTier: true },
    });

    if (!customer) {
      console.log(`📍 Loyalty: No customer found for phone ${cleanPhone}`);
      return;
    }

    // Get loyalty settings (default: 10 TL = 1 point)
    const settings = await prisma.settings.findUnique({ where: { key: 'loyalty' } });
    const pointsPerTL = (settings?.value as any)?.pointsPerTL || 10;
    
    // Calculate points (with tier multiplier)
    const basePoints = Math.floor(totalAmount / pointsPerTL);
    const multiplier = customer.loyaltyTier?.pointsMultiplier ? Number(customer.loyaltyTier.pointsMultiplier) : 1;
    const earnedPoints = Math.floor(basePoints * multiplier);

    if (earnedPoints <= 0) {
      console.log(`📍 Loyalty: No points to award for ${totalAmount} TL`);
      return;
    }

    // Update customer points
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalPoints: { increment: earnedPoints },
        lifetimePoints: { increment: earnedPoints },
        totalSpent: { increment: totalAmount },
        orderCount: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });

    // Create points transaction record
    await prisma.pointsTransaction.create({
      data: {
        customerId: customer.id,
        orderId,
        points: earnedPoints,
        type: 'EARN',
        description: `Sipariş #${orderId.slice(-6)} - ${totalAmount.toFixed(2)} TL`,
      },
    });

    // Create customer order record
    await prisma.customerOrder.create({
      data: {
        customerId: customer.id,
        orderId,
        pointsEarned: earnedPoints,
        pointsSpent: 0,
      },
    });

    console.log(`📍 Loyalty: Awarded ${earnedPoints} points to ${customer.name || cleanPhone} (Total: ${customer.totalPoints + earnedPoints})`);

    // Check for tier upgrade
    await checkTierUpgrade(prisma, customer.id);
  } catch (error) {
    console.error('❌ Loyalty points error:', error);
    // Don't throw - payment should still succeed even if points fail
  }
}

// Check if customer should be upgraded to a higher tier
async function checkTierUpgrade(prisma: any, customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return;

    // Get all tiers sorted by minPoints descending
    const tiers = await prisma.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { minPoints: 'desc' },
    });

    // Find the highest tier the customer qualifies for
    for (const tier of tiers) {
      if (customer.lifetimePoints >= tier.minPoints) {
        if (customer.loyaltyTierId !== tier.id) {
          await prisma.customer.update({
            where: { id: customerId },
            data: { loyaltyTierId: tier.id },
          });
          console.log(`📍 Loyalty: Upgraded ${customer.name || customer.phone} to ${tier.name}!`);
        }
        break;
      }
    }
  } catch (error) {
    console.error('❌ Tier upgrade check error:', error);
  }
}

// Make iyzico API request
async function iyzicoRequest(endpoint: string, body: any): Promise<any> {
  const url = `${IYZICO_BASE_URL}${endpoint}`;
  const requestBody = JSON.stringify(body);
  const { authorization, randomKey } = generateAuthorizationHeader(endpoint, requestBody);
  
  console.log('📤 iyzico Request:', endpoint);
  console.log('📤 URL:', url);
  console.log('📤 Body:', requestBody);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomKey,
      },
      body: requestBody,
    });
    
    const data = await response.json();
    console.log('📥 iyzico Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error: any) {
    console.error('❌ iyzico Request Error:', error.message);
    throw error;
  }
}

// Generate unique conversation ID
function generateConversationId(): string {
  return `HF${Date.now()}`;
}

export default async function paymentRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Initialize 3DS Payment
  server.post('/initialize-3ds', async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      orderId,
      cardHolderName,
      cardNumber,
      expireMonth,
      expireYear,
      cvc,
      customerName,
      customerEmail,
      customerPhone,
      customerIp,
      customerAddress,
      customerCity,
    } = request.body as {
      orderId?: string;
      cardHolderName: string;
      cardNumber: string;
      expireMonth: string;
      expireYear: string;
      cvc: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      customerIp?: string;
      customerAddress?: string;
      customerCity?: string;
    };

    // Validate required fields
    if (!cardHolderName || !cardNumber || !expireMonth || !expireYear || !cvc) {
      return reply.status(400).send({ error: 'Kart bilgileri eksik' });
    }

    if (!customerName || !customerEmail || !customerPhone) {
      return reply.status(400).send({ error: 'Müşteri bilgileri eksik' });
    }

    let orderItems: any[] = [];
    let order: any = null;

    // If orderId provided, get order from database
    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { menuItem: true },
          },
          table: true,
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Sipariş bulunamadı' });
      }

      orderItems = order.items.map((item: any) => ({
        id: item.id,
        name: item.menuItem.name,
        category1: 'Yemek',
        itemType: 'PHYSICAL',
        price: (Number(item.unitPrice) * item.quantity).toFixed(2),
      }));
    } else {
      return reply.status(400).send({ error: 'Sipariş ID gerekli' });
    }

    const conversationId = generateConversationId();
    const callbackUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/payment/3ds-callback`;

    // Calculate total from basket items
    const basketTotal = orderItems.reduce((sum: number, item: any) => sum + parseFloat(item.price), 0);

    // Format phone number for iyzico (+90XXXXXXXXXX format)
    let formattedPhone = customerPhone.replace(/\s/g, '').replace(/-/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.startsWith('0') 
        ? '+90' + formattedPhone.substring(1) 
        : '+90' + formattedPhone;
    }

    // Get client IP
    const clientIp = customerIp || 
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] || 
      request.ip || 
      '85.34.78.112';

    const paymentRequest = {
      locale: 'tr',
      conversationId,
      price: basketTotal.toFixed(2),
      paidPrice: basketTotal.toFixed(2),
      currency: 'TRY',
      installment: 1,
      basketId: orderId,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl,
      paymentCard: {
        cardHolderName,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expireMonth,
        expireYear,
        cvc,
        registerCard: 0,
      },
      buyer: {
        id: `BUYER-${Date.now()}`,
        name: customerName.split(' ')[0] || customerName,
        surname: customerName.split(' ').slice(1).join(' ') || 'Müşteri',
        gsmNumber: formattedPhone,
        email: customerEmail,
        identityNumber: '11111111111',
        registrationAddress: customerAddress || 'High Five Restaurant, Istanbul',
        ip: clientIp,
        city: customerCity || 'Istanbul',
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: customerName,
        city: customerCity || 'Istanbul',
        country: 'Turkey',
        address: customerAddress || 'High Five Restaurant, Istanbul',
      },
      billingAddress: {
        contactName: customerName,
        city: customerCity || 'Istanbul',
        country: 'Turkey',
        address: customerAddress || 'High Five Restaurant, Istanbul',
      },
      basketItems: orderItems,
    };

    try {
      const result = await iyzicoRequest('/payment/3dsecure/initialize', paymentRequest);

      if (result.status === 'success') {
        // Store conversation ID for later verification
        await prisma.settings.upsert({
          where: { key: `payment_${conversationId}` },
          update: { value: { orderId, status: 'initialized', createdAt: new Date().toISOString() } },
          create: { key: `payment_${conversationId}`, value: { orderId, status: 'initialized', createdAt: new Date().toISOString() } },
        });

        return {
          success: true,
          conversationId,
          htmlContent: result.threeDSHtmlContent,
        };
      } else {
        console.error('❌ iyzico Error:', result.errorMessage, result.errorCode);
        return reply.status(400).send({
          error: result.errorMessage || 'Ödeme başlatılamadı',
          errorCode: result.errorCode,
        });
      }
    } catch (error: any) {
      console.error('❌ Payment initialization error:', error);
      return reply.status(500).send({ error: 'Ödeme sistemi hatası: ' + error.message });
    }
  });

  // 3DS Callback - Called by iyzico after 3DS verification
  server.post('/3ds-callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;
    
    console.log('📥 3DS Callback received:', body);

    const { status, paymentId, conversationId, mdStatus } = body;

    // Return HTML that posts message to parent window
    const isSuccess = status === 'success';
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isSuccess ? 'Ödeme Başarılı' : 'Ödeme İşleniyor'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #C41E3A 0%, #8B0000 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255,255,255,0.1);
              border-radius: 24px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            .icon {
              font-size: 72px;
              margin-bottom: 20px;
              animation: ${isSuccess ? 'bounce' : 'spin'} 1s ease-in-out infinite;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-15px) scale(1.1); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            h2 { 
              font-size: 24px;
              margin-bottom: 10px;
              font-weight: 700;
            }
            p { 
              opacity: 0.9;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${isSuccess ? '✅' : '🍕'}</div>
            <h2>${isSuccess ? 'Ödeme Başarılı!' : 'İşlem Devam Ediyor...'}</h2>
            <p>${isSuccess ? 'Pencere kapanıyor...' : 'Lütfen bekleyin...'}</p>
          </div>
          <script>
            const result = {
              type: '3ds_result',
              status: '${status || ''}',
              paymentId: '${paymentId || ''}',
              conversationId: '${conversationId || ''}',
              mdStatus: '${mdStatus || ''}'
            };
            
            console.log('3DS Result:', result);
            
            if (window.opener) {
              window.opener.postMessage(result, '*');
              setTimeout(() => window.close(), 2500);
            } else if (window.parent !== window) {
              window.parent.postMessage(result, '*');
            } else {
              window.location.href = '/order?payment=${isSuccess ? 'success' : 'failed'}';
            }
          </script>
        </body>
      </html>
    `;

    reply.type('text/html').send(htmlResponse);
  });

  // Complete 3DS Payment
  server.post('/complete-3ds', async (request: FastifyRequest, reply: FastifyReply) => {
    const { paymentId, conversationId, orderId } = request.body as {
      paymentId: string;
      conversationId: string;
      orderId?: string;
    };

    if (!paymentId) {
      return reply.status(400).send({ error: 'Payment ID gerekli' });
    }

    const completeRequest = {
      locale: 'tr',
      conversationId: conversationId || generateConversationId(),
      paymentId,
    };

    try {
      const result = await iyzicoRequest('/payment/3dsecure/auth', completeRequest);

      if (result.status === 'success') {
        // Payment successful - update order
        if (orderId) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, table: true },
          });

          if (order) {
            // Create payment record
            await prisma.payment.create({
              data: {
                orderId,
                amount: Number(result.paidPrice),
                method: PaymentMethod.CREDIT_CARD,
                reference: result.paymentId,
              },
            });

            // Update order status
            const updatedOrder = await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: PaymentStatus.PAID,
                paymentMethod: PaymentMethod.CREDIT_CARD,
                status: OrderStatus.CONFIRMED,
              },
              include: {
                table: true,
                items: { include: { menuItem: true } },
              },
            });

            // Mark all items as paid
            for (const item of order.items) {
              await prisma.orderItem.update({
                where: { id: item.id },
                data: { paidQuantity: item.quantity },
              });
            }

            // Award loyalty points if customer phone exists
            if (order.customerPhone) {
              await awardLoyaltyPoints(prisma, order.customerPhone, orderId, Number(order.total));
            }

            broadcastOrderUpdate(updatedOrder);

            // Clean up payment session
            await prisma.settings.delete({
              where: { key: `payment_${conversationId}` },
            }).catch(() => {});
          }
        }

        return {
          success: true,
          paymentId: result.paymentId,
          message: 'Ödeme başarıyla tamamlandı!',
        };
      } else {
        return reply.status(400).send({
          error: result.errorMessage || 'Ödeme tamamlanamadı',
          errorCode: result.errorCode,
        });
      }
    } catch (error: any) {
      console.error('❌ Payment completion error:', error);
      return reply.status(500).send({ error: 'Ödeme tamamlama hatası' });
    }
  });

  // Get payment status
  server.get('/status/:conversationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { conversationId } = request.params as { conversationId: string };

    const paymentSession = await prisma.settings.findUnique({
      where: { key: `payment_${conversationId}` },
    });

    if (!paymentSession) {
      return reply.status(404).send({ error: 'Ödeme oturumu bulunamadı' });
    }

    return { status: (paymentSession.value as any).status };
  });

  // Test endpoint to verify signature
  server.post('/test-auth', async (request: FastifyRequest, reply: FastifyReply) => {
    const testBody = {
      locale: 'tr',
      binNumber: '535805',
      conversationId: 'testConversation123',
    };

    try {
      const result = await iyzicoRequest('/payment/bin/check', testBody);
      return { result };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
