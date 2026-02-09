import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  Package, 
  AlertTriangle, 
  Check, 
  X, 
  Clock, 
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: boolean;
  outOfStockReason?: string;
  outOfStockUntil?: string;
  stockQuantity?: number;
  lowStockAlert?: number;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function StockManagement() {
  const { token } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [outOfStockReason, setOutOfStockReason] = useState('');
  const [outOfStockUntil, setOutOfStockUntil] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [menuResponse, catResponse] = await Promise.all([
        api.get('/api/menu?available=all', token!),
        api.get('/api/categories', token!),
      ]);
      setMenuItems(menuResponse.items || []);
      setCategories(catResponse.categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!item.available) {
      // If currently unavailable, make it available
      await updateAvailability(item.id, true);
    } else {
      // If currently available, open modal to set reason
      setSelectedItem(item);
      setOutOfStockReason('');
      setOutOfStockUntil('');
      setShowModal(true);
    }
  };

  const updateAvailability = async (itemId: string, available: boolean, reason?: string, until?: string) => {
    setIsUpdating(true);
    try {
      await api.patch(`/api/stock/menu/${itemId}/availability`, {
        available,
        reason,
        until,
      }, token!);

      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              available, 
              outOfStockReason: available ? undefined : reason,
              outOfStockUntil: available ? undefined : until 
            } 
          : item
      ));

      setShowModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Güncelleme başarısız oldu');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickToggle = async (item: MenuItem) => {
    if (item.available) {
      // Quick disable with default reason
      await updateAvailability(item.id, false, 'Geçici olarak tükendi');
    } else {
      await updateAvailability(item.id, true);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || item.category?.id === filterCategory;
    const matchesAvailability = 
      filterAvailability === 'all' ||
      (filterAvailability === 'available' && item.available) ||
      (filterAvailability === 'unavailable' && !item.available);
    
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const unavailableCount = menuItems.filter(item => !item.available).length;
  const lowStockCount = menuItems.filter(item => 
    item.stockQuantity !== undefined && 
    item.lowStockAlert !== undefined && 
    item.stockQuantity <= item.lowStockAlert
  ).length;

  // Quick out of stock reasons
  const QUICK_REASONS = [
    'Bugünlük tükendi',
    'Malzeme bitti',
    'Geçici olarak mevcut değil',
    'Mevsim dışı',
    'Stok yenileniyor',
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-500" />
            Stok Yönetimi
          </h1>
          <p className="text-gray-500 mt-1">Ürün erişilebilirliğini hızlıca yönetin</p>
        </div>
        <button
          onClick={fetchData}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Satışta</p>
              <p className="text-3xl font-bold">{menuItems.length - unavailableCount}</p>
            </div>
            <Check className="w-10 h-10 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-red-500 to-rose-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Tükenen</p>
              <p className="text-3xl font-bold">{unavailableCount}</p>
            </div>
            <X className="w-10 h-10 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Düşük Stok</p>
              <p className="text-3xl font-bold">{lowStockCount}</p>
            </div>
            <AlertTriangle className="w-10 h-10 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ürün ara..."
              className="input pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory || ''}
            onChange={(e) => setFilterCategory(e.target.value || null)}
            className="input w-auto"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Availability Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Tümü' },
              { value: 'available', label: '✅ Satışta' },
              { value: 'unavailable', label: '❌ Tükenen' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterAvailability(opt.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterAvailability === opt.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`card border-2 transition-all ${
              item.available 
                ? 'border-transparent hover:border-green-500' 
                : 'border-red-300 bg-red-50'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.category?.name}</p>
              </div>
              
              {/* Toggle Switch */}
              <button
                onClick={() => handleQuickToggle(item)}
                disabled={isUpdating}
                className={`relative w-14 h-8 rounded-full transition-all ${
                  item.available 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                    item.available ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-primary-500">
                {item.price.toLocaleString('tr-TR')} ₺
              </span>
              
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.available 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {item.available ? '✅ Satışta' : '❌ Tükendi'}
              </span>
            </div>

            {/* Out of Stock Info */}
            {!item.available && (
              <div className="mt-3 p-2 bg-red-100 rounded-lg text-sm">
                {item.outOfStockReason && (
                  <p className="text-red-700">📝 {item.outOfStockReason}</p>
                )}
                {item.outOfStockUntil && (
                  <p className="text-red-600 mt-1">
                    ⏰ {new Date(item.outOfStockUntil).toLocaleString('tr-TR')}'e kadar
                  </p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-3 flex gap-2">
              {item.available ? (
                <button
                  onClick={() => toggleAvailability(item)}
                  className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-all"
                >
                  🚫 Tükendi Olarak İşaretle
                </button>
              ) : (
                <button
                  onClick={() => updateAvailability(item.id, true)}
                  className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-all"
                >
                  ✅ Satışa Aç
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Ürün bulunamadı</p>
        </div>
      )}

      {/* Out of Stock Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl">
            {/* Sticky Header */}
            <div className="p-6 pb-4 border-b shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                🚫 "{selectedItem.name}" Tükendi
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 py-4 flex-1 min-h-0">
            {/* Quick Reasons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hızlı Seçim
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setOutOfStockReason(reason)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      outOfStockReason === reason
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Özel Açıklama
              </label>
              <input
                type="text"
                value={outOfStockReason}
                onChange={(e) => setOutOfStockReason(e.target.value)}
                placeholder="Neden tükendi?"
                className="input"
              />
            </div>

            {/* Auto-restore Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Otomatik Açılma Zamanı (Opsiyonel)
              </label>
              <input
                type="datetime-local"
                value={outOfStockUntil}
                onChange={(e) => setOutOfStockUntil(e.target.value)}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Bu zamanda otomatik olarak satışa açılır
              </p>
            </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex gap-3 p-6 pt-4 border-t shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary flex-1"
              >
                İptal
              </button>
              <button
                onClick={() => updateAvailability(
                  selectedItem.id, 
                  false, 
                  outOfStockReason || 'Geçici olarak tükendi',
                  outOfStockUntil || undefined
                )}
                disabled={isUpdating}
                className="btn btn-danger flex-1"
              >
                {isUpdating ? 'Güncelleniyor...' : '🚫 Tükendi İşaretle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

