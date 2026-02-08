import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../lib/api';
import { Search, Filter, RefreshCw, Clock, ChefHat, Check, X } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  total: number;
  createdAt: string;
  table?: { name: string; number: number };
  user?: { name: string };
  items: any[];
}

const STATUS_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'PREPARING', label: 'Hazırlanan' },
  { value: 'READY', label: 'Hazır' },
  { value: 'COMPLETED', label: 'Tamamlanan' },
];

export default function Orders() {
  const { token } = useAuth();
  const { onMessage } = useWebSocket();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();

    const unsubscribe = onMessage('orders', () => {
      fetchOrders();
    });

    return unsubscribe;
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const url = statusFilter 
        ? `/api/orders?status=${statusFilter}` 
        : '/api/orders';
      const response = await api.get(url, token!);
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Orders fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
      PREPARING: 'bg-orange-100 text-orange-800 border-orange-200',
      READY: 'bg-green-100 text-green-800 border-green-200',
      SERVED: 'bg-teal-100 text-teal-800 border-teal-200',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      PENDING: 'Bekliyor',
      CONFIRMED: 'Onaylandı',
      PREPARING: 'Hazırlanıyor',
      READY: 'Hazır',
      SERVED: 'Servis Edildi',
      COMPLETED: 'Tamamlandı',
      CANCELLED: 'İptal',
    };
    return texts[status] || status;
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      DINE_IN: 'Masa',
      TAKEAWAY: 'Paket',
      DELIVERY: 'Teslimat',
      WHATSAPP: 'WhatsApp',
    };
    return texts[type] || type;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return formatTime(dateString);
    }
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toString().includes(query) ||
      order.table?.name?.toLowerCase().includes(query) ||
      order.user?.name?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
          <p className="text-gray-500">{filteredOrders.length} sipariş</p>
        </div>
        <button
          onClick={fetchOrders}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sipariş no, masa veya garson ara..."
            className="input pl-10"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">Sipariş bulunamadı</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="card block hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Order number */}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      #{order.orderNumber.toString().padStart(4, '0')}
                    </p>
                    <p className="text-xs text-gray-500">{getTypeText(order.type)}</p>
                  </div>

                  {/* Order details */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {order.table && (
                        <span className="text-gray-900 font-medium">
                          {order.table.name}
                        </span>
                      )}
                      <span className={`badge ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      {order.items.length} ürün • {order.user?.name || 'Sistem'}
                    </p>
                    
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {order.total.toLocaleString('tr-TR')} ₺
                  </p>
                </div>
              </div>

              {/* Items preview */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {item.quantity}x {item.menuItem?.name}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-sm text-gray-500">
                      +{order.items.length - 3} daha
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

