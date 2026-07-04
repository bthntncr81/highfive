import { FastifyInstance } from 'fastify';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// =============================================================================
// Client model — TENANT-NAMESPACED
// =============================================================================
// Her bağlı client bir tenant'a bağlıdır (token'daki tenantId veya `?tenant=`
// query param'ından). Kanal anahtarı `${tenantId}:${channel}` olur; böylece bir
// tenant'ın yayını asla başka tenant'ın client'ına gitmez (çapraz sızıntı yok).
// tenantId çözülemeyen anonim client hiçbir tenant-kanalına abone olamaz.

type AuthContext = {
  tenantId?: string;     // ZORUNLU (tenant-namespace anahtarı) — yoksa abone olamaz
  userId?: string;       // Staff (POS/Kitchen/Courier) — User.id
  role?: string;         // UserRole
  customerId?: string;   // Müşteri — Customer.id
};

type ConnectedClient = {
  id: string;
  send: (data: string) => void;
  auth: AuthContext; // her zaman tanımlı; auth.tenantId boş ise anonymous
};

// namespacedChannel (`${tenantId}:${channel}`) -> Set<ConnectedClient>
const clients = new Map<string, Set<ConnectedClient>>();

function nsKey(tenantId: string, channel: string): string {
  return `${tenantId}:${channel}`;
}

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
      tenantId: payload.tenantId,
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

    // İlk handshake'te query string'ten tenant + token alabiliriz.
    //   ws://api/ws?token=<JWT>   → staff/customer (tenantId token'dan)
    //   ws://api/ws?tenant=<id>   → public sipariş sitesi (anonim, sadece bu tenant)
    let initialAuth: AuthContext = {};
    try {
      const urlObj = new URL(request.url, 'http://localhost');
      const qToken = urlObj.searchParams.get('token');
      if (qToken) initialAuth = decodeToken(qToken);
      const qTenant = urlObj.searchParams.get('tenant');
      if (qTenant && !initialAuth.tenantId) initialAuth.tenantId = qTenant;
    } catch { /* ignore */ }

    const client: ConnectedClient = {
      id: clientId,
      send: (data: string) => {
        try { ws.send(data); } catch { /* dead */ }
      },
      auth: initialAuth,
    };

    // Bu client'ın abone olduğu namespaced kanal anahtarları (cleanup için)
    const subscribedKeys = new Set<string>();

    function subscribeDefault() {
      if (!client.auth.tenantId) return; // tenant yok → abonelik yok
      for (const channel of [CHANNELS.NOTIFICATIONS, CHANNELS.KITCHEN, CHANNELS.ORDERS]) {
        const key = nsKey(client.auth.tenantId, channel);
        if (!clients.has(key)) clients.set(key, new Set());
        clients.get(key)!.add(client);
        subscribedKeys.add(key);
      }
    }

    function unsubscribeAll() {
      for (const key of subscribedKeys) clients.get(key)?.delete(client);
      subscribedKeys.clear();
    }

    // Tenant değişirse (anon→authed veya token güncelleme) tüm abonelikleri
    // yeni namespace'e taşı.
    function retargetTenant(newAuth: AuthContext) {
      const changed = client.auth.tenantId !== newAuth.tenantId;
      client.auth = newAuth;
      if (changed) {
        unsubscribeAll();
        subscribeDefault();
      }
    }

    subscribeDefault();

    console.log(
      `📢 ${clientId} connected tenant=${client.auth.tenantId ?? 'none'} ` +
      `(auth=${client.auth.role ?? client.auth.customerId ?? 'anon'})`,
    );

    const onMessage = (rawMessage: any) => {
      try {
        const msgStr = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
        const message = JSON.parse(msgStr);

        switch (message.type) {
          case 'auth': {
            // Sonradan token güncelleme — login flow'undan sonra
            const newAuth = decodeToken(message.token);
            retargetTenant(newAuth);
            client.send(JSON.stringify({
              type: 'authed',
              tenantId: newAuth.tenantId ?? null,
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
            // Subscribe sırasında token verilirse auth'u güncelle (tenant taşımalı olabilir)
            if (message.token) {
              retargetTenant(decodeToken(message.token));
            }
            if (!client.auth.tenantId) {
              client.send(JSON.stringify({ type: 'subscribe_denied', channel: ch, error: 'Tenant çözümlenemedi' }));
              return;
            }
            if (AUTHED_CHANNELS.has(ch)) {
              const ok = isAuthorizedForChannel(ch, client.auth);
              if (!ok) {
                client.send(JSON.stringify({ type: 'subscribe_denied', channel: ch, error: 'Bu kanal için yetki gerekli' }));
                return;
              }
            }
            const key = nsKey(client.auth.tenantId, ch);
            if (!clients.has(key)) clients.set(key, new Set());
            clients.get(key)!.add(client);
            subscribedKeys.add(key);
            client.send(JSON.stringify({ type: 'subscribed', channel: ch }));
            break;
          }
          case 'unsubscribe': {
            const ch = message.channel;
            if (ch && client.auth.tenantId) {
              const key = nsKey(client.auth.tenantId, ch);
              subscribedKeys.delete(key);
              clients.get(key)?.delete(client);
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
      unsubscribeAll();
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
    return !!(auth.userId || auth.customerId);
  }
  if (channel === CHANNELS.COURIER_STATUS) {
    return !!auth.userId; // sadece staff
  }
  return true;
}

// =============================================================================
// Broadcasting — HER yayın bir tenantId'ye scope'lanır
// =============================================================================

type BroadcastFilter = (auth: AuthContext) => boolean;

function broadcastFiltered(tenantId: string, channel: string, data: any, filter?: BroadcastFilter) {
  if (!tenantId) {
    console.warn(`⚠️ Broadcast ${channel}: tenantId yok — atlandı (fail-closed)`);
    return;
  }
  const channelClients = clients.get(nsKey(tenantId, channel));
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
    console.log(`📡 Broadcast ${tenantId}:${channel}: ${sentCount} sent, ${skippedCount} filtered`);
  } else {
    console.log(`📡 Broadcast ${tenantId}:${channel}: ${sentCount} sent`);
  }
}

export function broadcast(tenantId: string, channel: string, data: any) {
  broadcastFiltered(tenantId, channel, data);
}

// Entity taşıyan yayınlar tenantId'yi entity'den türetir (tüm tenant modeli
// tenantId taşır). Eksikse fail-closed: uyar + atla.
function tenantOf(entity: any, label: string): string | null {
  const t = entity?.tenantId;
  if (!t) {
    console.warn(`⚠️ ${label}: entity.tenantId yok — yayın atlandı`);
    return null;
  }
  return t;
}

export function broadcastOrderUpdate(order: any) {
  const t = tenantOf(order, 'broadcastOrderUpdate');
  if (!t) return;
  broadcast(t, CHANNELS.ORDERS, { action: 'update', order });
  broadcast(t, CHANNELS.KITCHEN, { action: 'update', order });
}

export function broadcastNewOrder(order: any) {
  const t = tenantOf(order, 'broadcastNewOrder');
  if (!t) return;
  broadcast(t, CHANNELS.ORDERS, { action: 'new', order });
  broadcast(t, CHANNELS.KITCHEN, { action: 'new', order });
  broadcast(t, CHANNELS.NOTIFICATIONS, { action: 'new_order', message: `Yeni sipariş: #${order.orderNumber}`, order });
}

export function broadcastKitchenNewItems(order: any, newItems: any[]) {
  const t = tenantOf(order, 'broadcastKitchenNewItems');
  if (!t) return;
  broadcast(t, CHANNELS.KITCHEN, { action: 'new_items', order, newItems });
}

export function broadcastTableUpdate(table: any) {
  const t = tenantOf(table, 'broadcastTableUpdate');
  if (!t) return;
  broadcast(t, CHANNELS.TABLES, { action: 'update', table });
}

// data.tenantId (zorunlu) — çağıran payload'a tenantId ekler; entity varsa
// data.item.tenantId'den de türetilebilir.
export function broadcastMenuUpdate(data: any) {
  const t = data?.tenantId ?? data?.item?.tenantId;
  if (!t) {
    console.warn('⚠️ broadcastMenuUpdate: tenantId yok — yayın atlandı');
    return;
  }
  broadcast(t, CHANNELS.MENU, data);
  if (data.action === 'availability' && !data.item?.available) {
    broadcast(t, CHANNELS.KITCHEN, { action: 'item_unavailable', item: data.item });
  }
  if (data.action === 'low-stock-alert') {
    broadcast(t, CHANNELS.NOTIFICATIONS, { action: 'low_stock', message: `⚠️ Düşük stok: ${data.item.name}`, item: data.item });
  }
}

export function broadcastAnalytics(tenantId: string, data: any) {
  broadcast(tenantId, CHANNELS.ANALYTICS, data);
}

/**
 * Broadcast courier location with strict PII filter — tenant-scoped.
 *
 * @param tenantId - Yayının ait olduğu tenant
 * @param courierId - Kuryenin ID'si (filter için)
 * @param point - { latitude, longitude, ... }
 * @param relevantCustomerIds - Bu kuryenin aktif teslimatlarının müşteri ID'leri
 */
export function broadcastCourierLocation(
  tenantId: string,
  courierId: string,
  point: any,
  relevantCustomerIds: string[] = [],
) {
  const customerIdSet = new Set(relevantCustomerIds);
  const payload = { action: 'location', courierId, point };

  broadcastFiltered(tenantId, CHANNELS.COURIER_LOCATION, payload, (auth) => {
    if (auth.userId) return true; // staff her şeyi görür
    if (auth.customerId && customerIdSet.has(auth.customerId)) return true;
    return false;
  });
}

/**
 * Kurye online/offline durum yayını — yalnız staff'a, tenant-scoped.
 */
export function broadcastCourierStatus(tenantId: string, courierId: string, isOnline: boolean, extra?: any) {
  const payload = { action: 'status', courierId, isOnline, ...extra };
  broadcastFiltered(tenantId, CHANNELS.COURIER_STATUS, payload, (auth) => !!auth.userId);
  broadcastFiltered(tenantId, CHANNELS.NOTIFICATIONS, { action: 'courier_status', courierId, isOnline }, (auth) => !!auth.userId);
}

export { CHANNELS };
