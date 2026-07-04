import { FastifyInstance } from 'fastify';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// =============================================================================
// Client model
// =============================================================================
// Her bağlı client'ı bir Set'te tutuyoruz; her client opsiyonel auth context'e
// sahip olabilir. Default: anonymous (yalnız public channel'lara abone olabilir).
// COURIER_LOCATION gibi PII içeren channel'lar için scope filtresi uygulanır.

type AuthContext = {
  userId?: string;       // Staff (POS/Kitchen/Courier) — User.id
  role?: string;         // UserRole
  customerId?: string;   // Müşteri — Customer.id
};

type ConnectedClient = {
  id: string;
  send: (data: string) => void;
  auth: AuthContext; // her zaman tanımlı, boş ise anonymous
};

// channel -> Set<ConnectedClient>
const clients = new Map<string, Set<ConnectedClient>>();

const CHANNELS = {
  ORDERS: 'orders',
  KITCHEN: 'kitchen',
  TABLES: 'tables',
  NOTIFICATIONS: 'notifications',
  MENU: 'menu',
  ANALYTICS: 'analytics',
  COURIER_LOCATION: 'courier_location', // kuryenin canlı GPS verisi (PII)
  COURIER_STATUS: 'courier_status',     // online/offline durumu (admin/POS)
};

// Auth gerektiren channel'lar — token verilmemişse subscribe reddedilir
const AUTHED_CHANNELS = new Set<string>([
  CHANNELS.COURIER_LOCATION,
  CHANNELS.COURIER_STATUS,
]);

function decodeToken(token: string | undefined): AuthContext {
  if (!token) return {};
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: payload.userId,
      role: payload.role,
      customerId: payload.customerId,
    };
  } catch {
    return {};
  }
}

// =============================================================================
// Setup
// =============================================================================
export function setupWebSocket(server: FastifyInstance) {
  server.get('/ws', { websocket: true }, function (this: any, connection: any, request: any) {
    const clientId = Math.random().toString(36).substring(7);

    // @fastify/websocket v11 — first arg WebSocket veya Request olabilir
    let ws: any = connection;
    if (!ws.send && request && request.send) ws = request;
    if (!ws.send && connection.socket && connection.socket.send) ws = connection.socket;

    if (typeof ws.send !== 'function') {
      console.error(`❌ ${clientId}: WebSocket.send bulunamadı`);
      return;
    }

    // İlk handshake'te query string'ten token alabiliriz (opsiyonel)
    // ws://api/ws?token=xxx — courier mobile app bunu kullanacak
    let initialAuth: AuthContext = {};
    try {
      const urlObj = new URL(request.url, 'http://localhost');
      const qToken = urlObj.searchParams.get('token');
      if (qToken) initialAuth = decodeToken(qToken);
    } catch { /* ignore */ }

    const client: ConnectedClient = {
      id: clientId,
      send: (data: string) => {
        try { ws.send(data); } catch { /* dead */ }
      },
      auth: initialAuth,
    };

    // Default abonelikler — auth gerektirmeyen kanallar
    const subscribedChannels = new Set<string>([
      CHANNELS.NOTIFICATIONS,
      CHANNELS.KITCHEN,
      CHANNELS.ORDERS,
    ]);
    subscribedChannels.forEach((channel) => {
      if (!clients.has(channel)) clients.set(channel, new Set());
      clients.get(channel)!.add(client);
    });

    console.log(`📢 ${clientId} subscribed: orders, kitchen, notifications (auth=${client.auth.role ?? client.auth.customerId ?? 'anon'})`);

    const onMessage = (rawMessage: any) => {
      try {
        const msgStr = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
        const message = JSON.parse(msgStr);

        switch (message.type) {
          case 'auth': {
            // Sonradan token güncelleme — login flow'undan sonra
            const newAuth = decodeToken(message.token);
            client.auth = newAuth;
            client.send(JSON.stringify({
              type: 'authed',
              role: newAuth.role ?? null,
              userId: newAuth.userId ?? null,
              customerId: newAuth.customerId ?? null,
            }));
            break;
          }
          case 'subscribe': {
            const ch = message.channel;
            if (!ch || !Object.values(CHANNELS).includes(ch)) {
              client.send(JSON.stringify({ type: 'subscribe_error', channel: ch, error: 'Geçersiz kanal' }));
              return;
            }
            // Subscribe sırasında token verilirse auth'u güncelle
            if (message.token) {
              client.auth = decodeToken(message.token);
            }
            if (AUTHED_CHANNELS.has(ch)) {
              const ok = isAuthorizedForChannel(ch, client.auth);
              if (!ok) {
                client.send(JSON.stringify({ type: 'subscribe_denied', channel: ch, error: 'Bu kanal için yetki gerekli' }));
                return;
              }
            }
            subscribedChannels.add(ch);
            if (!clients.has(ch)) clients.set(ch, new Set());
            clients.get(ch)!.add(client);
            client.send(JSON.stringify({ type: 'subscribed', channel: ch }));
            break;
          }
          case 'unsubscribe': {
            const ch = message.channel;
            if (ch) {
              subscribedChannels.delete(ch);
              clients.get(ch)?.delete(client);
              client.send(JSON.stringify({ type: 'unsubscribed', channel: ch }));
            }
            break;
          }
          case 'ping':
            client.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    const onClose = () => {
      console.log(`❌ WS Client disconnected: ${clientId}`);
      subscribedChannels.forEach((channel) => {
        clients.get(channel)?.delete(client);
      });
    };

    if (typeof ws.on === 'function') {
      ws.on('message', onMessage);
      ws.on('close', onClose);
      ws.on('error', () => onClose());
    } else if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('message', (e: any) => onMessage(e.data));
      ws.addEventListener('close', onClose);
      ws.addEventListener('error', () => onClose());
    }
  });
}

// =============================================================================
// Authorization
// =============================================================================
function isAuthorizedForChannel(channel: string, auth: AuthContext): boolean {
  if (channel === CHANNELS.COURIER_LOCATION) {
    // Admin/Manager/Kitchen/POS — yetkili. Customer (token'lı) sadece kendi
    // siparişinin kuryesini görebilir; bu broadcast filtresinde kontrol edilir.
    // Subscribe yetkisi: staff veya verified customer (yani token sahibi).
    return !!(auth.userId || auth.customerId);
  }
  if (channel === CHANNELS.COURIER_STATUS) {
    return !!auth.userId; // sadece staff
  }
  return true;
}

// =============================================================================
// Broadcasting
// =============================================================================

type BroadcastFilter = (auth: AuthContext) => boolean;

function broadcastFiltered(channel: string, data: any, filter?: BroadcastFilter) {
  const channelClients = clients.get(channel);
  if (!channelClients || channelClients.size === 0) return;

  const message = JSON.stringify({
    type: 'message',
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  let skippedCount = 0;
  const dead: ConnectedClient[] = [];
  channelClients.forEach((c) => {
    if (filter && !filter(c.auth)) {
      skippedCount++;
      return;
    }
    try {
      c.send(message);
      sentCount++;
    } catch {
      dead.push(c);
    }
  });
  dead.forEach((c) => channelClients.delete(c));

  if (skippedCount > 0) {
    console.log(`📡 Broadcast ${channel}: ${sentCount} sent, ${skippedCount} filtered`);
  } else {
    console.log(`📡 Broadcast ${channel}: ${sentCount} sent`);
  }
}

export function broadcast(channel: string, data: any) {
  broadcastFiltered(channel, data);
}

export function broadcastOrderUpdate(order: any) {
  broadcast(CHANNELS.ORDERS, { action: 'update', order });
  broadcast(CHANNELS.KITCHEN, { action: 'update', order });
}

export function broadcastNewOrder(order: any) {
  broadcast(CHANNELS.ORDERS, { action: 'new', order });
  broadcast(CHANNELS.KITCHEN, { action: 'new', order });
  broadcast(CHANNELS.NOTIFICATIONS, { action: 'new_order', message: `Yeni sipariş: #${order.orderNumber}`, order });
}

export function broadcastKitchenNewItems(order: any, newItems: any[]) {
  broadcast(CHANNELS.KITCHEN, { action: 'new_items', order, newItems });
}

export function broadcastTableUpdate(table: any) {
  broadcast(CHANNELS.TABLES, { action: 'update', table });
}

export function broadcastMenuUpdate(data: any) {
  broadcast(CHANNELS.MENU, data);
  if (data.action === 'availability' && !data.item?.available) {
    broadcast(CHANNELS.KITCHEN, { action: 'item_unavailable', item: data.item });
  }
  if (data.action === 'low-stock-alert') {
    broadcast(CHANNELS.NOTIFICATIONS, { action: 'low_stock', message: `⚠️ Düşük stok: ${data.item.name}`, item: data.item });
  }
}

export function broadcastAnalytics(data: any) {
  broadcast(CHANNELS.ANALYTICS, data);
}

/**
 * Broadcast courier location with strict PII filter.
 *
 * @param courierId - Kuryenin ID'si (filter için)
 * @param point - { latitude, longitude, accuracy?, heading?, speed?, ... }
 * @param relevantCustomerIds - Bu kuryenin aktif teslimatlarının müşteri ID'leri
 *   Sadece bu listedeki customerId'ye sahip client'lar konum alır.
 *   Boş array geçilirse hiçbir customer almaz (sadece staff).
 */
export function broadcastCourierLocation(
  courierId: string,
  point: any,
  relevantCustomerIds: string[] = [],
) {
  const customerIdSet = new Set(relevantCustomerIds);
  const payload = { action: 'location', courierId, point };

  broadcastFiltered(CHANNELS.COURIER_LOCATION, payload, (auth) => {
    // Staff (userId + role): ADMIN/MANAGER/CASHIER/COURIER/KITCHEN/WAITER her şeyi görür
    if (auth.userId) return true;
    // Customer: yalnız kendi siparişinin kuryesini görür
    if (auth.customerId && customerIdSet.has(auth.customerId)) return true;
    return false;
  });
}

/**
 * Kurye online/offline durum yayını — yalnız staff'a gider.
 */
export function broadcastCourierStatus(courierId: string, isOnline: boolean, extra?: any) {
  const payload = { action: 'status', courierId, isOnline, ...extra };
  broadcastFiltered(CHANNELS.COURIER_STATUS, payload, (auth) => !!auth.userId);
  // Notifications kanalına da staff bildirimi gönder (eski POS web için)
  broadcastFiltered(CHANNELS.NOTIFICATIONS, { action: 'courier_status', courierId, isOnline }, (auth) => !!auth.userId);
}

export { CHANNELS };
