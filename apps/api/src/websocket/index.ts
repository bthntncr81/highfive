import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

// Connected clients
const clients = new Map<string, Set<WebSocket>>();

// Channels
const CHANNELS = {
  ORDERS: 'orders',
  KITCHEN: 'kitchen',
  TABLES: 'tables',
  NOTIFICATIONS: 'notifications',
  MENU: 'menu',
  ANALYTICS: 'analytics',
};

export function setupWebSocket(server: FastifyInstance) {
  // @fastify/websocket v11: socket IS the WebSocket object directly
  server.get('/ws', { websocket: true }, (socket: any, req) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`✅ Client connected: ${clientId}`);

    // @fastify/websocket v11: socket is a Duplex stream wrapper
    // The actual WebSocket with .send() can be at different places
    let ws: any = null;
    if (typeof socket.send === 'function') {
      ws = socket; // Direct WebSocket
    } else if (socket.socket && typeof socket.socket.send === 'function') {
      ws = socket.socket; // Wrapped in .socket
    } else if (socket._ws && typeof socket._ws.send === 'function') {
      ws = socket._ws;
    } else {
      // Last resort: use socket as Duplex stream - write JSON directly
      console.log('🔍 Socket keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(socket)).join(', '));
      console.log('🔍 Socket direct keys:', Object.keys(socket).join(', '));
      // Try to find the raw websocket
      for (const key of Object.keys(socket)) {
        const val = (socket as any)[key];
        if (val && typeof val === 'object' && typeof val.send === 'function') {
          ws = val;
          console.log(`🎯 Found WS at socket.${key}`);
          break;
        }
      }
    }

    if (!ws) {
      console.error('❌ Cannot find valid WebSocket with send()! Using socket.write fallback');
      // Use socket itself with write() method for Duplex streams
      ws = {
        on: socket.on.bind(socket),
        send: (data: string) => socket.write(data),
        readyState: 'open',
      };
    }

    // Default to notifications channel
    let subscribedChannels = new Set<string>([CHANNELS.NOTIFICATIONS]);
    
    // Auto-subscribe to notifications and kitchen channels
    [CHANNELS.NOTIFICATIONS, CHANNELS.KITCHEN, CHANNELS.ORDERS].forEach(channel => {
      if (!clients.has(channel)) {
        clients.set(channel, new Set());
      }
      clients.get(channel)!.add(ws);
    });
    subscribedChannels.add(CHANNELS.KITCHEN);
    subscribedChannels.add(CHANNELS.ORDERS);
    console.log(`📢 ${clientId} auto-subscribed to notifications, kitchen, orders`);

    ws.on('message', (rawMessage: any) => {
      try {
        const msgStr = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
        const message = JSON.parse(msgStr);
        console.log(`📨 Message from ${clientId}:`, message.type);

        switch (message.type) {
          case 'subscribe':
            if (
              message.channel &&
              Object.values(CHANNELS).includes(message.channel)
            ) {
              subscribedChannels.add(message.channel);

              if (!clients.has(message.channel)) {
                clients.set(message.channel, new Set());
              }
              clients.get(message.channel)!.add(ws);

              console.log(`📢 ${clientId} subscribed to ${message.channel}`);

              ws.send(
                JSON.stringify({
                  type: 'subscribed',
                  channel: message.channel,
                }),
              );
            }
            break;

          case 'unsubscribe':
            if (message.channel) {
              subscribedChannels.delete(message.channel);
              clients.get(message.channel)?.delete(ws);

              ws.send(
                JSON.stringify({
                  type: 'unsubscribed',
                  channel: message.channel,
                }),
              );
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      console.log(`❌ Client disconnected: ${clientId}`);
      // Remove from all channels
      subscribedChannels.forEach((channel) => {
        clients.get(channel)?.delete(ws);
      });
    });

    ws.on('error', (err: Error) => {
      console.error('WebSocket error:', err);
    });
  });
}

// Broadcast to a specific channel
export function broadcast(channel: string, data: any) {
  const channelClients = clients.get(channel);
  const clientCount = channelClients?.size || 0;

  console.log(`📡 Broadcasting to ${channel}: ${clientCount} clients`);

  if (!channelClients || clientCount === 0) {
    console.log(`⚠️ No clients subscribed to ${channel}`);
    return;
  }

  const message = JSON.stringify({
    type: 'message',
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  const deadClients: any[] = [];
  channelClients.forEach((client: any) => {
    try {
      console.log(`  📤 Sending to client: typeof=${typeof client}, hasOn=${typeof client?.on}, hasSend=${typeof client?.send}, readyState=${client?.readyState}`);
      if (typeof client.send === 'function') {
        client.send(message);
        sentCount++;
      } else {
        console.log('  ⚠️ Client has no send method, removing');
        deadClients.push(client);
      }
    } catch (err: any) {
      console.error(`  ❌ Send error: ${err.message}`);
      deadClients.push(client);
    }
  });
  deadClients.forEach(c => channelClients.delete(c));

  console.log(`✅ Sent to ${sentCount}/${clientCount} clients on ${channel}`);
}

// Broadcast order updates
export function broadcastOrderUpdate(order: any) {
  broadcast(CHANNELS.ORDERS, { action: 'update', order });
  broadcast(CHANNELS.KITCHEN, { action: 'update', order });
}

// Broadcast new order
export function broadcastNewOrder(order: any) {
  broadcast(CHANNELS.ORDERS, { action: 'new', order });
  broadcast(CHANNELS.KITCHEN, { action: 'new', order });
  broadcast(CHANNELS.NOTIFICATIONS, {
    action: 'new_order',
    message: `Yeni sipariş: #${order.orderNumber}`,
    order,
  });
}

// Broadcast table update
export function broadcastTableUpdate(table: any) {
  broadcast(CHANNELS.TABLES, { action: 'update', table });
}

// Broadcast menu update (stock, availability, price changes)
export function broadcastMenuUpdate(data: any) {
  broadcast(CHANNELS.MENU, data);
  // Also notify kitchen if item becomes unavailable
  if (data.action === 'availability' && !data.item?.available) {
    broadcast(CHANNELS.KITCHEN, {
      action: 'item_unavailable',
      item: data.item,
    });
  }
  // Notify about low stock
  if (data.action === 'low-stock-alert') {
    broadcast(CHANNELS.NOTIFICATIONS, {
      action: 'low_stock',
      message: `⚠️ Düşük stok: ${data.item.name} (${data.remaining} adet kaldı)`,
      item: data.item,
    });
  }
}

// Broadcast analytics event
export function broadcastAnalytics(data: any) {
  broadcast(CHANNELS.ANALYTICS, data);
}

export { CHANNELS };
