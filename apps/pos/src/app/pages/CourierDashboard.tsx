import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../lib/api';
import {
  Package,
  MapPin,
  Phone,
  Clock,
  Check,
  Navigation,
  CreditCard,
  Banknote,
  RefreshCw,
  User,
  ChevronRight,
} from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  paymentStatus: string;
  type: string;
  total: number;
  tip: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  items: {
    id: string;
    quantity: number;
    menuItem: { name: string };
    notes?: string;
  }[];
}

type OrderFilter = 'all' | 'ready' | 'delivering' | 'delivered';

export default function CourierDashboard() {
  const { token, user } = useAuth();
  const { onMessage } = useWebSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();

    const unsubscribe = onMessage('orders', () => {
      fetchOrders();
    });

    // Otomatik yenileme her 30 saniyede bir
    const interval = setInterval(fetchOrders, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      // Sadece TAKEAWAY ve DELIVERY siparişlerini getir
      const response = await api.get('/api/orders?type=TAKEAWAY,DELIVERY', token!);
      const allOrders = response.orders || response || [];
      
      // Aktif siparişleri filtrele (iptal edilmemiş)
      const activeOrders = allOrders.filter((o: Order) => 
        o.status !== 'CANCELLED' && 
        (o.type === 'TAKEAWAY' || o.type === 'DELIVERY')
      );
      
      setOrders(activeOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    switch (filter) {
      case 'ready':
        return order.status === 'READY' && !order.pickedUpAt;
      case 'delivering':
        return order.pickedUpAt && !order.deliveredAt && order.status !== 'COMPLETED';
      case 'delivered':
        return order.status === 'COMPLETED';
      default:
        return true;
    }
  });

  const handlePickup = async (orderId: string) => {
    setIsProcessing(true);
    try {
      await api.patch(`/api/orders/${orderId}/courier/pickup`, {
        courierId: user?.id,
      }, token!);
      fetchOrders();
    } catch (error) {
      console.error('Error picking up order:', error);
      alert('Sipariş alınamadı');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.paymentStatus !== 'PAID') {
      setSelectedOrder(order);
      setShowPaymentModal(true);
    } else {
      await completeDelivery(orderId);
    }
  };

  const completeDelivery = async (orderId: string, method?: 'CASH' | 'CARD') => {
    setIsProcessing(true);
    try {
      // Eğer ödeme yapılmadıysa, ödeme al
      if (method) {
        await api.post(`/api/orders/${orderId}/payment`, {
          amount: selectedOrder?.total,
          method,
        }, token!);
      }
      
      // Siparişi tamamla
      await api.patch(`/api/orders/${orderId}/courier/deliver`, {}, token!);
      
      setShowPaymentModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Teslimat tamamlanamadı');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (order: Order) => {
    if (order.status === 'COMPLETED') {
      return <span className="badge bg-green-100 text-green-700">✅ Teslim Edildi</span>;
    }
    if (order.pickedUpAt) {
      return <span className="badge bg-blue-100 text-blue-700">🚗 Yolda</span>;
    }
    if (order.status === 'READY') {
      return <span className="badge bg-yellow-100 text-yellow-700">📦 Hazır</span>;
    }
    if (order.status === 'PREPARING') {
      return <span className="badge bg-orange-100 text-orange-700">👨‍🍳 Hazırlanıyor</span>;
    }
    return <span className="badge bg-gray-100 text-gray-700">⏳ Bekliyor</span>;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    return `${hours} sa ${minutes % 60} dk`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kurye Paneli</h1>
              <p className="text-white/80 text-sm">Merhaba, {user?.name}</p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'READY' && !o.pickedUpAt).length}
            </div>
            <div className="text-xs text-white/80">Hazır</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {orders.filter(o => o.pickedUpAt && o.status !== 'COMPLETED').length}
            </div>
            <div className="text-xs text-white/80">Yolda</div>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'COMPLETED').length}
            </div>
            <div className="text-xs text-white/80">Teslim</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Tümü', icon: '📋' },
          { key: 'ready', label: 'Hazır', icon: '📦' },
          { key: 'delivering', label: 'Yolda', icon: '🚗' },
          { key: 'delivered', label: 'Teslim', icon: '✅' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as OrderFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.key !== 'all' && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                {orders.filter((o) => {
                  if (tab.key === 'ready') return o.status === 'READY' && !o.pickedUpAt;
                  if (tab.key === 'delivering') return o.pickedUpAt && o.status !== 'COMPLETED';
                  if (tab.key === 'delivered') return o.status === 'COMPLETED';
                  return false;
                }).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-gray-500">Henüz sipariş yok</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {order.type === 'DELIVERY' ? '🚗' : '🥡'}
                    </span>
                    <div>
                      <h3 className="font-bold text-lg">#{order.orderNumber}</h3>
                      <p className="text-sm text-gray-500">
                        {formatTime(order.createdAt)} • {getTimeSince(order.createdAt)} önce
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order)}
                    <p className="text-lg font-bold text-green-600 mt-1">
                      ₺{order.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                {(order.customerName || order.customerPhone) && (
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                    {order.customerName && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {order.customerName}
                      </div>
                    )}
                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="flex items-center gap-1 text-blue-600"
                      >
                        <Phone className="w-4 h-4" />
                        {order.customerPhone}
                      </a>
                    )}
                  </div>
                )}

                {/* Address */}
                {order.customerAddress && (
                  <div className="flex items-start gap-2 mt-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{order.customerAddress}</p>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(order.customerAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 flex items-center gap-1 mt-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Haritada Aç
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Sipariş İçeriği</h4>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 text-sm font-bold px-2 py-1 rounded">
                          {item.quantity}x
                        </span>
                        <span className="text-sm">{item.menuItem.name}</span>
                      </div>
                      {item.notes && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          {item.notes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                {order.notes && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    <span className="font-medium">📝 Not:</span> {order.notes}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-100">
                {order.status === 'READY' && !order.pickedUpAt && (
                  <button
                    onClick={() => handlePickup(order.id)}
                    disabled={isProcessing}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Package className="w-5 h-5" />
                    Siparişi Al
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
                
                {order.pickedUpAt && order.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleDeliver(order.id)}
                    disabled={isProcessing}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    Teslim Edildi
                    {order.paymentStatus !== 'PAID' && (
                      <span className="bg-white/20 px-2 py-0.5 rounded text-sm ml-2">
                        + Ödeme Al
                      </span>
                    )}
                  </button>
                )}
                
                {order.status === 'COMPLETED' && (
                  <div className="text-center text-green-600 font-medium flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Teslim Tamamlandı
                  </div>
                )}

                {order.status === 'PREPARING' && (
                  <div className="text-center text-orange-600 font-medium flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5" />
                    Hazırlanıyor...
                  </div>
                )}

                {order.status === 'PENDING' && (
                  <div className="text-center text-gray-500 font-medium flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5" />
                    Onay Bekliyor
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            
            <h3 className="text-xl font-bold text-center mb-2">Ödeme Al</h3>
            <p className="text-center text-gray-500 mb-6">
              Sipariş #{selectedOrder.orderNumber}
            </p>
            
            <div className="bg-gray-100 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center text-lg">
                <span>Toplam Tutar</span>
                <span className="font-bold text-green-600">
                  ₺{selectedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-8 h-8 ${paymentMethod === 'CASH' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={paymentMethod === 'CASH' ? 'font-medium text-green-700' : 'text-gray-600'}>
                  Nakit
                </span>
              </button>
              
              <button
                onClick={() => setPaymentMethod('CARD')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'CARD'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-8 h-8 ${paymentMethod === 'CARD' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={paymentMethod === 'CARD' ? 'font-medium text-blue-700' : 'text-gray-600'}>
                  Kredi Kartı
                </span>
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={() => completeDelivery(selectedOrder.id, paymentMethod)}
                disabled={isProcessing}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Onayla
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

