// WebSocket helper — order subscribe + auto-reconnect
import { useEffect, useRef, useState } from "react";
import { WS_URL } from "./api";

type WSMessage =
  | { type: "ORDER_UPDATED"; data: any }
  | { type: "ORDER_READY"; data: any }
  | { type: "NEW_ORDER"; data: any }
  | { type: string; data?: any };

export function useOrderSocket(
  orderId: string | null,
  onUpdate: (msg: WSMessage) => void,
) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) {
            ws.close();
            return;
          }
          attempt = 0;
          setConnected(true);
          // Subscribe (channel-based protocol)
          ws.send(
            JSON.stringify({
              type: "SUBSCRIBE_ORDER",
              orderId,
            }),
          );
          // Bazı backend implementasyonları orders kanalını kullanıyor
          ws.send(
            JSON.stringify({
              type: "subscribe",
              channel: "orders",
              orderId,
            }),
          );
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as WSMessage;
            // Sadece ilgili order için event'leri işle
            const data = (msg as any).data;
            const evOrderId = data?.id ?? data?.orderId;
            if (!evOrderId || evOrderId === orderId) {
              onUpdateRef.current(msg);
            }
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (cancelled) return;
          attempt++;
          const delay = Math.min(30_000, 1000 * 2 ** attempt);
          reconnectTimeout.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          // close handler reconnect'i alır
        };
      } catch (e) {
        console.log("[ws] connect failed", e);
        attempt++;
        const delay = Math.min(30_000, 1000 * 2 ** attempt);
        reconnectTimeout.current = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      wsRef.current = null;
      setConnected(false);
    };
  }, [orderId]);

  return { connected };
}
