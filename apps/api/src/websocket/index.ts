import { FastifyInstance } from 'fastify';

// Connected clients - store raw write functions
const clients = new Map<string, Set<{ send: (data: string) => void }>>();

const CHANNELS = {
  ORDERS: 'orders',
  KITCHEN: 'kitchen',
  TABLES: 'tables',
  NOTIFICATIONS: 'notifications',
  MENU: 'menu',
  ANALYTICS: 'analytics',
};

export function setupWebSocket(server: FastifyInstance) {
  // Use regular function to get proper 'this' context from fastify
  server.get('/ws', { websocket: true }, function (this: any, connection: any, request: any) {
    const clientId = Math.random().toString(36).substring(7);

    // In @fastify/websocket v11, first arg could be WebSocket or Request depending on version
    // Detect: if connection has .send it's WebSocket, if it has .raw it's Request
    let ws: any = connection;
    if (!ws.send && request && request.send) {
      // Parameters are swapped
      ws = request;
    }
    if (!ws.send && connection.socket && connection.socket.send) {
      ws = connection.socket;
    }

    console.log(`✅ WS Client ${clientId}: ws.send=${typeof ws.send}, ws.on=${typeof ws.on}, ws.constructor=${ws.constructor?.name}`);

    if (typeof ws.send !== 'function') {
      console.error(`❌ ${clientId}: Cannot find WebSocket.send! Args: connection.constructor=${connection.constructor?.name}, request.constructor=${request?.constructor?.name}`);
      // Log all args to find the WebSocket
      for (const [i, arg] of [connection, request].entries()) {
        if (arg) {
          const p = Object.getOwnPropertyNames(Object.getPrototypeOf(arg)).filter((m: string) => !m.startsWith('_'));
          console.log(`  arg${i}: constructor=${arg.constructor?.name}, methods=${p.slice(0,10).join(',')}`);
        }
      }
      return;
    }

    const sendFn = (data: string) => {
      try { ws.send(data); } catch (e) { /* dead */ }
    };

    const client = { send: sendFn };

    // Subscribe to default channels
    const subscribedChannels = new Set<string>([CHANNELS.NOTIFICATIONS, CHANNELS.KITCHEN, CHANNELS.ORDERS]);
    subscribedChannels.forEach(channel => {
      if (!clients.has(channel)) clients.set(channel, new Set());
      clients.get(channel)!.add(client);
    });
    console.log(`📢 ${clientId} subscribed to orders, kitchen, notifications`);

    // Handle incoming messages
    const onMessage = (rawMessage: any) => {
      try {
        const msgStr = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
        const message = JSON.parse(msgStr);

        switch (message.type) {
          case 'subscribe':
            if (message.channel && Object.values(CHANNELS).includes(message.channel)) {
              subscribedChannels.add(message.channel);
              if (!clients.has(message.channel)) clients.set(message.channel, new Set());
              clients.get(message.channel)!.add(client);
              sendFn!(JSON.stringify({ type: 'subscribed', channel: message.channel }));
            }
            break;
          case 'unsubscribe':
            if (message.channel) {
              subscribedChannels.delete(message.channel);
              clients.get(message.channel)?.delete(client);
              sendFn!(JSON.stringify({ type: 'unsubscribed', channel: message.channel }));
            }
            break;
          case 'ping':
            sendFn!(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (err) {
        // ignore parse errors
      }
    };

    const onClose = () => {
      console.log(`❌ WS Client disconnected: ${clientId}`);
      subscribedChannels.forEach(channel => {
        clients.get(channel)?.delete(client);
      });
    };

    // Attach event listeners - try different patterns
    if (typeof socket.on === 'function') {
      socket.on('message', onMessage);
      socket.on('close', onClose);
      socket.on('error', () => onClose());
    } else if (typeof socket.addEventListener === 'function') {
      socket.addEventListener('message', (e: any) => onMessage(e.data));
      socket.addEventListener('close', onClose);
      socket.addEventListener('error', () => onClose());
    }
  });
}

// Broadcast to a specific channel
export function broadcast(channel: string, data: any) {
  const channelClients = clients.get(channel);
  const clientCount = channelClients?.size || 0;

  if (!channelClients || clientCount === 0) return;

  const message = JSON.stringify({
    type: 'message',
    channel,
    data,
    timestamp: new Date().toISOString(),
  });

  let sentCount = 0;
  const dead: any[] = [];
  channelClients.forEach((client) => {
    try {
      client.send(message);
      sentCount++;
    } catch (err) {
      dead.push(client);
    }
  });
  dead.forEach(c => channelClients.delete(c));

  console.log(`📡 Broadcast ${channel}: ${sentCount}/${clientCount} sent`);
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

export { CHANNELS };
