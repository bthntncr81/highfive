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

// Global AudioContext - created once on first user interaction
let audioCtx: AudioContext | null = null;

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Activate audio on ANY user interaction (click, keypress, touch)
if (typeof window !== 'undefined') {
  const activate = () => {
    ensureAudioContext();
    document.removeEventListener('click', activate);
    document.removeEventListener('keydown', activate);
    document.removeEventListener('touchstart', activate);
  };
  document.addEventListener('click', activate);
  document.addEventListener('keydown', activate);
  document.addEventListener('touchstart', activate);
}

// Play alert sound
function playAlertSound() {
  try {
    const ctx = ensureAudioContext();
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
  } catch (e) { /* silent */ }

  // Flash document title
  const origTitle = document.title;
  document.title = '🔔 YENİ SİPARİŞ!';
  setTimeout(() => { document.title = origTitle; }, 5000);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<OrderToast[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

        // Keep-alive ping every 25 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          if (message.type === 'message' && message.channel) {
            // New order from external source (WEB/QR) → sound + toast
            // POS-created orders don't trigger sound (garson already knows)
            if (message.channel === 'orders' && message.data?.action === 'new') {
              const source = message.data.order?.source;
              if (source !== 'POS') {
                playAlertSound();
              }
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
        console.log('WebSocket disconnected - reconnecting...');
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Aggressive reconnect - 1 second
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated) {
            connect();
          }
        }, 1000);
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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
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
