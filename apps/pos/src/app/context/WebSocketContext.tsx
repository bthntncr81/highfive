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

// HTMLAudioElement-based beep playback.
//
// Web Audio's AudioContext starts suspended on Chrome and only the FIRST
// burst inside a user-gesture handler reliably unlocks it. Subsequent
// setInterval-driven bursts hit a still-suspended context and produce
// silence. HTMLAudioElement is permissive: once the user has clicked
// anywhere on the page, .play() works for the rest of the page lifetime,
// even from setInterval. We generate a small in-memory WAV beep at module
// load and reuse the same <audio> element on every burst.
const VOLUME_KEY = 'rm_alert_volume';

function getVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    if (!Number.isFinite(v) || v < 0 || v > 1) return 0.7;
    return v;
  } catch { return 0.7; }
}

function buildBeepWavUrl(freq = 880, durationMs = 700, sampleRate = 22050): string {
  // 3 short pulses (similar profile to the old 3-osc burst) inside one WAV.
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  // RIFF/WAVE header
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + samples * 2, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, samples * 2, true);

  // Three pulses with attack/decay envelopes at offsets 0, 0.25, 0.5 sec
  const pulseStarts = [0, 0.25 * sampleRate, 0.5 * sampleRate];
  const pulseLen = 0.18 * sampleRate;
  for (let i = 0; i < samples; i++) {
    let v = 0;
    for (const start of pulseStarts) {
      if (i < start || i >= start + pulseLen) continue;
      const into = (i - start) / pulseLen;
      // simple AD envelope: 5% attack, exponential decay
      const env = into < 0.05 ? into / 0.05 : Math.pow(1 - into, 2);
      const sq = Math.sin(2 * Math.PI * freq * (i / sampleRate)) > 0 ? 1 : -1;
      v += sq * env * 0.7;
    }
    // clamp and convert to int16
    const sample = Math.max(-1, Math.min(1, v)) * 0x7fff;
    view.setInt16(44 + i * 2, sample, true);
  }
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

let beepEl: HTMLAudioElement | null = null;
function ensureBeep(): HTMLAudioElement {
  if (!beepEl) {
    beepEl = new Audio(buildBeepWavUrl());
    beepEl.preload = 'auto';
  }
  return beepEl;
}

if (typeof window !== 'undefined') {
  // Prime on page load so the first call to .play() doesn't have to wait
  // for the WAV to fetch/decode.
  try { ensureBeep().load(); } catch { /* ignore */ }
}

function playBeepBurst() {
  try {
    const el = ensureBeep();
    el.volume = getVolume();
    // Rewind in case a previous burst hasn't finished yet
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { /* autoplay-blocked, will work after first click */ });
    }
  } catch { /* silent */ }
}

// Global loop manager — a new order keeps the burst repeating until the user
// acknowledges. We enforce a minimum playback window so the dismiss button
// cannot silence the alert before staff have a chance to hear it.
const ALERT_MIN_MS = 30_000;   // minimum play duration
const ALERT_MAX_MS = 5 * 60_000; // hard safety cap
const ALERT_PULSE_MS = 1_800;  // interval between bursts

let alertInterval: number | null = null;
let alertHardStop: number | null = null;

function stopAlertLoop() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
  if (alertHardStop) {
    clearTimeout(alertHardStop);
    alertHardStop = null;
  }
}

function startAlertLoop() {
  if (alertInterval) return; // already looping
  playBeepBurst();
  alertInterval = window.setInterval(playBeepBurst, ALERT_PULSE_MS);
  alertHardStop = window.setTimeout(stopAlertLoop, ALERT_MAX_MS);

  // Flash document title while alert is active
  const origTitle = document.title;
  document.title = '🔔 YENİ SİPARİŞ!';
  const restoreTitle = () => { document.title = origTitle; };
  // Clean up title when loop stops
  const checkTitle = window.setInterval(() => {
    if (!alertInterval) {
      restoreTitle();
      clearInterval(checkTitle);
    }
  }, 1000);
}

interface ActiveAlert {
  orderNumber: number;
  type: string;
  customerName?: string;
  startedAt: number;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<OrderToast[]>([]);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [now, setNow] = useState(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Tick every second while an alert is active so the countdown re-renders
  useEffect(() => {
    if (!activeAlert) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeAlert]);

  // Keep alert auto-clearing in sync with the sound loop's safety cap
  useEffect(() => {
    if (!activeAlert) return;
    const remaining = ALERT_MAX_MS - (Date.now() - activeAlert.startedAt);
    if (remaining <= 0) {
      setActiveAlert(null);
      return;
    }
    const id = setTimeout(() => setActiveAlert(null), remaining);
    return () => clearTimeout(id);
  }, [activeAlert]);

  const dismissAlert = () => {
    stopAlertLoop();
    setActiveAlert(null);
  };

  const triggerAlert = (order: any) => {
    setActiveAlert({
      orderNumber: order.orderNumber || 0,
      type: order.type || 'TAKEAWAY',
      customerName: order.customerName,
      startedAt: Date.now(),
    });
    startAlertLoop();
  };

  // Polling safety net for missed WS events. WS reconnect (after a deploy or
  // network blip) does not replay messages, so an order that arrived during
  // the gap silently disappears from the live feed. We periodically check the
  // orders endpoint, compare against the last-seen orderNumber kept in
  // localStorage, and fire alerts for any new external orders we missed.
  const POLL_KEY = 'rm_last_seen_order_number';
  const lastSeenRef = useRef<number>(
    Number(typeof window !== 'undefined' ? localStorage.getItem(POLL_KEY) : 0) || 0,
  );
  // First run after a fresh login (no watermark stored): set the high-water
  // mark to whatever's already in the DB without firing alerts. Otherwise
  // logging in would spam an alert for every existing external order.
  const firstRunRef = useRef<boolean>(lastSeenRef.current === 0);

  const catchupOrders = useCallback(async () => {
    try {
      // AuthContext stores the token via lib/storage which JSON.stringify-wraps
      // every value, so the raw localStorage entry looks like `"<jwt>"`.
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('token');
        if (raw) {
          try { token = JSON.parse(raw); } catch { token = raw; }
        }
      }
      if (!token) return;
      const res = await fetch(`/api/orders?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const orders: any[] = data.orders || [];
      if (orders.length === 0) return;

      const maxSeen = Math.max(lastSeenRef.current, ...orders.map((o) => Number(o.orderNumber)));

      // First run: silently set the watermark, no alerts. Otherwise alert on
      // any new external (source != POS) order above the current watermark.
      if (!firstRunRef.current) {
        const unseen = orders
          .filter((o) => Number(o.orderNumber) > lastSeenRef.current)
          // oldest unseen first → latest one ends up shown in the banner
          .sort((a, b) => Number(a.orderNumber) - Number(b.orderNumber));
        for (const o of unseen) {
          if (o.source && o.source !== 'POS') {
            triggerAlert(o);
            addToast(o);
          }
          // Synthesize a WS-style notification so subscribed components
          // (Orders page, Tables page, etc.) refetch and the new order
          // appears in their lists. Without this, polling fires the alert
          // but the order doesn't visibly land on screen until a manual
          // refresh.
          const ordersListeners = listenersRef.current.get('orders');
          ordersListeners?.forEach((cb) =>
            cb({ action: 'new', order: o })
          );
        }
        if (unseen.length > 0) {
          // Also nudge tables in case the new order is dine-in
          const tablesListeners = listenersRef.current.get('tables');
          tablesListeners?.forEach((cb) => cb({ action: 'update' }));
        }
      }
      firstRunRef.current = false;
      lastSeenRef.current = maxSeen;
      try { localStorage.setItem(POLL_KEY, String(maxSeen)); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, []);

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

        // Catch any orders we missed while disconnected. WS messages are not
        // replayed on reconnect, so without this an order that arrived during
        // a deploy or network blip would never trigger the alert.
        catchupOrders();

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
              if (source !== 'POS' && message.data.order) {
                triggerAlert(message.data.order);
              }
              if (message.data.order) {
                addToast(message.data.order);
                // Bump watermark so the polling safety net doesn't replay
                // this order on its next tick.
                const num = Number(message.data.order.orderNumber || 0);
                if (num > lastSeenRef.current) {
                  lastSeenRef.current = num;
                  try { localStorage.setItem(POLL_KEY, String(num)); } catch { /* ignore */ }
                }
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

  // 60s polling safety net while logged in. Cheap (~1 small request/min) and
  // closes the gap when the WS feed silently drops messages.
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(catchupOrders, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated, catchupOrders]);

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

      {/* Persistent alert banner — stays until dismissed. The button accepts
          clicks immediately; the 30 second window is shown as countdown info
          (next to the button) so staff knows the alert is still "fresh" but
          they can silence whenever they want. */}
      {activeAlert && (() => {
        const elapsed = now - activeAlert.startedAt;
        const remainingToUnlock = Math.max(0, Math.ceil((ALERT_MIN_MS - elapsed) / 1000));
        return (
          <div className="fixed inset-x-0 top-0 z-[10000] bg-red-600 text-white shadow-2xl border-b-4 border-red-800 animate-pulse">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl animate-bounce">🔔</span>
                <div className="min-w-0">
                  <p className="font-bold text-lg">
                    YENİ SİPARİŞ #{activeAlert.orderNumber} — {typeLabel(activeAlert.type)}
                  </p>
                  <p className="text-sm text-white/90 truncate">
                    {activeAlert.customerName || 'Müşteri'}
                    {remainingToUnlock > 0 && ` • Otomatik kapanma: ${remainingToUnlock}s`}
                  </p>
                </div>
              </div>
              <button
                onClick={dismissAlert}
                className="shrink-0 px-6 py-3 rounded-xl font-bold transition-all bg-white text-red-700 hover:bg-red-50 shadow-lg cursor-pointer"
              >
                ✓ ONAYLA & SESSİZE AL
              </button>
            </div>
          </div>
        );
      })()}

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
