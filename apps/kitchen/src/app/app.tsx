import { useState, useEffect, useCallback, useRef } from 'react';
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
  // "Kendin Tasarla" (builder) ürünlerinin içerik listesi: "Hamur: Klasik",
  // "Et: Salami, Tavuk", "Sebze: ..." — kitchen'da hazırlama için kritik.
  modifiers?: string[];
  status: string;
  menuItemName?: string;
  createdAt?: string;
  menuItem?: {
    name: string;
    ingredients?: Ingredient[];
  } | null;
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

// Sound loop constants — a new order keeps pulsing until acknowledged.
// Dismiss is locked for the first MIN_MS so staff cannot silence instantly.
const ALERT_MIN_MS = 30_000;
const ALERT_MAX_MS = 5 * 60_000;
const ALERT_PULSE_MS = 1_800;

interface ActiveAlert {
  orderNumber: number;
  startedAt: number;
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [alertNow, setAlertNow] = useState(Date.now());
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref so the WebSocket onmessage closure (created once in useEffect) always
  // sees the latest triggerAlert without re-subscribing the socket
  const triggerAlertRef = useRef<((order: Order) => void) | null>(null);

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
              if (soundEnabled && (message.data?.action === 'new' || message.data?.action === 'new_items')) {
                triggerAlertRef.current?.(message.data?.order || { orderNumber: 0 });
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

  // Global AudioContext for kitchen - persists across notifications
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Activate audio on first interaction
  useEffect(() => {
    const activate = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    };
    document.addEventListener('click', activate);
    document.addEventListener('touchstart', activate);
    return () => {
      document.removeEventListener('click', activate);
      document.removeEventListener('touchstart', activate);
    };
  }, []);

  const playBeepBurst = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      [0, 0.25, 0.5].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.7, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch (e) {
      console.warn('Notification sound failed:', e);
    }
  }, []);

  const stopAlertLoop = useCallback(() => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
    if (alertMaxTimeoutRef.current) {
      clearTimeout(alertMaxTimeoutRef.current);
      alertMaxTimeoutRef.current = null;
    }
    document.title = 'Kitchen';
  }, []);

  const dismissAlert = useCallback(() => {
    stopAlertLoop();
    setActiveAlert(null);
  }, [stopAlertLoop]);

  const triggerAlert = useCallback((order: Order) => {
    // Already looping — just update the visible order number to the newest
    setActiveAlert({
      orderNumber: order.orderNumber || 0,
      startedAt: alertIntervalRef.current ? Date.now() : Date.now(),
    });
    if (alertIntervalRef.current) return;
    playBeepBurst();
    alertIntervalRef.current = setInterval(playBeepBurst, ALERT_PULSE_MS);
    alertMaxTimeoutRef.current = setTimeout(() => {
      stopAlertLoop();
      setActiveAlert(null);
    }, ALERT_MAX_MS);
    document.title = '🔔 YENİ SİPARİŞ!';
  }, [playBeepBurst, stopAlertLoop]);

  // Tick so the countdown label on the dismiss button re-renders
  useEffect(() => {
    if (!activeAlert) return;
    const id = setInterval(() => setAlertNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeAlert]);

  // Keep the ref pointing at the latest triggerAlert
  useEffect(() => {
    triggerAlertRef.current = triggerAlert;
  }, [triggerAlert]);


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
            <div className="absolute inset-0 rounded-full border-4 border-accent-500 border-t-transparent animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center text-4xl">👨‍🍳</span>
          </div>
          <p className="text-gray-400 font-medium text-lg">Mutfak yükleniyor...</p>
        </div>
      </div>
    );
  }

  const alertElapsed = activeAlert ? alertNow - activeAlert.startedAt : 0;
  const alertRemainingToUnlock = activeAlert
    ? Math.max(0, Math.ceil((ALERT_MIN_MS - alertElapsed) / 1000))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Persistent new-order alert — keeps pulsing until dismissed. The
          dismiss button accepts clicks immediately; the 30 second window is
          surfaced as a countdown next to the order info, not as a button
          lock, so kitchen staff can silence whenever they need to. */}
      {activeAlert && (
        <div className="fixed inset-x-0 top-0 z-[10000] bg-red-600 text-white shadow-2xl border-b-4 border-red-800">
          <div className="max-w-[2000px] mx-auto px-6 py-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-4xl animate-bounce">🔔</span>
              <div className="min-w-0">
                <p className="font-bold text-xl">
                  YENİ SİPARİŞ #{activeAlert.orderNumber}
                </p>
                <p className="text-sm text-white/90">
                  {alertRemainingToUnlock > 0
                    ? `Otomatik kapanma: ${alertRemainingToUnlock}s`
                    : 'Onayla butonu ile sustur'}
                </p>
              </div>
            </div>
            <button
              onClick={dismissAlert}
              className="shrink-0 px-6 py-4 rounded-xl font-bold text-lg transition-all bg-white text-red-700 hover:bg-red-50 shadow-lg cursor-pointer"
            >
              ✓ ONAYLA &amp; SESSİZE AL
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`bg-black/40 backdrop-blur-sm border-b border-white/10 px-6 py-4 sticky z-50 ${activeAlert ? 'top-[88px]' : 'top-0'}`}>
        <div className="flex items-center justify-between max-w-[2000px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl flex items-center justify-center shadow-lg shadow-accent-500/30">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MUTFAK EKRANI</h1>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className="text-accent-300">HIGH FIVE</span>
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
              <div className="px-4 py-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <span className="text-blue-400 font-bold">{preparingOrders.length}</span>
                <span className="text-blue-400/70 text-sm ml-2">Hazırlanıyor</span>
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
                  ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
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
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5 text-blue-400" />
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

// Group an order's items into sequential "batches" so that items added later
// (ek sipariş) render as their own ticket section in the kitchen. We group by
// createdAt within a 90-second window — anything further apart is a new batch.
function groupItemsIntoBatches(items: OrderItem[]): OrderItem[][] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
  const batches: OrderItem[][] = [];
  const WINDOW_MS = 90 * 1000;
  let current: OrderItem[] = [];
  let batchAnchor = sorted[0].createdAt ? new Date(sorted[0].createdAt).getTime() : 0;
  for (const item of sorted) {
    const t = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    if (current.length === 0 || t - batchAnchor <= WINDOW_MS) {
      current.push(item);
      if (current.length === 1) batchAnchor = t;
    } else {
      batches.push(current);
      current = [item];
      batchAnchor = t;
    }
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

// Per-item action buttons: each kitchen ticket item gets its own HAZIR/SERVİS
// buttons so staff can progress individual items independently of the overall
// order status.
const ITEM_NEXT_STATUS: Record<string, string> = {
  PENDING: 'PREPARING',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
};

const ITEM_ACTION_LABEL: Record<string, { text: string; emoji: string; className: string }> = {
  PENDING: { text: 'HAZIRLA', emoji: '🔥', className: 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border-amber-500/40' },
  CONFIRMED: { text: 'HAZIRLA', emoji: '🔥', className: 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border-amber-500/40' },
  PREPARING: { text: 'HAZIR', emoji: '✅', className: 'bg-green-500/20 hover:bg-green-500/40 text-green-300 border-green-500/40' },
  READY: { text: 'SERVİS', emoji: '🍽️', className: 'bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 border-blue-500/40' },
};

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
    PENDING: { text: 'HAZIRLA', emoji: '🔥', bg: 'from-primary-500 to-primary-700' },
    CONFIRMED: { text: 'HAZIRLA', emoji: '🔥', bg: 'from-primary-500 to-primary-700' },
    PREPARING: { text: 'HAZIR', emoji: '✅', bg: 'from-green-500 to-emerald-600' },
    READY: { text: 'SERVİS', emoji: '🍽️', bg: 'from-blue-500 to-indigo-600' },
  };

  const urgency = getUrgencyClass(order.createdAt);
  const borderColor = {
    pending: urgency === 'urgent' ? 'border-red-500' : urgency === 'warning' ? 'border-amber-500' : 'border-amber-500/50',
    preparing: 'border-blue-500',
    ready: 'border-green-500',
  }[type];

  const glowColor = {
    pending: urgency === 'urgent' ? 'shadow-red-500/30' : urgency === 'warning' ? 'shadow-amber-500/20' : '',
    preparing: 'shadow-blue-500/20',
    ready: 'shadow-green-500/30 animate-pulse',
  }[type];

  const batches = groupItemsIntoBatches(order.items);

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-2xl border-l-4 ${borderColor} overflow-hidden shadow-lg ${glowColor}`}>
      {/* Header */}
      <div className="p-4 bg-black/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
              type === 'pending' ? 'bg-amber-500/20 text-amber-400' :
              type === 'preparing' ? 'bg-blue-500/20 text-blue-400' :
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

      {/* Items — grouped into batches so "ek sipariş" added after the fact is visually separated */}
      <div className="p-4 space-y-3">
        {batches.map((batch, batchIndex) => (
          <div key={batchIndex} className="space-y-2">
            {batchIndex > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded-full px-3 py-1">
                  🔔 Ek Sipariş #{batchIndex + 1}
                  {batch[0].createdAt && (
                    <span className="ml-2 text-amber-200/70 font-mono">
                      {new Date(batch[0].createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
              </div>
            )}
            {batch.map((item) => {
              const ingredients = item.menuItem?.ingredients || [];
              const unitShort: Record<string, string> = {
                GRAM: 'g', KILOGRAM: 'kg', LITRE: 'L', MILLILITRE: 'mL', ADET: 'adet', PORSIYON: 'prs',
              };

              // Parse excluded ingredients from notes (format: "❌ NAME1, NAME2 OLMASIN")
              const excludedNames: string[] = [];
              let customerNote = '';
              if (item.notes) {
                const excludeMatch = item.notes.match(/❌\s*(.+?)\s*OLMASIN/i);
                if (excludeMatch) {
                  excludedNames.push(...excludeMatch[1].split(',').map(s => s.trim().toLowerCase()));
                  customerNote = item.notes.replace(/\|?\s*❌\s*.+?OLMASIN/i, '').trim();
                } else {
                  customerNote = item.notes;
                }
              }

              const includedIngredients = ingredients.filter(
                (ing) => !excludedNames.includes(ing.rawMaterial.name.toLowerCase())
              );
              const removedIngredients = ingredients.filter(
                (ing) => excludedNames.includes(ing.rawMaterial.name.toLowerCase())
              );

              const itemNext = ITEM_NEXT_STATUS[item.status];
              const itemAction = ITEM_ACTION_LABEL[item.status];

              return (
                <div
                  key={item.id}
                  className={`rounded-xl transition-all ${
                    item.status === 'READY'
                      ? 'bg-green-500/20 border border-green-500/30'
                      : item.status === 'SERVED'
                      ? 'bg-blue-500/10 border border-blue-500/20 opacity-70'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  {/* Item header */}
                  <div className="flex items-center justify-between p-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                        item.status === 'READY'
                          ? 'bg-green-500 text-white'
                          : item.status === 'SERVED'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.quantity}x
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-lg truncate">{item.menuItem?.name || item.menuItemName || 'Silinmiş Ürün'}</p>
                        {customerNote && customerNote !== (item.menuItem?.name || item.menuItemName) && (
                          <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                            <span>📝</span>
                            <span>{customerNote}</span>
                          </p>
                        )}
                        {/* Builder / özel ürün içeriği (Hamur, Sos, Et, Sebze...) */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.modifiers.map((m, i) => (
                              <li key={i} className="text-xs text-cyan-300 leading-tight">
                                • {m}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Per-item action button */}
                    {itemNext && itemAction && (
                      <button
                        onClick={() => onItemStatusChange(order.id, item.id, itemNext)}
                        className={`shrink-0 px-3 py-2 rounded-lg border text-sm font-bold transition-all hover:scale-105 flex items-center gap-1.5 ${itemAction.className}`}
                      >
                        <span>{itemAction.emoji}</span>
                        <span>{itemAction.text}</span>
                      </button>
                    )}
                    {!itemNext && (
                      <div className="shrink-0 p-2 text-green-400">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Recipe - Ingredients with amounts */}
                  {ingredients.length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {includedIngredients.map((ing) => {
                          const totalAmount = Number(ing.amount) * item.quantity;
                          const unit = unitShort[ing.rawMaterial.unit] || ing.rawMaterial.unit;
                          return (
                            <span
                              key={ing.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 border border-white/15 text-sm"
                            >
                              <span className="text-gray-300 font-medium">{ing.rawMaterial.name}</span>
                              <span className="text-cyan-400 font-mono font-bold">
                                {totalAmount % 1 === 0 ? totalAmount : totalAmount.toFixed(1)}{unit}
                              </span>
                            </span>
                          );
                        })}
                      </div>

                      {removedIngredients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-red-500/20">
                          <span className="text-red-400 text-xs font-bold uppercase tracking-wide self-center mr-1">Yok:</span>
                          {removedIngredients.map((ing) => (
                            <span
                              key={ing.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-sm line-through"
                            >
                              <span className="text-red-400">{ing.rawMaterial.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {excludedNames.length > 0 && removedIngredients.length === 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-red-500/20">
                          <span className="text-red-400 text-xs font-bold uppercase tracking-wide self-center mr-1">Yok:</span>
                          {excludedNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-sm line-through"
                            >
                              <span className="text-red-400">{name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {ingredients.length === 0 && excludedNames.length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-red-400 text-xs font-bold uppercase tracking-wide self-center mr-1">Yok:</span>
                        {excludedNames.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-sm line-through"
                          >
                            <span className="text-red-400">{name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
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
