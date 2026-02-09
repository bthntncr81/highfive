import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ShoppingCart,
  Wifi,
  WifiOff,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { itemCount, total } = useCart();
  const { isConnected } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Ana Sayfa', emoji: '🏠' },
    { to: '/tables', icon: UtensilsCrossed, label: 'Masalar', emoji: '🍽️' },
    { to: '/menu', icon: ClipboardList, label: 'Menü', emoji: '📋' },
    { to: '/orders', icon: ShoppingCart, label: 'Siparişler', emoji: '🛒' },
    { to: '/stock', icon: ClipboardList, label: 'Stok Yönetimi', emoji: '📦' },
  ];

  const adminItems = [
    { to: '/menu-management', icon: ClipboardList, label: 'Menü Yönetimi', emoji: '🍴' },
    { to: '/raw-materials', icon: ClipboardList, label: 'Ham Madde Yönetimi', emoji: '🧪' },
    { to: '/happy-hour', icon: ClipboardList, label: 'Happy Hour', emoji: '🍹' },
    { to: '/campaigns', icon: ClipboardList, label: 'Kampanyalar & Sadakat', emoji: '🎯' },
    { to: '/reports', icon: BarChart3, label: 'Raporlar', emoji: '📊' },
    { to: '/users', icon: Users, label: 'Kullanıcılar', emoji: '👥' },
    { to: '/settings', icon: Settings, label: 'Ayarlar', emoji: '⚙️' },
  ];

  const formatCurrency = (amount: number) => `${amount.toLocaleString('tr-TR')} ₺`;

  return (
    <div className="min-h-screen flex bg-[#FDF6E3]">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 bg-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-2xl lg:shadow-xl
      `}>
        {/* Logo Section */}
        <div className="p-6 border-b-4 border-[#E5E0D5] bg-gradient-to-r from-[#C41E3A] to-[#9B1730] relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `repeating-conic-gradient(#FFF 0% 25%, transparent 0% 50%)`,
              backgroundSize: '20px 20px'
            }}
          />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center">
              <span className="text-3xl">🖐️</span>
            </div>
            <div>
              <h1 className="font-display text-2xl text-white tracking-wider">HIGH FIVE</h1>
              <p className="text-white/70 text-xs font-medium">POS SİSTEMİ v1.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `nav-link stagger-item ${isActive ? 'active' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="flex-1">{item.label}</span>
              {item.to === '/orders' && itemCount > 0 && (
                <span className="px-2.5 py-1 bg-[#F4A300] text-white text-xs font-bold rounded-full shadow-sm">
                  {itemCount}
                </span>
              )}
              <ChevronRight className="w-4 h-4 opacity-50" />
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="my-4 pt-4 border-t-2 border-dashed border-gray-200">
                <div className="flex items-center gap-2 px-4 mb-2">
                  <span className="text-lg">👑</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Yönetim
                  </span>
                </div>
              </div>
              {adminItems.map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `nav-link stagger-item ${isActive ? 'active' : ''}`}
                  style={{ animationDelay: `${(index + navItems.length) * 0.05}s` }}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Cart summary (if items) */}
        {itemCount > 0 && (
          <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-[#F4A300] to-[#CC8800] rounded-2xl text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Sepet</span>
              <span className="text-2xl">🛒</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">{itemCount} ürün</span>
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {/* User section */}
        <div className="p-4 border-t-4 border-[#E5E0D5] bg-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#C41E3A] to-[#9B1730] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-[#C41E3A]/10 text-[#C41E3A] rounded-full font-medium">
                  {user?.role}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-500" />
                      Bağlı
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-500" />
                      Çevrimdışı
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto lg:ml-0">
        {/* Top bar with current page indicator */}
        <div className="sticky top-0 z-20 bg-[#FDF6E3]/80 backdrop-blur-sm border-b-2 border-[#E5E0D5] p-4 lg:p-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3 lg:hidden">
              {/* Space for mobile menu button */}
              <div className="w-12" />
            </div>
            
            {/* Current time */}
            <div className="hidden lg:flex items-center gap-2 text-gray-500">
              <span className="text-2xl">⏰</span>
              <span className="font-medium">
                {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4">
              {itemCount > 0 && (
                <button 
                  onClick={() => navigate('/menu')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F4A300] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                >
                  <span>🛒</span>
                  <span>{itemCount}</span>
                  <span className="hidden sm:inline">• {formatCurrency(total)}</span>
                </button>
              )}
              
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                isConnected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="text-sm font-medium hidden sm:inline">
                  {isConnected ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
