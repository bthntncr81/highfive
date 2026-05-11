// POS — Opsiyon Grupları yönetim sayfası (reusable bundle option groups)
// Pizza Seçimi, İçecek Seçimi gibi gruplar oluştur, her ürüne ek fiyat ata,
// sonra bu grupları paket menülere ata.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, X, Check, Package, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type MenuItem = { id: string; name: string; price: string; image?: string | null };

type OptionGroupItem = {
  id: string;
  menuItemId: string;
  extraPrice: string | number;
  sortOrder: number;
  isDefault: boolean;
  menuItem: MenuItem;
};

type OptionGroup = {
  id: string;
  name: string;
  description: string | null;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  items: OptionGroupItem[];
  _count?: { assignments: number };
};

export default function OptionGroups() {
  const { token } = useAuth();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OptionGroup | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [g, m] = await Promise.all([
        api.get('/api/option-groups', token!),
        api.get('/api/menu', token!),
      ]);
      setGroups(g.groups ?? []);
      setMenuItems(m.items ?? []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createGroup = async () => {
    const name = window.prompt('Yeni grup adı (örn: Pizza Seçimi)');
    if (!name?.trim()) return;
    try {
      const res = await api.post(
        '/api/option-groups',
        { name: name.trim(), minSelect: 1, maxSelect: 1 },
        token!,
      );
      setEditing(res.group);
      refresh();
    } catch (e: any) {
      alert('Oluşturulamadı: ' + (e?.message ?? 'hata'));
    }
  };

  const deleteGroup = async (g: OptionGroup) => {
    if (g._count?.assignments && g._count.assignments > 0) {
      if (!window.confirm(`Bu grup ${g._count.assignments} pakete atanmış. Silmek isterseniz tüm atamalar da kalkar. Devam?`)) return;
    } else {
      if (!window.confirm(`"${g.name}" silinsin mi?`)) return;
    }
    try {
      await api.delete(`/api/option-groups/${g.id}`, token!);
      refresh();
    } catch (e: any) {
      alert(e?.message ?? 'hata');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Package className="h-7 w-7 text-amber-500" />
            Opsiyon Grupları
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Pizza Seçimi, İçecek Seçimi gibi opsiyon grupları oluştur — her ürüne ek fiyat ata,
            sonra paket menülere ata.
          </p>
        </div>
        <button
          onClick={createGroup}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white shadow-card hover:bg-amber-600 transition"
        >
          <Plus className="h-5 w-5" />
          Yeni Grup
        </button>
      </div>

      {loading ? (
        <p className="text-foreground-muted">Yükleniyor...</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <Package className="h-12 w-12 text-amber-300 mx-auto mb-3" />
          <h3 className="font-bold text-lg">Henüz grup yok</h3>
          <p className="text-sm text-foreground-muted mb-4">
            Paket menülere ekleyebileceğin opsiyon grupları oluştur
          </p>
          <button onClick={createGroup} className="btn btn-primary">
            🚀 İlk grubu oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <motion.div
              key={g.id}
              whileHover={{ y: -2 }}
              className="rounded-2xl border-2 border-amber-200 bg-white p-5 cursor-pointer"
              onClick={() => setEditing(g)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  📋 {g.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGroup(g);
                  }}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-foreground-muted space-y-1">
                <p>📦 {g.items.length} ürün</p>
                <p>🎯 Seçim: {g.minSelect === g.maxSelect ? `${g.minSelect}` : `${g.minSelect}-${g.maxSelect}`} ürün</p>
                <p>📌 Atama: {g._count?.assignments ?? 0} pakete eklendi</p>
              </div>
              <div className="mt-3 flex items-center justify-end text-xs text-amber-600 font-semibold">
                Düzenle <ChevronRight className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {editing && (
        <GroupEditor
          group={editing}
          menuItems={menuItems}
          token={token!}
          onClose={() => setEditing(null)}
          onSave={refresh}
        />
      )}
    </div>
  );
}

function GroupEditor({
  group,
  menuItems,
  token,
  onClose,
  onSave,
}: {
  group: OptionGroup;
  menuItems: MenuItem[];
  token: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [minSelect, setMinSelect] = useState(group.minSelect);
  const [maxSelect, setMaxSelect] = useState(group.maxSelect);
  const [items, setItems] = useState<OptionGroupItem[]>(group.items);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const saveGroup = async () => {
    setSaving(true);
    try {
      await api.patch(
        `/api/option-groups/${group.id}`,
        { name, description, minSelect, maxSelect },
        token,
      );
      onSave();
    } catch (e: any) {
      alert(e?.message ?? 'hata');
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (menuItem: MenuItem) => {
    try {
      const res = await api.post(
        `/api/option-groups/${group.id}/items`,
        { menuItemId: menuItem.id, extraPrice: 0 },
        token,
      );
      setItems((arr) => [...arr.filter((i) => i.menuItemId !== menuItem.id), res.item]);
      setShowAddPicker(false);
      setSearch('');
    } catch (e: any) {
      alert(e?.message ?? 'eklenemedi');
    }
  };

  const updateItemPrice = async (item: OptionGroupItem, extraPrice: number) => {
    setItems((arr) =>
      arr.map((i) => (i.id === item.id ? { ...i, extraPrice } : i)),
    );
    try {
      await api.patch(
        `/api/option-groups/${group.id}/items/${item.id}`,
        { extraPrice },
        token,
      );
    } catch (e: any) {
      alert(e?.message ?? 'kaydedilemedi');
    }
  };

  const removeItem = async (item: OptionGroupItem) => {
    try {
      await api.delete(`/api/option-groups/${group.id}/items/${item.id}`, token);
      setItems((arr) => arr.filter((i) => i.id !== item.id));
    } catch (e: any) {
      alert(e?.message ?? 'silinemedi');
    }
  };

  const filteredAvailable = menuItems
    .filter((mi) => !items.some((i) => i.menuItemId === mi.id))
    .filter((mi) => mi.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b p-5 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            📋 Grup Düzenle
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-semibold mb-1 block">Grup Adı</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="örn: Pizza Seçimi" />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block">Açıklama (opsiyonel)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="örn: Hangi pizzaları istersen seç" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">Min Seçim</label>
              <input type="number" min={0} value={minSelect} onChange={(e) => setMinSelect(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Max Seçim</label>
              <input type="number" min={1} value={maxSelect} onChange={(e) => setMaxSelect(Number(e.target.value))} className="input" />
            </div>
          </div>
          <p className="text-[10px] text-foreground-muted">
            Min = max ise "tam {minSelect} ürün seçmeli". Min &lt; max ise aralık.
          </p>

          {/* Items */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-amber-900">Grup İçindeki Ürünler ({items.length})</h3>
              <button
                onClick={() => setShowAddPicker(true)}
                className="text-xs flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-full font-semibold hover:bg-amber-600"
              >
                <Plus className="h-3 w-3" /> Ürün Ekle
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-amber-700 text-center py-4">
                Henüz ürün eklenmedi. Yukarıdan "Ürün Ekle" ile başla.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-amber-100">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{it.menuItem.name}</p>
                      <p className="text-[10px] text-foreground-muted">
                        Menü fiyatı: {Number(it.menuItem.price).toFixed(2)} ₺
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={Number(it.extraPrice)}
                        onChange={(e) => updateItemPrice(it, Number(e.target.value))}
                        className="w-20 input text-right text-sm"
                      />
                      <span className="text-xs text-foreground-muted">₺ ek</span>
                    </div>
                    <button
                      onClick={() => removeItem(it)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-5 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn btn-secondary">İptal</button>
          <button
            onClick={saveGroup}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        {/* Add picker modal */}
        {showAddPicker && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddPicker(false)}>
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b sticky top-0 bg-white">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ürün ara..."
                  className="input"
                />
              </div>
              <div className="p-2 space-y-1">
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-foreground-muted text-center py-4">
                    Eklenecek ürün yok
                  </p>
                ) : (
                  filteredAvailable.map((mi) => (
                    <button
                      key={mi.id}
                      onClick={() => addItem(mi)}
                      className="w-full flex items-center gap-2 hover:bg-amber-50 p-2 rounded-lg text-left"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{mi.name}</p>
                        <p className="text-[10px] text-foreground-muted">{Number(mi.price).toFixed(2)} ₺</p>
                      </div>
                      <Plus className="h-4 w-4 text-amber-500" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
