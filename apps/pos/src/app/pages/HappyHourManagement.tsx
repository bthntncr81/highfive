import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, Trash2, Edit2, Calendar, Tag, Percent, Check, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: { name: string };
}

interface HappyHourItem {
  menuItem: MenuItem;
  specialPrice?: number;
  discountPercent?: number;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  discountType?: string;
  discountValue?: number;
  minPurchase?: number;
  isActive: boolean;
}

interface HappyHour {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  discountPercent?: number;
  discountType?: string; // 'PERCENT' | 'FIXED' | 'CAMPAIGN'
  discountAmount?: number; // Sabit indirim tutarı
  campaignId?: string; // Bağlı kampanya
  active: boolean;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  items: HappyHourItem[];
  campaign?: Campaign;
}

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function HappyHourManagement() {
  const { token } = useAuth();
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHH, setEditingHH] = useState<HappyHour | null>(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedHH, setSelectedHH] = useState<HappyHour | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '17:00',
    endTime: '19:00',
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED' | 'CAMPAIGN',
    discountPercent: 20,
    discountAmount: 0,
    campaignId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hhRes, menuRes, campaignsRes] = await Promise.all([
        api.get('/api/happyhours', token!),
        api.get('/api/menu', token!),
        api.get('/api/campaigns', token!),
      ]);
      setHappyHours(hhRes.happyHours || []);
      setMenuItems(menuRes.items || []);
      setCampaigns(campaignsRes.campaigns || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingHH) {
        await api.put(`/api/happyhours/${editingHH.id}`, formData, token!);
      } else {
        await api.post('/api/happyhours', formData, token!);
      }
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/api/happyhours/${id}`, token!);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleActive = async (hh: HappyHour) => {
    try {
      await api.put(`/api/happyhours/${hh.id}`, { active: !hh.active }, token!);
      fetchData();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleAddItem = async (menuItemId: string, specialPrice?: number, discountPercent?: number) => {
    if (!selectedHH) return;
    try {
      await api.post(`/api/happyhours/${selectedHH.id}/items`, {
        menuItemId,
        specialPrice,
        discountPercent,
      }, token!);
      fetchData();
    } catch (error) {
      console.error('Add item error:', error);
    }
  };

  const handleRemoveItem = async (menuItemId: string) => {
    if (!selectedHH) return;
    try {
      await api.delete(`/api/happyhours/${selectedHH.id}/items/${menuItemId}`, token!);
      fetchData();
    } catch (error) {
      console.error('Remove item error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startTime: '17:00',
      endTime: '19:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      discountType: 'PERCENT',
      discountPercent: 20,
      discountAmount: 0,
      campaignId: '',
      startDate: '',
      endDate: '',
    });
    setEditingHH(null);
  };

  const openEditModal = (hh: HappyHour) => {
    setEditingHH(hh);
    setFormData({
      name: hh.name,
      description: hh.description || '',
      startTime: hh.startTime,
      endTime: hh.endTime,
      daysOfWeek: hh.daysOfWeek,
      discountType: hh.discountType || 'PERCENT',
      discountPercent: hh.discountPercent || 0,
      discountAmount: hh.discountAmount || 0,
      campaignId: hh.campaignId || '',
      startDate: hh.startDate ? hh.startDate.split('T')[0] : '',
      endDate: hh.endDate ? hh.endDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="text-4xl"
        >
          🍹
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🍹</span>
            Happy Hour Yönetimi
          </h1>
          <p className="text-gray-500 mt-1">Zaman bazlı indirim kampanyaları oluşturun</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Yeni Kampanya
        </button>
      </div>

      {/* Active Happy Hours Alert */}
      {happyHours.some((hh) => hh.isActive) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-3xl"
            >
              🎉
            </motion.span>
            <div>
              <p className="font-bold text-lg">Happy Hour Aktif!</p>
              <p className="text-white/80 text-sm">
                {happyHours
                  .filter((hh) => hh.isActive)
                  .map((hh) => hh.name)
                  .join(', ')}
              </p>
            </div>
          </div>
          <Zap className="w-8 h-8" />
        </motion.div>
      )}

      {/* Happy Hours List */}
      <div className="grid gap-4">
        {happyHours.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <span className="text-6xl">🕐</span>
            <p className="text-gray-500 mt-4">Henüz Happy Hour kampanyası yok</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary mt-4"
            >
              İlk Kampanyayı Oluştur
            </button>
          </div>
        ) : (
          happyHours.map((hh) => (
            <motion.div
              key={hh.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl p-6 shadow-sm border-2 ${
                hh.isActive ? 'border-green-400 bg-green-50' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{hh.isActive ? '🟢' : '⚪'}</span>
                    <h3 className="text-xl font-bold text-gray-900">{hh.name}</h3>
                    {hh.discountType === 'PERCENT' && hh.discountPercent && (
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
                        %{hh.discountPercent} İndirim
                      </span>
                    )}
                    {hh.discountType === 'FIXED' && hh.discountAmount && (
                      <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-bold">
                        ₺{hh.discountAmount} İndirim
                      </span>
                    )}
                    {hh.discountType === 'CAMPAIGN' && hh.campaign && (
                      <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-bold">
                        🏷️ {hh.campaign.name}
                      </span>
                    )}
                  </div>
                  {hh.description && (
                    <p className="text-gray-600 mt-2">{hh.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {hh.startTime} - {hh.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {hh.daysOfWeek.map((d) => DAYS[d].slice(0, 3)).join(', ')}
                      </span>
                    </div>
                    {hh.items.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Tag className="w-4 h-4" />
                        <span>{hh.items.length} özel ürün</span>
                      </div>
                    )}
                  </div>

                  {/* Item preview */}
                  {hh.items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {hh.items.slice(0, 5).map((item) => (
                        <span
                          key={item.menuItem.id}
                          className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm"
                        >
                          {item.menuItem.name}
                          {item.specialPrice && ` (₺${item.specialPrice})`}
                          {item.discountPercent && ` (%${item.discountPercent})`}
                        </span>
                      ))}
                      {hh.items.length > 5 && (
                        <span className="text-gray-500 text-sm">
                          +{hh.items.length - 5} daha
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedHH(hh);
                      setShowItemsModal(true);
                    }}
                    className="p-2 hover:bg-purple-100 rounded-lg text-purple-600"
                    title="Ürün Ekle"
                  >
                    <Tag className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(hh)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(hh)}
                    className={`p-2 rounded-lg ${
                      hh.active
                        ? 'hover:bg-red-100 text-red-600'
                        : 'hover:bg-green-100 text-green-600'
                    }`}
                  >
                    {hh.active ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(hh.id)}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                🍹 {editingHH ? 'Kampanya Düzenle' : 'Yeni Happy Hour'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kampanya Adı *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="Örn: Akşam Saatleri İndirimi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input w-full"
                    rows={2}
                    placeholder="Kampanya detayları..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Saati *
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bitiş Saati *
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Geçerli Günler *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(i)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          formData.daysOfWeek.includes(i)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* İndirim Tipi Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İndirim Tipi
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'PERCENT' })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        formData.discountType === 'PERCENT'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Percent className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Yüzde</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'FIXED' })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        formData.discountType === 'FIXED'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg block mb-1">₺</span>
                      <span className="text-sm font-medium">Sabit Tutar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discountType: 'CAMPAIGN' })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        formData.discountType === 'CAMPAIGN'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Tag className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Kampanya</span>
                    </button>
                  </div>
                </div>

                {/* Yüzde İndirim */}
                {formData.discountType === 'PERCENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İndirim Oranı (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={formData.discountPercent}
                        onChange={(e) =>
                          setFormData({ ...formData, discountPercent: Number(e.target.value) })
                        }
                        className="flex-1"
                      />
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold min-w-[60px] text-center">
                        %{formData.discountPercent}
                      </span>
                    </div>
                  </div>
                )}

                {/* Sabit Tutar İndirim */}
                {formData.discountType === 'FIXED' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İndirim Tutarı (₺)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-500">₺</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={formData.discountAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, discountAmount: Number(e.target.value) })
                        }
                        className="input flex-1"
                        placeholder="Örn: 25"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Her üründen sabit ₺{formData.discountAmount} indirim yapılır
                    </p>
                  </div>
                )}

                {/* Kampanya Seçimi */}
                {formData.discountType === 'CAMPAIGN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kampanya Seç
                    </label>
                    {campaigns.length === 0 ? (
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-gray-500 text-sm">Henüz kampanya yok</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Kampanyalar & Sadakat sayfasından kampanya oluşturun
                        </p>
                      </div>
                    ) : (
                      <select
                        value={formData.campaignId}
                        onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">Kampanya seçin...</option>
                        {campaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name} 
                            {campaign.discountType === 'PERCENT' 
                              ? ` (%${campaign.discountValue})` 
                              : ` (₺${campaign.discountValue})`}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Seçilen kampanyanın koşulları Happy Hour süresince geçerli olur
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Tarihi (Opsiyonel)
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bitiş Tarihi (Opsiyonel)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || formData.daysOfWeek.length === 0}
                  className="btn btn-primary flex-1"
                >
                  {editingHH ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items Modal */}
      <AnimatePresence>
        {showItemsModal && selectedHH && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowItemsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🏷️ {selectedHH.name} - Özel Ürünler
              </h2>
              <p className="text-gray-500 mb-6">
                Belirli ürünlere özel indirim veya fiyat tanımlayın
              </p>

              {/* Current Items */}
              {selectedHH.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-3">Mevcut Özel Ürünler</h3>
                  <div className="space-y-2">
                    {selectedHH.items.map((item) => (
                      <div
                        key={item.menuItem.id}
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{item.menuItem.name}</span>
                          <span className="text-gray-500 ml-2">
                            (Normal: ₺{item.menuItem.price})
                          </span>
                          {item.specialPrice && (
                            <span className="ml-2 text-green-600 font-bold">
                              → ₺{item.specialPrice}
                            </span>
                          )}
                          {item.discountPercent && (
                            <span className="ml-2 text-red-600 font-bold">
                              → %{item.discountPercent} indirim
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.menuItem.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Items */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Ürün Ekle</h3>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {menuItems
                    .filter((mi) => !selectedHH.items.find((i) => i.menuItem.id === mi.id))
                    .map((menuItem) => (
                      <ItemAddRow
                        key={menuItem.id}
                        menuItem={menuItem}
                        onAdd={handleAddItem}
                      />
                    ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowItemsModal(false);
                  fetchData();
                }}
                className="btn btn-primary w-full mt-6"
              >
                Tamam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Item Add Row Component
function ItemAddRow({
  menuItem,
  onAdd,
}: {
  menuItem: MenuItem;
  onAdd: (id: string, specialPrice?: number, discountPercent?: number) => void;
}) {
  const [mode, setMode] = useState<'none' | 'price' | 'percent'>('none');
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (mode === 'price') {
      onAdd(menuItem.id, Number(value), undefined);
    } else if (mode === 'percent') {
      onAdd(menuItem.id, undefined, Number(value));
    } else {
      onAdd(menuItem.id);
    }
    setMode('none');
    setValue('');
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <span className="font-medium">{menuItem.name}</span>
        <span className="text-gray-500 text-sm ml-2">₺{menuItem.price}</span>
      </div>
      {mode === 'none' ? (
        <div className="flex gap-1">
          <button
            onClick={() => setMode('price')}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Özel Fiyat
          </button>
          <button
            onClick={() => setMode('percent')}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            % İndirim
          </button>
          <button
            onClick={() => handleAdd()}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            Genel İndirim
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === 'price' ? 'Fiyat' : '%'}
            className="w-20 px-2 py-1 border rounded text-sm"
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!value}
            className="p-1 bg-green-500 text-white rounded disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setMode('none');
              setValue('');
            }}
            className="p-1 bg-gray-500 text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

