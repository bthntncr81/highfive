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
  Volume2,
  VolumeX,
  Bell,
  Wallet,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { api } from '../lib/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const { itemCount, total } = useCart();
  const { isConnected } = useWebSocket();
  const { brandName, brandLogo } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Alert volume — read from localStorage so the audio code in WebSocketContext
  // picks it up on every beep without prop drilling.
  const VOLUME_KEY = 'rm_alert_volume';
  const [alertVolume, setAlertVolume] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(VOLUME_KEY));
      return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.7;
    } catch { return 0.7; }
  });
  useEffect(() => {
    try { localStorage.setItem(VOLUME_KEY, String(alertVolume)); } catch { /* ignore */ }
  }, [alertVolume]);

  // OWNER: SaaS'ta tenant sahibi — admin menüsünün tamamını görür
  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // CASHIER de Giderler'i görebilsin diye navItems'a koşullu ekliyoruz (admin-only değil)
  const canViewExpenses = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CASHIER';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Ana Sayfa', emoji: '🏠' },
    { to: '/tables', icon: UtensilsCrossed, label: 'Masalar', emoji: '🍽️' },
    { to: '/menu', icon: ClipboardList, label: 'Menü', emoji: '📋' },
    { to: '/orders', icon: ShoppingCart, label: 'Siparişler', emoji: '🛒' },
    { to: '/stock', icon: ClipboardList, label: 'Stok Yönetimi', emoji: '📦' },
    ...(canViewExpenses ? [{ to: '/expenses', icon: Wallet, label: 'Giderler', emoji: '💸' }] : []),
  ];

  const adminItems = [
    { to: '/menu-management', icon: ClipboardList, label: 'Menü Yönetimi', emoji: '🍴' },
    { to: '/raw-materials', icon: ClipboardList, label: 'Ham Madde Yönetimi', emoji: '🧪' },
    { to: '/happy-hour', icon: ClipboardList, label: 'Happy Hour', emoji: '🍹' },
    { to: '/campaigns', icon: ClipboardList, label: 'Kampanyalar & Sadakat', emoji: '🎯' },
    { to: '/loyalty-programs', icon: ClipboardList, label: 'Sadakat Programları', emoji: '✨' },
    { to: '/loyalty-claims', icon: ClipboardList, label: 'Yorum Onayları', emoji: '⭐' },
    { to: '/option-groups', icon: ClipboardList, label: 'Opsiyon Grupları', emoji: '📋' },
    { to: '/spin-wheel', icon: ClipboardList, label: 'Şans Çarkı', emoji: '🎡' },
    { to: '/achievements', icon: ClipboardList, label: 'Rozetler', emoji: '🏅' },
    { to: '/push-notifications', icon: Bell, label: 'Push Bildirimleri', emoji: '🔔' },
    { to: '/reports', icon: BarChart3, label: 'Raporlar', emoji: '📊' },
    { to: '/users', icon: Users, label: 'Kullanıcılar', emoji: '👥' },
    { to: '/settings', icon: Settings, label: 'Ayarlar', emoji: '⚙️' },
    { to: '/set-pin', icon: Settings, label: "Giriş PIN'i", emoji: '🔢' },
    { to: '/billing', icon: Wallet, label: 'Abonelik', emoji: '💳' },
  ];

  const formatCurrency = (amount: number) => `${amount.toLocaleString('tr-TR')} ₺`;

  return (
    <div className="min-h-screen flex bg-[#ecece7]">
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
        {/* Logo Section — tenant logo/adı */}
        <div className="p-6 border-b border-[#e5e5e0] bg-[#005387]">
          <div className="flex items-center gap-4">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName || 'Logo'} className="h-12 w-auto max-w-[150px] object-contain" />
            ) : brandName ? (
              <span className="text-white font-display text-2xl font-extrabold tracking-tight truncate">{brandName}</span>
            ) : (
              <img src="/logo.svg" alt="Logo" className="h-12 w-auto brightness-0 invert" />
            )}
            <div>
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
                <span className="px-2.5 py-1 bg-[#005387] text-white text-xs font-bold rounded-full shadow-sm">
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
          <div className="mx-4 mb-4 p-4 bg-[#005387] rounded-2xl text-white">
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
        <div className="p-4 border-t border-[#e5e5e0] bg-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-[#005387] rounded-xl flex items-center justify-center shadow-lg">
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
                <span className="text-xs px-2 py-0.5 bg-[#bb1e10]/10 text-[#bb1e10] rounded-full font-medium">
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

          {/* Alert volume control — drives the beep gain in WebSocketContext.
              0 mutes the alert, 1 is full volume. Persisted to localStorage. */}
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                {alertVolume > 0 ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                Bildirim Sesi
              </span>
              <span className="text-xs font-mono text-gray-500">{Math.round(alertVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAlertVolume(0)}
                className="text-xs text-gray-500 hover:text-gray-800 px-1"
                title="Sustur"
              >
                🔇
              </button>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={alertVolume}
                onChange={(e) => setAlertVolume(Number(e.target.value))}
                className="flex-1 accent-[#bb1e10]"
              />
              <button
                type="button"
                onClick={() => {
                  // Quick test: play one burst at the current volume
                  try {
                    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
                    const ctx = new Ctx();
                    [0, 0.2].forEach((d) => {
                      const o = ctx.createOscillator(), g = ctx.createGain();
                      o.connect(g); g.connect(ctx.destination);
                      o.frequency.value = 880; o.type = 'square';
                      g.gain.setValueAtTime(alertVolume, ctx.currentTime + d);
                      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + d + 0.18);
                      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.18);
                    });
                  } catch { /* ignore */ }
                }}
                className="text-xs text-gray-500 hover:text-gray-800 px-1"
                title="Test et"
              >
                ▶
              </button>
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
        <div className="sticky top-0 z-20 bg-[#ecece7]/80 backdrop-blur-sm border-b border-[#e5e5e0] p-4 lg:p-6">
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#005387] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
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

        {/* Deneme / ödeme durumu bandı */}
        <TrialBanner />

        {/* Page content */}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Deneme geri sayımı / ödeme uyarısı — /api/platform/billing/subscription'dan.
// TRIAL: amber bant + kalan gün; PAST_DUE: kırmızı bant. ACTIVE'de görünmez.
function TrialBanner() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ status: string; trialEndsAt: string | null } | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    api.get('/api/platform/billing/subscription', token)
      .then((r) => setInfo(r.tenant ? { status: r.tenant.status, trialEndsAt: r.tenant.trialEndsAt } : null))
      .catch(() => setInfo(null));
  }, [token, user]);

  if (!info) return null;

  if (info.status === 'TRIAL' && info.trialEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(info.trialEndsAt).getTime() - Date.now()) / 864e5));
    return (
      <button
        onClick={() => navigate('/billing')}
        className="block w-full bg-amber-400 px-4 py-2 text-center text-sm font-bold text-amber-950 hover:bg-amber-300 transition-colors"
      >
        ⏳ Ücretsiz deneme: {days} gün kaldı — planını seç, kesintisiz devam et →
      </button>
    );
  }
  if (info.status === 'PAST_DUE') {
    return (
      <button
        onClick={() => navigate('/billing')}
        className="block w-full bg-red-500 px-4 py-2 text-center text-sm font-bold text-white hover:bg-red-600 transition-colors"
      >
        ⚠️ Ödemen alınamadı — hesabın kilitlenmeden ödeme bilgini güncelle →
      </button>
    );
  }
  return null;
}
