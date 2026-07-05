import { useState, useEffect, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../lib/api';
import { Search, Filter, RefreshCw, Clock, ChefHat, Check, X, MapPin, Copy, ExternalLink, Trash2 } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  total: number;
  createdAt: string;
  table?: { name: string; number: number };
  user?: { name: string };
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  source?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items: any[];
}

// Visual theme for order cards based on the order source.
// POS/walk-in orders use the default card; WhatsApp and online/QR use distinctive tints so
// staff can spot externally-placed orders at a glance.
const getSourceStyle = (source?: string) => {
  const src = (source || 'POS').toUpperCase();
  if (src === 'WHATSAPP') {
    return 'bg-green-50 border-2 border-green-300 hover:border-green-400';
  }
  if (src === 'WEB' || src === 'ONLINE') {
    return 'bg-indigo-50 border-2 border-indigo-300 hover:border-indigo-400';
  }
  if (src === 'QR') {
    return 'bg-purple-50 border-2 border-purple-300 hover:border-purple-400';
  }
  return '';
};

const getSourceBadge = (source?: string) => {
  const src = (source || 'POS').toUpperCase();
  if (src === 'WHATSAPP') {
    return { label: '💬 WhatsApp', className: 'bg-green-100 text-green-800 border-green-300' };
  }
  if (src === 'WEB' || src === 'ONLINE') {
    return { label: '🌐 Web', className: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
  }
  if (src === 'QR') {
    return { label: '📱 QR', className: 'bg-purple-100 text-purple-800 border-purple-300' };
  }
  return null;
};

// Payment method icon + label. Mirrors the PaymentMethod enum in Prisma.
const getPaymentMethodBadge = (method?: string) => {
  if (!method) return null;
  const map: Record<string, { label: string; className: string }> = {
    CASH:        { label: '💵 Nakit',        className: 'bg-gray-100 text-gray-800 border-gray-300' },
    CREDIT_CARD: { label: '💳 Kredi Kartı',  className: 'bg-blue-100 text-blue-800 border-blue-300' },
    DEBIT_CARD:  { label: '💳 Banka Kartı',  className: 'bg-blue-100 text-blue-800 border-blue-300' },
    ONLINE:      { label: '🌐 Online Ödeme', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    MULTINET:    { label: '🍽️ Multinet',     className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    SODEXO:      { label: '🍽️ Sodexo',       className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    TICKET:      { label: '🎫 Ticket',       className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    TAB:         { label: '📒 Hesap Açık',   className: 'bg-orange-100 text-orange-800 border-orange-300' },
    DIGITAL_COIN:{ label: '🪙 Dijital',      className: 'bg-purple-100 text-purple-800 border-purple-300' },
    OTHER:       { label: '❓ Diğer',         className: 'bg-gray-100 text-gray-800 border-gray-300' },
  };
  return map[method] || null;
};

const getPaymentStatusBadge = (status?: string) => {
  const map: Record<string, { label: string; className: string }> = {
    PAID:     { label: '✓ Ödendi',     className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    PENDING:  { label: '⏳ Bekliyor',   className: 'bg-amber-100 text-amber-800 border-amber-300' },
    PARTIAL:  { label: '½ Kısmi',      className: 'bg-amber-100 text-amber-800 border-amber-300' },
    REFUNDED: { label: '↩️ İade',       className: 'bg-red-100 text-red-800 border-red-300' },
    ON_TAB:   { label: '📒 Hesap Açık', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  };
  return status ? map[status] || null : null;
};

// Build a Google Maps URL. Order'da customerLatitude/Longitude varsa onları kullan
// (mobile app'ten gelen GPS pin'i — en doğru). Yoksa adres metnine embed
// `https://maps.google.com/?q=lat,lng` pattern'ı (landing geolocation flow), yoksa
// metni fuzzy-match'e bırak.
const mapsUrl = (
  address: string,
  lat?: number | null,
  lng?: number | null,
) => {
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const m = address.match(/https?:\/\/maps\.google\.com\/\?q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    return `https://www.google.com/maps/search/?api=1&query=${m[1]},${m[2]}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const STATUS_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'PREPARING', label: 'Hazırlanan' },
  { value: 'READY', label: 'Hazır' },
  { value: 'COMPLETED', label: 'Tamamlanan' },
];

// Play alert notification sound - 3 rapid beeps
const playNotificationSound = () => {
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
  } catch (e) {
    console.warn('Notification sound failed:', e);
  }
};

export default function Orders() {
  const { token, user } = useAuth();
  const { onMessage } = useWebSocket();

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Admin-only: permanently delete an order. The card is a <Link>, so stop the
  // click from navigating into the order detail.
  const handleDelete = async (
    orderId: string,
    orderNumber: number,
    e: MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const label = `#${orderNumber.toString().padStart(4, '0')}`;
    if (
      !window.confirm(
        `${label} numaralı siparişi kalıcı olarak silmek istediğinize emin misiniz?\nBu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    try {
      setDeletingId(orderId);
      await api.delete(`/api/orders/${orderId}`, token!);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      console.error('Order delete error:', err);
      alert('Sipariş silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchOrders();

    const unsubscribe = onMessage('orders', () => {
      // Sound is handled globally in WebSocketContext (only on 'new')
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
          filteredOrders.map((order) => {
            const sourceStyle = getSourceStyle(order.source);
            const sourceBadge = getSourceBadge(order.source);
            const paymentMethodBadge = getPaymentMethodBadge(order.paymentMethod);
            const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus);
            const isOnlinePaid =
              order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PAID';
            // "Kapıda Ödeme" / "Kasada Ödeme" — orders coming from outside POS
            // that the customer will pay in person on receipt.
            const isUnpaidExternal =
              order.source && order.source !== 'POS' &&
              order.paymentStatus !== 'PAID' &&
              order.paymentStatus !== 'PARTIAL' &&
              order.paymentMethod !== 'ONLINE';
            const payOnDeliveryLabel =
              order.type === 'DELIVERY' ? '💵 Kapıda Ödeme'
              : order.type === 'TAKEAWAY' ? '💵 Kasada Ödeme'
              : '💵 Yerinde Ödeme';
            return (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className={`card block hover:shadow-lg transition-shadow ${sourceStyle}`}
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {order.table && (
                        <span className="text-gray-900 font-medium">
                          {order.table.name}
                        </span>
                      )}
                      <span className={`badge ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      {sourceBadge && (
                        <span className={`badge border ${sourceBadge.className}`}>
                          {sourceBadge.label}
                        </span>
                      )}
                      {/* Two prominent "intent" pills cover the most common cases:
                          - paid online → ✓ Online Ödendi (emerald)
                          - external order, not paid → 💵 Kapıda/Kasada/Yerinde Ödeme (orange)
                          Anything else falls back to the generic method+status pair. */}
                      {isOnlinePaid ? (
                        <span className="badge border bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                          ✓ Online Ödendi
                        </span>
                      ) : isUnpaidExternal ? (
                        <span className="badge border bg-orange-100 text-orange-800 border-orange-300 font-bold">
                          {payOnDeliveryLabel}
                        </span>
                      ) : (
                        <>
                          {paymentMethodBadge && (
                            <span className={`badge border ${paymentMethodBadge.className}`}>
                              {paymentMethodBadge.label}
                            </span>
                          )}
                          {paymentStatusBadge && (
                            <span className={`badge border ${paymentStatusBadge.className}`}>
                              {paymentStatusBadge.label}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <p className="text-sm text-gray-500">
                      {order.items.length} ürün • {order.customerName || order.user?.name || 'Sistem'}
                      {order.customerPhone && <span> • {order.customerPhone}</span>}
                    </p>
                    {order.customerAddress && (
                      <div
                        className="flex items-center gap-2 mt-1 text-sm"
                        // The card itself is a Link — keep the inner buttons from
                        // navigating into the order detail when clicked.
                        onClick={(e) => e.preventDefault()}
                      >
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-blue-600 truncate" title={order.customerAddress}>
                          {order.customerAddress}
                        </span>
                        <a
                          href={mapsUrl(
                            order.customerAddress,
                            order.customerLatitude,
                            order.customerLongitude,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                            typeof order.customerLatitude === 'number' &&
                            typeof order.customerLongitude === 'number'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                          }`}
                          title={
                            typeof order.customerLatitude === 'number'
                              ? 'GPS pin ile aç'
                              : "Google Maps'te aç"
                          }
                        >
                          <ExternalLink className="w-3 h-3" />
                          {typeof order.customerLatitude === 'number'
                            ? '📍 GPS'
                            : 'Haritada'}
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard?.writeText(order.customerAddress!).catch(() => {});
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                          title="Adresi kopyala"
                        >
                          <Copy className="w-3 h-3" /> Kopyala
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Total + admin-only delete */}
                <div className="flex items-start gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {order.total.toLocaleString('tr-TR')} ₺
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(order.id, order.orderNumber, e)}
                      disabled={deletingId === order.id}
                      className="p-2 rounded-lg text-red-600 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-50 transition-colors"
                      title="Siparişi sil (admin)"
                      aria-label="Siparişi sil"
                    >
                      {deletingId === order.id ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  )}
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
            );
          })
        )}
      </div>
    </div>
  );
}

