import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../lib/api';
import { Plus, Users, RefreshCw, Search, Sparkles, X, Link2, Unlink } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: string;
  orders?: any[];
  mergedWithId?: string | null;
  mergedTables?: Table[];
}

export default function Tables() {
  const { token } = useAuth();
  const { setTableId } = useCart();
  const { onMessage } = useWebSocket();
  const navigate = useNavigate();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTable, setNewTable] = useState({ number: 0, name: '', capacity: 4 });
  const [isAdding, setIsAdding] = useState(false);
  
  // Masa birleştirme state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    fetchTables();

    const unsubscribe = onMessage('tables', (data) => {
      if (data.action === 'update') {
        fetchTables();
      }
    });

    return unsubscribe;
  }, []);

  const fetchTables = async () => {
    try {
      const response = await api.get('/api/tables', token!);
      setTables(response.tables || []);
    } catch (error) {
      console.error('Tables fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      color: string; 
      bg: string; 
      border: string;
      label: string; 
      emoji: string;
      glow: string;
    }> = {
      FREE: { 
        color: 'text-green-700', 
        bg: 'bg-green-50', 
        border: 'border-green-400',
        label: 'Boş', 
        emoji: '✨',
        glow: 'hover:shadow-green-200'
      },
      OCCUPIED: { 
        color: 'text-red-700', 
        bg: 'bg-red-50', 
        border: 'border-red-400',
        label: 'Dolu', 
        emoji: '🍽️',
        glow: 'hover:shadow-red-200'
      },
      RESERVED: { 
        color: 'text-blue-700', 
        bg: 'bg-blue-50', 
        border: 'border-blue-400',
        label: 'Rezerve', 
        emoji: '📅',
        glow: 'hover:shadow-blue-200'
      },
      CLEANING: { 
        color: 'text-amber-700', 
        bg: 'bg-amber-50', 
        border: 'border-amber-400',
        label: 'Temizleniyor', 
        emoji: '🧹',
        glow: 'hover:shadow-amber-200'
      },
    };
    return configs[status] || configs.FREE;
  };

  const handleTableClick = (table: Table) => {
    if (table.status === 'FREE') {
      setTableId(table.id);
      navigate('/menu');
    } else if (table.status === 'OCCUPIED' && table.orders?.length) {
      navigate(`/orders/${table.orders[0].id}`);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: string) => {
    try {
      await api.patch(`/api/tables/${tableId}/status`, { status: newStatus }, token!);
      fetchTables();
    } catch (error) {
      console.error('Status change error:', error);
    }
  };

  const handleAddTable = async () => {
    if (!newTable.number || newTable.number <= 0) {
      alert('Geçerli bir masa numarası girin');
      return;
    }
    
    setIsAdding(true);
    try {
      await api.post('/api/tables', {
        number: newTable.number,
        name: newTable.name || `Masa ${newTable.number}`,
        capacity: newTable.capacity || 4,
      }, token!);
      setShowAddModal(false);
      setNewTable({ number: 0, name: '', capacity: 4 });
      fetchTables();
    } catch (error: any) {
      alert(error.message || 'Masa eklenemedi');
    } finally {
      setIsAdding(false);
    }
  };

  const openAddModal = () => {
    const maxNumber = tables.reduce((max, t) => Math.max(max, t.number), 0);
    setNewTable({ number: maxNumber + 1, name: '', capacity: 4 });
    setShowAddModal(true);
  };

  // Masa birleştirme fonksiyonları
  const toggleMergeMode = () => {
    setMergeMode(!mergeMode);
    setSelectedForMerge([]);
  };

  const toggleTableForMerge = (tableId: string) => {
    setSelectedForMerge(prev => 
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleMergeTables = async () => {
    if (selectedForMerge.length < 2) {
      alert('En az 2 masa seçmelisiniz');
      return;
    }

    setIsMerging(true);
    try {
      const [mainTableId, ...otherTableIds] = selectedForMerge;
      await api.post(`/api/tables/${mainTableId}/merge`, {
        tableIds: otherTableIds,
      }, token!);
      
      setMergeMode(false);
      setSelectedForMerge([]);
      fetchTables();
    } catch (error: any) {
      alert(error.message || 'Masalar birleştirilemedi');
    } finally {
      setIsMerging(false);
    }
  };

  const handleUnmergeTables = async (tableId: string) => {
    if (!confirm('Birleştirilmiş masaları ayırmak istiyor musunuz?')) return;
    
    try {
      await api.post(`/api/tables/${tableId}/unmerge`, {}, token!);
      fetchTables();
    } catch (error: any) {
      alert(error.message || 'Masalar ayrılamadı');
    }
  };

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          table.number.toString().includes(searchQuery);
    const matchesFilter = filterStatus === 'ALL' || table.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    ALL: tables.length,
    FREE: tables.filter(t => t.status === 'FREE').length,
    OCCUPIED: tables.filter(t => t.status === 'OCCUPIED').length,
    RESERVED: tables.filter(t => t.status === 'RESERVED').length,
    CLEANING: tables.filter(t => t.status === 'CLEANING').length,
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString('tr-TR')} ₺`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#C41E3A] border-t-transparent animate-spin"></div>
            <span className="absolute inset-0 flex items-center justify-center text-3xl animate-float">
              🍽️
            </span>
          </div>
          <p className="text-gray-500 font-medium">Masalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍽️</span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Masalar</h1>
          </div>
          <p className="text-gray-500 mt-1">Toplam {tables.length} masa • {statusCounts.FREE} boş</p>
        </div>
        <div className="flex items-center gap-3">
          {mergeMode ? (
            <>
              <button
                onClick={toggleMergeMode}
                className="btn btn-secondary flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                İptal
              </button>
              <button
                onClick={handleMergeTables}
                disabled={selectedForMerge.length < 2 || isMerging}
                className="btn btn-primary flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                {isMerging ? 'Birleştiriliyor...' : `${selectedForMerge.length} Masayı Birleştir`}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={fetchTables}
                className="btn btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Yenile</span>
              </button>
              <button
                onClick={toggleMergeMode}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Birleştir</span>
              </button>
              <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Masa Ekle
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masa ara..."
              className="input pl-12"
            />
          </div>
          
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'Tümü', emoji: '📋' },
              { key: 'FREE', label: 'Boş', emoji: '✨' },
              { key: 'OCCUPIED', label: 'Dolu', emoji: '🍽️' },
              { key: 'RESERVED', label: 'Rezerve', emoji: '📅' },
              { key: 'CLEANING', label: 'Temizlik', emoji: '🧹' },
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  filterStatus === filter.key
                    ? 'bg-[#C41E3A] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{filter.emoji}</span>
                <span>{filter.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filterStatus === filter.key
                    ? 'bg-white/20'
                    : 'bg-gray-200'
                }`}>
                  {statusCounts[filter.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Merge Mode Info */}
      {mergeMode && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Link2 className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">Masa Birleştirme Modu</p>
              <p className="text-sm text-blue-700">Birleştirmek istediğiniz masaları seçin. İlk seçilen masa ana masa olacak.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.filter(t => !t.mergedWithId).map((table, index) => {
          const statusConfig = getStatusConfig(table.status);
          const isSelectedForMerge = selectedForMerge.includes(table.id);
          const hasMergedTables = table.mergedTables && table.mergedTables.length > 0;
          
          return (
            <div
              key={table.id}
              onClick={() => {
                if (mergeMode) {
                  toggleTableForMerge(table.id);
                } else {
                  handleTableClick(table);
                }
              }}
              className={`table-card table-${table.status.toLowerCase()} stagger-item ${statusConfig.glow} ${
                mergeMode ? 'cursor-pointer' : ''
              } ${isSelectedForMerge ? 'ring-4 ring-blue-500 bg-blue-50' : ''}`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {/* Merge selection indicator */}
              {mergeMode && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelectedForMerge 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-white border-gray-300'
                }`}>
                  {isSelectedForMerge && selectedForMerge.indexOf(table.id) + 1}
                </div>
              )}

              {/* Merged tables badge */}
              {hasMergedTables && !mergeMode && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnmergeTables(table.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200"
                  >
                    <Link2 className="w-3 h-3" />
                    +{table.mergedTables?.length}
                    <Unlink className="w-3 h-3 ml-1" />
                  </button>
                </div>
              )}

              {/* Status badge */}
              <div className="flex items-center justify-between mb-3">
                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.emoji} {statusConfig.label}
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{table.capacity}</span>
                </div>
              </div>

              {/* Table number - big and centered */}
              <div className="text-center py-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-inner mb-2 ${
                  hasMergedTables 
                    ? 'bg-gradient-to-br from-purple-100 to-purple-200' 
                    : 'bg-gradient-to-br from-gray-100 to-gray-200'
                }`}>
                  <span className={`text-3xl font-bold ${hasMergedTables ? 'text-purple-700' : 'text-gray-700'}`}>
                    {table.number}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-medium">{table.name}</p>
                {hasMergedTables && (
                  <p className="text-xs text-purple-600 mt-1">
                    + Masa {table.mergedTables?.map(t => t.number).join(', ')}
                  </p>
                )}
              </div>

              {/* Order info if occupied */}
              {table.status === 'OCCUPIED' && table.orders?.length > 0 && !mergeMode && (
                <div className="mt-2 pt-3 border-t-2 border-dashed border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      #{table.orders[0].orderNumber?.toString().padStart(4, '0')}
                    </span>
                    <span className="font-bold text-[#C41E3A]">
                      {formatCurrency(table.orders[0].total || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick action for cleaning tables */}
              {table.status === 'CLEANING' && !mergeMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(table.id, 'FREE');
                  }}
                  className="mt-3 w-full btn btn-success text-sm py-2 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Temizlik Tamam
                </button>
              )}

              {/* Click hint for free tables */}
              {table.status === 'FREE' && !mergeMode && (
                <p className="mt-3 text-xs text-center text-gray-400">
                  Sipariş almak için tıklayın
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredTables.length === 0 && (
        <div className="card text-center py-16">
          <span className="text-6xl mb-4 block">🔍</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Masa Bulunamadı</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 'Arama kriterlerine uygun masa yok' : 'Henüz masa eklenmemiş'}
          </p>
          {!searchQuery && (
            <button onClick={openAddModal} className="btn btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              İlk Masayı Ekle
            </button>
          )}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🪑</span>
                <h2 className="text-xl font-bold text-gray-900">Yeni Masa Ekle</h2>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Masa Numarası *
                </label>
                <input
                  type="number"
                  value={newTable.number}
                  onChange={(e) => setNewTable({ ...newTable, number: parseInt(e.target.value) || 0 })}
                  className="input text-2xl font-bold text-center"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Masa Adı (opsiyonel)
                </label>
                <input
                  type="text"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder={`Masa ${newTable.number}`}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Örn: Bahçe 1, VIP Masa, Pencere Kenarı</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kapasite
                </label>
                <div className="flex items-center gap-3">
                  {[2, 4, 6, 8, 10].map(cap => (
                    <button
                      key={cap}
                      onClick={() => setNewTable({ ...newTable, capacity: cap })}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        newTable.capacity === cap
                          ? 'bg-[#C41E3A] text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">Kişi sayısı</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary flex-1"
              >
                İptal
              </button>
              <button
                onClick={handleAddTable}
                disabled={isAdding || !newTable.number}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Masa Ekle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floor plan legend */}
      <div className="card bg-gray-50">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {[
            { status: 'FREE', label: 'Boş Masa', desc: 'Sipariş alınabilir' },
            { status: 'OCCUPIED', label: 'Dolu Masa', desc: 'Aktif sipariş var' },
            { status: 'RESERVED', label: 'Rezerve', desc: 'Rezervasyon yapılmış' },
            { status: 'CLEANING', label: 'Temizleniyor', desc: 'Temizlik bekliyor' },
          ].map(item => {
            const config = getStatusConfig(item.status);
            return (
              <div key={item.status} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${config.bg} ${config.border} border-2`} />
                <div>
                  <p className="font-medium text-gray-700 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
