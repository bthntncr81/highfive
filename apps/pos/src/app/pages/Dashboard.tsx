import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../lib/api';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
} from 'lucide-react';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  availableTables: number;
  todayTips: number;
}

interface RecentOrder {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: string;
  table?: { name: string };
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const { onMessage } = useWebSocket();
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    availableTables: 0,
    todayTips: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();

    // Update time every minute
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);

    // Subscribe to order updates
    const unsubscribe = onMessage('orders', (data) => {
      if (data.action === 'new' || data.action === 'update') {
        fetchDashboardData();
      }
    });

    return () => {
      clearInterval(timeInterval);
      unsubscribe();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const reportResponse = await api.get('/api/reports/daily', token!);
      const ordersResponse = await api.get('/api/orders/active', token!);
      const tablesResponse = await api.get('/api/tables', token!);
      
      const availableTables = tablesResponse.tables?.filter(
        (t: any) => t.status === 'FREE'
      ).length || 0;

      setStats({
        todayOrders: reportResponse.summary?.totalOrders || 0,
        todayRevenue: reportResponse.summary?.totalRevenue || 0,
        activeOrders: ordersResponse.orders?.length || 0,
        availableTables,
        todayTips: reportResponse.summary?.totalTips || 0,
      });

      const recentResponse = await api.get('/api/orders?limit=5', token!);
      setRecentOrders(recentResponse.orders || []);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
      PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Bekliyor', emoji: '⏳' },
      CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Onaylandı', emoji: '✅' },
      PREPARING: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Hazırlanıyor', emoji: '👨‍🍳' },
      READY: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hazır', emoji: '🔔' },
      SERVED: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Servis Edildi', emoji: '🍽️' },
      COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Tamamlandı', emoji: '✨' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'İptal', emoji: '❌' },
    };
    return configs[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status, emoji: '📋' };
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString('tr-TR')} ₺`;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Günaydın', emoji: '🌅' };
    if (hour < 18) return { text: 'İyi günler', emoji: '☀️' };
    return { text: 'İyi akşamlar', emoji: '🌙' };
  };

  const greeting = getGreeting();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#C41E3A] border-t-transparent animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center text-3xl animate-float">
              🍕
            </span>
          </div>
          <p className="text-gray-500 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome Header */}
      <div className="card card-red relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-conic-gradient(#FFF 0% 25%, transparent 0% 50%)`,
            backgroundSize: '30px 30px'
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{greeting.emoji}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {greeting.text}, {user?.name}!
              </h1>
            </div>
            <p className="text-white/70 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {currentTime.toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/tables"
              className="btn bg-white text-[#C41E3A] hover:bg-white/90 flex items-center gap-2"
            >
              <span>🍽️</span>
              Yeni Sipariş
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today Revenue */}
        <div className="stat-card stagger-item">
          <div className="flex items-start justify-between">
            <div className="stat-icon bg-gradient-to-br from-green-400 to-green-600 text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-2xl">💰</span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 font-medium">Bugünkü Ciro</p>
            <p className="stat-value mt-1">{formatCurrency(stats.todayRevenue)}</p>
          </div>
        </div>

        {/* Today Orders */}
        <div className="stat-card stagger-item">
          <div className="flex items-start justify-between">
            <div className="stat-icon bg-gradient-to-br from-blue-400 to-blue-600 text-white">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-2xl">📦</span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 font-medium">Bugünkü Sipariş</p>
            <p className="stat-value mt-1">{stats.todayOrders}</p>
          </div>
        </div>

        {/* Active Orders */}
        <div className="stat-card stagger-item">
          <div className="flex items-start justify-between">
            <div className="stat-icon bg-gradient-to-br from-orange-400 to-orange-600 text-white">
              <Flame className="w-6 h-6" />
            </div>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 font-medium">Aktif Sipariş</p>
            <p className="stat-value mt-1">{stats.activeOrders}</p>
          </div>
        </div>

        {/* Available Tables */}
        <div className="stat-card stagger-item">
          <div className="flex items-start justify-between">
            <div className="stat-icon bg-gradient-to-br from-purple-400 to-purple-600 text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xl">🍽️</span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 font-medium">Boş Masa</p>
            <p className="stat-value mt-1">{stats.availableTables}</p>
          </div>
        </div>

        {/* Today Tips */}
        <div className="stat-card stagger-item">
          <div className="flex items-start justify-between">
            <div className="stat-icon bg-gradient-to-br from-pink-400 to-pink-600 text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-2xl">💝</span>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500 font-medium">Bugünkü Bahşiş</p>
            <p className="stat-value mt-1">{formatCurrency(stats.todayTips)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-bold text-gray-900">Hızlı İşlemler</h2>
          </div>
          <div className="space-y-3">
            <Link
              to="/tables"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-[#C41E3A]/5 hover:to-[#C41E3A]/10 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🍽️
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Yeni Masa Siparişi</p>
                <p className="text-sm text-gray-500">Masadan sipariş al</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#C41E3A] group-hover:translate-x-1 transition-all" />
            </Link>
            
            <Link
              to="/menu"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-[#F4A300]/5 hover:to-[#F4A300]/10 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📦
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Paket Sipariş</p>
                <p className="text-sm text-gray-500">Paket veya gel-al sipariş</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#F4A300] group-hover:translate-x-1 transition-all" />
            </Link>
            
            <Link
              to="/orders"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-green-100 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📋
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Aktif Siparişler</p>
                <p className="text-sm text-gray-500">Tüm siparişleri görüntüle</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>

        {/* Recent orders */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕐</span>
              <h2 className="text-lg font-bold text-gray-900">Son Siparişler</h2>
            </div>
            <Link 
              to="/orders" 
              className="text-[#C41E3A] hover:text-[#9B1730] text-sm font-semibold flex items-center gap-1"
            >
              Tümünü Gör
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-gray-500 font-medium">Henüz sipariş yok</p>
              <p className="text-gray-400 text-sm">İlk siparişi almaya başlayın!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all stagger-item group"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-gray-700 group-hover:shadow-md transition-shadow">
                      #{order.orderNumber.toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {order.table?.name || 'Paket Sipariş'}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}>
                      <span>{statusConfig.emoji}</span>
                      <span>{statusConfig.label}</span>
                    </div>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
