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
  // In @fastify/websocket 10+, the handler receives (socket, request) where socket is a WebSocket
  server.get('/ws', { websocket: true }, (socket: any, req) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`✅ Client connected: ${clientId}`);
    
    // Debug what we have
    console.log(`🔍 socket.ws type:`, typeof socket?.ws);
    console.log(`🔍 socket.ws.on type:`, typeof socket?.ws?.on);
    console.log(`🔍 socket.ws.send type:`, typeof socket?.ws?.send);
    
    // In @fastify/websocket, when the handler gets a request object,
    // the actual WebSocket is in request.ws (which is socket.ws here since socket IS the request)
    const ws = socket.ws;
    
    if (!ws || typeof ws.on !== 'function') {
      console.error('❌ Cannot find valid WebSocket!');
      return;
    }
    
    console.log('🎯 Using socket.ws');

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
  channelClients.forEach((client: any) => {
    // Check readyState - can be number (1) or string ('open')
    const state = client.readyState;
    const isOpen = state === 1 || state === WebSocket.OPEN || state === 'open';
    if (isOpen) {
      try {
        client.send(message);
        sentCount++;
      } catch (err) {
        console.error('  ❌ Send error:', err);
      }
    }
  });

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
