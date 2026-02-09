import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPerUnit: number;
  supplier?: string;
  active: boolean;
  ingredients: { menuItem: { id: string; name: string } }[];
}

const UNIT_OPTIONS = [
  { value: 'GRAM', label: 'Gram (g)', short: 'g' },
  { value: 'KILOGRAM', label: 'Kilogram (kg)', short: 'kg' },
  { value: 'LITRE', label: 'Litre (L)', short: 'L' },
  { value: 'MILLILITRE', label: 'Mililitre (mL)', short: 'mL' },
  { value: 'ADET', label: 'Adet', short: 'adet' },
  { value: 'PORSIYON', label: 'Porsiyon', short: 'prs' },
];

const getUnitShort = (unit: string) =>
  UNIT_OPTIONS.find((u) => u.value === unit)?.short || unit;

export default function RawMaterialsManagement() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'inactive'>('all');

  // Stock update modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockItem, setStockItem] = useState<RawMaterial | null>(null);
  const [stockAmount, setStockAmount] = useState('');
  const [stockOperation, setStockOperation] = useState<'SET' | 'ADD' | 'SUBTRACT'>('ADD');

  const [formData, setFormData] = useState({
    name: '',
    unit: 'GRAM',
    currentStock: '',
    minStock: '',
    costPerUnit: '',
    supplier: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/raw-materials', token!);
      setMaterials(res.materials || []);
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        currentStock: formData.currentStock ? parseFloat(formData.currentStock) : 0,
        minStock: formData.minStock ? parseFloat(formData.minStock) : 0,
        costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : 0,
        supplier: formData.supplier || undefined,
      };

      if (editingMaterial) {
        await api.put(`/api/raw-materials/${editingMaterial.id}`, payload, token!);
      } else {
        await api.post('/api/raw-materials', payload, token!);
      }

      setShowModal(false);
      setEditingMaterial(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(error.message || 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit: 'GRAM',
      currentStock: '',
      minStock: '',
      costPerUnit: '',
      supplier: '',
    });
  };

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit: material.unit,
      currentStock: material.currentStock.toString(),
      minStock: material.minStock.toString(),
      costPerUnit: material.costPerUnit.toString(),
      supplier: material.supplier || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ham maddeyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/api/raw-materials/${id}`, token!);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Silme işlemi başarısız');
    }
  };

  const openStockModal = (material: RawMaterial) => {
    setStockItem(material);
    setStockAmount('');
    setStockOperation('ADD');
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!stockItem || !stockAmount) return;

    try {
      await api.patch(`/api/raw-materials/${stockItem.id}/stock`, {
        amount: parseFloat(stockAmount),
        operation: stockOperation,
      }, token!);
      setShowStockModal(false);
      fetchData();
    } catch (error) {
      console.error('Stock update error:', error);
      alert('Stok güncelleme başarısız');
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'low' && Number(m.currentStock) <= Number(m.minStock) && Number(m.minStock) > 0) ||
      (filter === 'inactive' && !m.active);
    return matchesSearch && matchesFilter;
  });

  const lowStockCount = materials.filter(
    (m) => m.active && Number(m.currentStock) <= Number(m.minStock) && Number(m.minStock) > 0
  ).length;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-500" />
            Ham Madde Yönetimi
          </h1>
          <p className="text-gray-500 mt-1">{materials.length} ham madde kayıtlı</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
          <button
            onClick={() => {
              setEditingMaterial(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ham Madde Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Toplam Ham Madde</p>
              <p className="text-3xl font-bold">{materials.filter((m) => m.active).length}</p>
            </div>
            <Package className="w-10 h-10 opacity-50" />
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

        <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Kullanılan Ürünlerde</p>
              <p className="text-3xl font-bold">
                {materials.filter((m) => m.ingredients.length > 0).length}
              </p>
            </div>
            <ArrowUpDown className="w-10 h-10 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ham madde ara..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Tümü' },
              { value: 'low', label: '⚠️ Düşük Stok' },
              { value: 'inactive', label: '🚫 Pasif' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === opt.value
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

      {/* Materials Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700">Ham Madde</th>
                <th className="text-left p-4 font-semibold text-gray-700">Birim</th>
                <th className="text-right p-4 font-semibold text-gray-700">Mevcut Stok</th>
                <th className="text-right p-4 font-semibold text-gray-700">Min Stok</th>
                <th className="text-right p-4 font-semibold text-gray-700">Birim Maliyet</th>
                <th className="text-left p-4 font-semibold text-gray-700">Tedarikçi</th>
                <th className="text-center p-4 font-semibold text-gray-700">Kullanım</th>
                <th className="text-center p-4 font-semibold text-gray-700">Durum</th>
                <th className="text-center p-4 font-semibold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((material) => {
                const isLow =
                  Number(material.currentStock) <= Number(material.minStock) &&
                  Number(material.minStock) > 0;
                return (
                  <tr
                    key={material.id}
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      isLow ? 'bg-amber-50' : ''
                    } ${!material.active ? 'opacity-50' : ''}`}
                  >
                    <td className="p-4">
                      <span className="font-medium text-gray-900">{material.name}</span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {UNIT_OPTIONS.find((u) => u.value === material.unit)?.label || material.unit}
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-bold ${
                          isLow ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {Number(material.currentStock).toLocaleString('tr-TR')}{' '}
                        {getUnitShort(material.unit)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {Number(material.minStock).toLocaleString('tr-TR')}{' '}
                      {getUnitShort(material.unit)}
                    </td>
                    <td className="p-4 text-right text-gray-600">
                      {Number(material.costPerUnit) > 0
                        ? `₺${Number(material.costPerUnit).toLocaleString('tr-TR')}`
                        : '-'}
                    </td>
                    <td className="p-4 text-gray-600">{material.supplier || '-'}</td>
                    <td className="p-4 text-center">
                      <span className="text-sm text-gray-500">
                        {material.ingredients.length} ürün
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {isLow ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Düşük Stok
                        </span>
                      ) : material.active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openStockModal(material)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                          title="Stok Güncelle"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(material)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Ham madde bulunamadı</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b shrink-0">
              <h2 className="text-xl font-semibold">
                {editingMaterial ? 'Ham Madde Düzenle' : 'Yeni Ham Madde'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto p-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ham Madde Adı *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Örn: Domates, Mozzarella, Zeytinyağı..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mevcut Stok
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stok (Uyarı)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birim Maliyet (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="input"
                  placeholder="Opsiyonel"
                />
              </div>
            </div>

              {/* Sticky Footer */}
              <div className="flex gap-2 p-6 pt-4 border-t shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  İptal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockModal && stockItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Stok Güncelle</h2>
                <p className="text-sm text-gray-500">
                  {stockItem.name} - Mevcut:{' '}
                  {Number(stockItem.currentStock).toLocaleString('tr-TR')}{' '}
                  {getUnitShort(stockItem.unit)}
                </p>
              </div>
              <button onClick={() => setShowStockModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {[
                  { value: 'ADD', label: '+ Ekle', color: 'bg-green-500' },
                  { value: 'SUBTRACT', label: '- Çıkar', color: 'bg-red-500' },
                  { value: 'SET', label: '= Ayarla', color: 'bg-blue-500' },
                ].map((op) => (
                  <button
                    key={op.value}
                    onClick={() => setStockOperation(op.value as any)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      stockOperation === op.value
                        ? `${op.color} text-white`
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Miktar ({getUnitShort(stockItem.unit)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  className="input text-center text-2xl font-bold"
                  placeholder="0"
                  autoFocus
                />
              </div>

              {stockAmount && (
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Yeni stok miktarı:</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stockOperation === 'SET'
                      ? parseFloat(stockAmount)
                      : stockOperation === 'ADD'
                      ? Number(stockItem.currentStock) + parseFloat(stockAmount)
                      : Math.max(0, Number(stockItem.currentStock) - parseFloat(stockAmount))}{' '}
                    {getUnitShort(stockItem.unit)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setShowStockModal(false)} className="btn btn-secondary flex-1">
                  İptal
                </button>
                <button
                  onClick={handleStockUpdate}
                  disabled={!stockAmount}
                  className="btn btn-primary flex-1"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
