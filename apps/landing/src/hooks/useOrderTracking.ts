import { useState, useEffect, useCallback, useRef } from 'react';
import { orderApi, type OrderStatus } from '../lib/api';

const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
const STORAGE_KEY = 'highfive-active-order';

interface ActiveOrder {
  orderId: string;
  orderNumber: number;
  status: OrderStatus['status'];
  type: OrderStatus['type'];
  createdAt: string;
}

export const useOrderTracking = () => {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load active order from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const order = JSON.parse(stored);
        // Check if order is still active (not completed/cancelled)
        if (!['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(order.status)) {
          setActiveOrder(order);
          // Fetch latest status
          refreshOrderStatus(order.orderId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Refresh order status from API
  const refreshOrderStatus = async (orderId: string) => {
    try {
      const response = await orderApi.getOrderStatus(orderId);
      if (response.success && response.data?.order) {
        const order = response.data.order;
        const newActiveOrder: ActiveOrder = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          type: order.type,
          createdAt: order.createdAt,
        };
        
        if (['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(order.status)) {
          // Order is done, remove from tracking
          setActiveOrder(null);
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setActiveOrder(newActiveOrder);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newActiveOrder));
        }
      }
    } catch (error) {
      console.error('Failed to refresh order status:', error);
    }
  };

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!activeOrder) return;
    
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('📡 Order tracking connected');
        setIsConnected(true);
        // Subscribe to orders channel
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'orders',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WS Message:', data);
          
          // Handle subscription confirmation
          if (data.type === 'subscribed') {
            console.log('✅ Subscribed to:', data.channel);
            return;
          }
          
          // Handle order updates from broadcast
          if (data.type === 'message' && data.channel === 'orders') {
            const orderData = data.data;
            
            // Check if this update is for our order
            if (orderData?.order?.id === activeOrder.orderId) {
              const newStatus = orderData.order.status;
              console.log('📦 Order status update:', newStatus);
              
              setActiveOrder(prev => prev ? { ...prev, status: newStatus } : null);
              
              if (['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(newStatus)) {
                // Order is done
                setTimeout(() => {
                  setActiveOrder(null);
                  localStorage.removeItem(STORAGE_KEY);
                }, 5000); // Show final status for 5 seconds
              } else {
                // Update localStorage
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                  ...activeOrder,
                  status: newStatus,
                }));
              }
            }
          }
          
          // Handle pong
          if (data.type === 'pong') {
            console.log('🏓 Pong received');
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('📡 Order tracking disconnected');
        setIsConnected(false);
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (activeOrder) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
      
      // Ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
      
      // Clean up ping interval on close
      ws.addEventListener('close', () => clearInterval(pingInterval));
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }, [activeOrder]);

  // Connect/disconnect based on active order
  useEffect(() => {
    if (activeOrder) {
      connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [activeOrder?.orderId, connectWebSocket]);

  // Track a new order
  const trackOrder = useCallback((orderId: string, orderNumber: number, type: OrderStatus['type']) => {
    const newOrder: ActiveOrder = {
      orderId,
      orderNumber,
      status: 'PENDING',
      type,
      createdAt: new Date().toISOString(),
    };
    setActiveOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, []);

  // Stop tracking
  const clearTracking = useCallback(() => {
    setActiveOrder(null);
    localStorage.removeItem(STORAGE_KEY);
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  return {
    activeOrder,
    isConnected,
    trackOrder,
    clearTracking,
    refreshOrderStatus,
  };
};

// Status labels and icons
export const ORDER_STATUS_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  PENDING: { label: 'Alındı', emoji: '📝', color: 'bg-yellow-500' },
  CONFIRMED: { label: 'Onaylandı', emoji: '✅', color: 'bg-green-500' },
  PREPARING: { label: 'Hazırlanıyor', emoji: '👨‍🍳', color: 'bg-orange-500' },
  READY: { label: 'Hazır', emoji: '🎉', color: 'bg-green-600' },
  SERVED: { label: 'Servis Edildi', emoji: '🍽️', color: 'bg-teal-500' },
  OUT_FOR_DELIVERY: { label: 'Yolda', emoji: '🚚', color: 'bg-blue-500' },
  DELIVERED: { label: 'Teslim Edildi', emoji: '📦', color: 'bg-green-700' },
  COMPLETED: { label: 'Tamamlandı', emoji: '✨', color: 'bg-gray-500' },
  CANCELLED: { label: 'İptal', emoji: '❌', color: 'bg-red-500' },
};

