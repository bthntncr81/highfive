import { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, Check, RefreshCw, Volume2, VolumeX, Flame, Bell, Utensils } from 'lucide-react';

// API URL - empty string means relative paths, nginx will proxy to API container
const API_URL = import.meta.env.VITE_API_URL || '';
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

interface Ingredient {
  id: string;
  amount: number;
  optional: boolean;
  rawMaterial: {
    id: string;
    name: string;
    unit: string;
  };
}

interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
  status: string;
  menuItem: {
    name: string;
    ingredients?: Ingredient[];
  };
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  createdAt: string;
  table?: { name: string };
  items: OrderItem[];
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/active`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Orders fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // WebSocket connection with auto-reconnect
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;

    const connect = () => {
      try {
        console.log('🔌 WebSocket bağlanıyor...', WS_URL);
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('✅ WebSocket bağlandı');
          setIsConnected(true);
          reconnectAttempts = 0;
          ws?.send(JSON.stringify({ type: 'subscribe', channel: 'kitchen' }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket mesajı:', message);
            
            if (message.type === 'subscribed') {
              console.log('✅ Kitchen kanalına abone olundu');
            }
            
            if (message.type === 'message' && message.channel === 'kitchen') {
              console.log('🍳 Mutfak güncellemesi:', message.data?.action);
              fetchOrders();
              if (soundEnabled && message.data?.action === 'new') {
                playNotificationSound();
              }
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('❌ WebSocket kapandı:', event.code, event.reason);
          setIsConnected(false);
          
          // Auto-reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`🔄 Yeniden bağlanılacak... (${reconnectAttempts}/${maxReconnectAttempts}) - ${delay}ms sonra`);
            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connect();

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Auto refresh every 10 seconds as backup
    const interval = setInterval(fetchOrders, 10000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
      clearInterval(timeInterval);
      clearInterval(pingInterval);
    };
  }, [fetchOrders, soundEnabled]);

  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Status change error:', error);
    }
  };

  const handleItemStatusChange = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await fetch(`${API_URL}/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } catch (error) {
      console.error('Item status change error:', error);
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '< 1 dk';
    if (diffMins < 60) return `${diffMins} dk`;
    return `${Math.floor(diffMins / 60)}s ${diffMins % 60}dk`;
  };

  const getUrgencyClass = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000);
    
    if (diffMins >= 15) return 'urgent';
    if (diffMins >= 10) return 'warning';
    return 'normal';
  };

  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center text-4xl">👨‍🍳</span>
          </div>
          <p className="text-gray-400 font-medium text-lg">Mutfak yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-sm border-b border-white/10 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-[2000px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MUTFAK EKRANI</h1>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className="text-orange-400">HIGH FIVE</span>
                <span>•</span>
                <span className="font-mono">
                  {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 mr-4">
              <div className="px-4 py-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                <span className="text-amber-400 font-bold">{pendingOrders.length}</span>
                <span className="text-amber-400/70 text-sm ml-2">Bekliyor</span>
              </div>
              <div className="px-4 py-2 bg-orange-500/20 rounded-xl border border-orange-500/30">
                <span className="text-orange-400 font-bold">{preparingOrders.length}</span>
                <span className="text-orange-400/70 text-sm ml-2">Hazırlanıyor</span>
              </div>
              <div className="px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
                <span className="text-green-400 font-bold">{readyOrders.length}</span>
                <span className="text-green-400/70 text-sm ml-2">Hazır</span>
              </div>
            </div>

            {/* Connection status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isConnected 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-red-500/20 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className={`text-sm font-medium ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
              </span>
            </div>
            
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-xl transition-all ${
                soundEnabled 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            {/* Refresh */}
            <button
              onClick={fetchOrders}
              className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all border border-white/10"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6 max-w-[2000px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bekleyen</h2>
                <p className="text-sm text-gray-500">{pendingOrders.length} sipariş</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemStatusChange={handleItemStatusChange}
                  getElapsedTime={getElapsedTime}
                  getUrgencyClass={getUrgencyClass}
                  type="pending"
                />
              ))}
              {pendingOrders.length === 0 && (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-5xl mb-4 block">✨</span>
                  <p className="text-gray-400">Bekleyen sipariş yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Preparing column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Hazırlanıyor</h2>
                <p className="text-sm text-gray-500">{preparingOrders.length} sipariş</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemStatusChange={handleItemStatusChange}
                  getElapsedTime={getElapsedTime}
                  getUrgencyClass={getUrgencyClass}
                  type="preparing"
                />
              ))}
              {preparingOrders.length === 0 && (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-5xl mb-4 block">👨‍🍳</span>
                  <p className="text-gray-400">Hazırlanan sipariş yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Ready column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Utensils className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Hazır</h2>
                <p className="text-sm text-gray-500">{readyOrders.length} sipariş</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onItemStatusChange={handleItemStatusChange}
                  getElapsedTime={getElapsedTime}
                  getUrgencyClass={getUrgencyClass}
                  type="ready"
                />
              ))}
              {readyOrders.length === 0 && (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-5xl mb-4 block">🔔</span>
                  <p className="text-gray-400">Hazır sipariş yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Order Card Component
function OrderCard({
  order,
  onStatusChange,
  onItemStatusChange,
  getElapsedTime,
  getUrgencyClass,
  type,
}: {
  order: Order;
  onStatusChange: (orderId: string, status: string) => void;
  onItemStatusChange: (orderId: string, itemId: string, status: string) => void;
  getElapsedTime: (date: string) => string;
  getUrgencyClass: (date: string) => string;
  type: 'pending' | 'preparing' | 'ready';
}) {
  const nextStatus: Record<string, string> = {
    PENDING: 'PREPARING',
    CONFIRMED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'SERVED',
  };

  const actionConfig: Record<string, { text: string; emoji: string; bg: string }> = {
    PENDING: { text: 'HAZIRLA', emoji: '🔥', bg: 'from-orange-500 to-red-600' },
    CONFIRMED: { text: 'HAZIRLA', emoji: '🔥', bg: 'from-orange-500 to-red-600' },
    PREPARING: { text: 'HAZIR', emoji: '✅', bg: 'from-green-500 to-emerald-600' },
    READY: { text: 'SERVİS', emoji: '🍽️', bg: 'from-blue-500 to-indigo-600' },
  };

  const urgency = getUrgencyClass(order.createdAt);
  const borderColor = {
    pending: urgency === 'urgent' ? 'border-red-500' : urgency === 'warning' ? 'border-amber-500' : 'border-amber-500/50',
    preparing: 'border-orange-500',
    ready: 'border-green-500',
  }[type];

  const glowColor = {
    pending: urgency === 'urgent' ? 'shadow-red-500/30' : urgency === 'warning' ? 'shadow-amber-500/20' : '',
    preparing: 'shadow-orange-500/20',
    ready: 'shadow-green-500/30 animate-pulse',
  }[type];

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-2xl border-l-4 ${borderColor} overflow-hidden shadow-lg ${glowColor}`}>
      {/* Header */}
      <div className="p-4 bg-black/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
              type === 'pending' ? 'bg-amber-500/20 text-amber-400' :
              type === 'preparing' ? 'bg-orange-500/20 text-orange-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {order.orderNumber.toString().padStart(2, '0')}
            </div>
            <div>
              <p className="font-bold text-white text-lg">
                {order.table?.name || 'Paket Sipariş'}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  order.type === 'DINE_IN' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {order.type === 'DINE_IN' ? '🍽️ Masa' : '📦 Paket'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Timer */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            urgency === 'urgent' ? 'bg-red-500/20 text-red-400' :
            urgency === 'warning' ? 'bg-amber-500/20 text-amber-400' :
            'bg-white/10 text-gray-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{getElapsedTime(order.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.items.map((item) => {
          const ingredients = item.menuItem.ingredients || [];
          const unitShort: Record<string, string> = {
            GRAM: 'g', KILOGRAM: 'kg', LITRE: 'L', MILLILITRE: 'mL', ADET: 'adet', PORSIYON: 'prs',
          };

          return (
            <div
              key={item.id}
              className={`rounded-xl transition-all ${
                item.status === 'READY' 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {/* Item header */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    item.status === 'READY'
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {item.quantity}x
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.menuItem.name}</p>
                    {item.notes && (
                      <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                        <span>📝</span>
                        <span>{item.notes}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {item.status !== 'READY' && type === 'preparing' && (
                  <button
                    onClick={() => onItemStatusChange(order.id, item.id, 'READY')}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 transition-all hover:scale-110"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
                {item.status === 'READY' && (
                  <div className="p-2 text-green-400">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Recipe / Ingredients */}
              {ingredients.length > 0 && (
                <div className="px-3 pb-3 ml-[52px]">
                  <div className="flex flex-wrap gap-1.5">
                    {ingredients.map((ing) => {
                      const totalAmount = Number(ing.amount) * item.quantity;
                      const unit = unitShort[ing.rawMaterial.unit] || ing.rawMaterial.unit;
                      return (
                        <span
                          key={ing.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs"
                        >
                          <span className="text-gray-400">{ing.rawMaterial.name}</span>
                          <span className="text-cyan-400 font-mono font-medium">
                            {totalAmount % 1 === 0 ? totalAmount : totalAmount.toFixed(1)}{unit}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action button */}
      {nextStatus[order.status] && (
        <div className="p-4 pt-0">
          <button
            onClick={() => onStatusChange(order.id, nextStatus[order.status])}
            className={`w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r ${actionConfig[order.status].bg} 
              text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all
              flex items-center justify-center gap-3`}
          >
            <span className="text-2xl">{actionConfig[order.status].emoji}</span>
            <span>{actionConfig[order.status].text}</span>
          </button>
        </div>
      )}
    </div>
  );
}
