import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface WSMessage {
  type: string;
  channel?: string;
  data?: any;
  timestamp?: string;
}

interface OrderToast {
  id: string;
  orderNumber: number;
  type: string;
  customerName?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  onMessage: (channel: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

// Play alert sound
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.6, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
  } catch (e) { /* silent */ }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<OrderToast[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = (order: any) => {
    const toast: OrderToast = {
      id: order.id || Math.random().toString(36),
      orderNumber: order.orderNumber || 0,
      type: order.type || 'TAKEAWAY',
      customerName: order.customerName,
    };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 6000);
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);

        // Resubscribe to channels
        listenersRef.current.forEach((_, channel) => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          if (message.type === 'message' && message.channel) {
            // Global: new order → sound + toast on ANY page
            if (message.channel === 'orders' && message.data?.action === 'new') {
              playAlertSound();
              if (message.data.order) {
                addToast(message.data.order);
              }
            }

            const listeners = listenersRef.current.get(message.channel);
            listeners?.forEach((callback) => callback(message.data));
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      wsRef.current?.close();
      wsRef.current = null;
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [isAuthenticated, connect]);

  const subscribe = (channel: string) => {
    if (!listenersRef.current.has(channel)) {
      listenersRef.current.set(channel, new Set());
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  };

  const unsubscribe = (channel: string) => {
    listenersRef.current.delete(channel);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  };

  const onMessage = (channel: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(channel)) {
      listenersRef.current.set(channel, new Set());
      subscribe(channel);
    }

    listenersRef.current.get(channel)!.add(callback);

    return () => {
      const listeners = listenersRef.current.get(channel);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          unsubscribe(channel);
        }
      }
    };
  };

  const typeLabel = (t: string) => {
    if (t === 'DINE_IN') return 'Masa';
    if (t === 'DELIVERY') return 'Eve Servis';
    return 'Gel Al';
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        subscribe,
        unsubscribe,
        onMessage,
      }}
    >
      {children}

      {/* Global Toast Notifications - visible on ALL pages */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-in bg-green-600 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px]"
            style={{
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            <span className="text-3xl">🍕</span>
            <div>
              <p className="font-bold text-lg">Yeni Sipariş #{toast.orderNumber}</p>
              <p className="text-sm text-white/90">
                {typeLabel(toast.type)}
                {toast.customerName ? ` • ${toast.customerName}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Toast animation style */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
