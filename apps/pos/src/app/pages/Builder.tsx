// POS — Pizza & Sandwich Builder yönetimi
// Admin BuilderBase + BuilderIngredient ekler, layer image upload eder.

import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Save, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Base = {
  id: string;
  type: 'PIZZA' | 'SANDWICH';
  name: string;
  description: string | null;
  basePrice: number | string;
  baseImage: string;
  sortOrder: number;
  isActive: boolean;
};

type Ingredient = {
  id: string;
  type: 'PIZZA' | 'SANDWICH';
  category: string;
  name: string;
  description: string | null;
  extraPrice: number | string;
  layerImage: string;
  layerOrder: number;
  sortOrder: number;
  isActive: boolean;
};

const CATEGORIES = [
  { value: 'BASE_SAUCE', label: 'Taban Sosu', layerDefault: 1 },
  { value: 'CHEESE', label: 'Peynir', layerDefault: 2 },
  { value: 'MEAT', label: 'Et', layerDefault: 3 },
  { value: 'VEGETABLE', label: 'Sebze / Mantar', layerDefault: 4 },
  { value: 'TOP_SAUCE', label: 'Üst Sos', layerDefault: 5 },
  { value: 'EXTRA', label: 'Ekstra', layerDefault: 6 },
  { value: 'DOUGH', label: 'Hamur ek', layerDefault: 0 },
];

export default function BuilderAdmin() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'bases' | 'ingredients'>('bases');
  const [bases, setBases] = useState<Base[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBase, setEditingBase] = useState<Partial<Base> | null>(null);
  const [editingIng, setEditingIng] = useState<Partial<Ingredient> | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'PIZZA' | 'SANDWICH'>('ALL');
  const [filterCat, setFilterCat] = useState<string>('ALL');

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/builder/admin/list', token!);
      setBases(r.bases ?? []);
      setIngredients(r.ingredients ?? []);
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

  const filteredBases = bases.filter((b) => filterType === 'ALL' || b.type === filterType);
  const filteredIngs = ingredients.filter((i) => {
    if (filterType !== 'ALL' && i.type !== filterType) return false;
    if (filterCat !== 'ALL' && i.category !== filterCat) return false;
    return true;
  });

  const saveBase = async () => {
    if (!editingBase?.name || !editingBase.basePrice || !editingBase.baseImage || !editingBase.type) {
      alert('type, ad, fiyat ve görsel gerekli');
      return;
    }
    try {
      await api.post('/api/builder/bases', editingBase, token!);
      setEditingBase(null);
      await refresh();
    } catch (e: any) {
      alert('Hata: ' + (e?.message ?? 'kayıt başarısız'));
    }
  };

  const saveIng = async () => {
    if (!editingIng?.name || !editingIng.category || !editingIng.layerImage || !editingIng.type) {
      alert('type, kategori, ad, görsel gerekli');
      return;
    }
    try {
      await api.post('/api/builder/ingredients', editingIng, token!);
      setEditingIng(null);
      await refresh();
    } catch (e: any) {
      alert('Hata: ' + (e?.message ?? 'kayıt başarısız'));
    }
  };

  const deleteBase = async (id: string) => {
    if (!window.confirm('Bu tabanı silmek istiyor musun?')) return;
    try {
      await api.delete(`/api/builder/bases/${id}`, token!);
      await refresh();
    } catch (e: any) {
      alert('Silinemedi: ' + (e?.message ?? 'hata'));
    }
  };

  const deleteIng = async (id: string) => {
    if (!window.confirm('Bu malzemeyi silmek istiyor musun?')) return;
    try {
      await api.delete(`/api/builder/ingredients/${id}`, token!);
      await refresh();
    } catch (e: any) {
      alert('Silinemedi: ' + (e?.message ?? 'hata'));
    }
  };

  if (loading) return <div className="p-6 text-foreground-muted">Yükleniyor...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            🍕 Pizza & Sandwich Builder
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Müşterilerin kendi pizzasını/sandviçini tasarlamasına izin verir. Taban (hamur/ekmek)
            ve malzemeler tanımla; her malzemenin transparent PNG layer görseli olmalı.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl bg-white p-4 shadow-card flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">
            Ürün Tipi
          </label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="input">
            <option value="ALL">Hepsi</option>
            <option value="PIZZA">🍕 Pizza</option>
            <option value="SANDWICH">🥪 Sandviç</option>
          </select>
        </div>
        {tab === 'ingredients' && (
          <div>
            <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">
              Kategori
            </label>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input">
              <option value="ALL">Tüm kategoriler</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-light">
        <button
          onClick={() => setTab('bases')}
          className={`px-4 py-2 font-semibold ${
            tab === 'bases'
              ? 'text-primary-600 border-b-2 border-primary-500'
              : 'text-foreground-muted'
          }`}
        >
          Tabanlar ({bases.length})
        </button>
        <button
          onClick={() => setTab('ingredients')}
          className={`px-4 py-2 font-semibold ${
            tab === 'ingredients'
              ? 'text-primary-600 border-b-2 border-primary-500'
              : 'text-foreground-muted'
          }`}
        >
          Malzemeler ({ingredients.length})
        </button>
      </div>

      {/* BASES TAB */}
      {tab === 'bases' && (
        <div>
          <button
            onClick={() => setEditingBase({ type: 'PIZZA', isActive: true, sortOrder: 0 })}
            className="btn btn-primary flex items-center gap-2 mb-4"
          >
            <Plus className="h-4 w-4" />
            Yeni Taban
          </button>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            {filteredBases.length === 0 ? (
              <p className="text-center text-foreground-muted py-8">Taban yok</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredBases.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-xl border-2 p-3 ${
                      b.isActive ? 'border-primary-200 bg-primary-50/30' : 'border-border-light opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface flex items-center justify-center flex-shrink-0">
                        {b.baseImage ? (
                          <img src={b.baseImage} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{b.type === 'PIZZA' ? '🍕' : '🥪'}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{b.name}</p>
                        <p className="text-[11px] text-foreground-muted">
                          {b.type === 'PIZZA' ? '🍕 Pizza' : '🥪 Sandviç'} · {Number(b.basePrice).toFixed(2)} ₺
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setEditingBase(b)}
                            className="text-[11px] text-primary-600 font-semibold"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => deleteBase(b.id)}
                            className="text-[11px] text-red-600 font-semibold"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INGREDIENTS TAB */}
      {tab === 'ingredients' && (
        <div>
          <button
            onClick={() =>
              setEditingIng({
                type: 'PIZZA',
                category: 'CHEESE',
                isActive: true,
                sortOrder: 0,
                layerOrder: 2,
                extraPrice: 0,
              })
            }
            className="btn btn-primary flex items-center gap-2 mb-4"
          >
            <Plus className="h-4 w-4" />
            Yeni Malzeme
          </button>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            {filteredIngs.length === 0 ? (
              <p className="text-center text-foreground-muted py-8">Malzeme yok</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredIngs.map((i) => (
                  <div
                    key={i.id}
                    className={`rounded-xl border-2 p-3 ${
                      i.isActive ? 'border-amber-200 bg-amber-50/30' : 'border-border-light opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-14 h-14 rounded bg-surface flex items-center justify-center flex-shrink-0">
                        {i.layerImage ? (
                          <img src={i.layerImage} alt={i.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">🍽️</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{i.name}</p>
                        <p className="text-[10px] text-foreground-muted truncate">
                          {i.type === 'PIZZA' ? '🍕' : '🥪'} · {CATEGORIES.find((c) => c.value === i.category)?.label ?? i.category}
                        </p>
                        <p className="text-[10px] text-primary-600 font-bold">
                          +{Number(i.extraPrice).toFixed(2)} ₺
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setEditingIng(i)}
                        className="text-[11px] text-primary-600 font-semibold"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => deleteIng(i.id)}
                        className="text-[11px] text-red-600 font-semibold"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BASE EDIT MODAL */}
      {editingBase && (
        <EditModal
          title={editingBase.id ? 'Taban Düzenle' : 'Yeni Taban'}
          onClose={() => setEditingBase(null)}
          onSave={saveBase}
          token={token!}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">Tip</label>
              <select
                value={editingBase.type ?? 'PIZZA'}
                onChange={(e) => setEditingBase({ ...editingBase, type: e.target.value as any })}
                className="input w-full"
              >
                <option value="PIZZA">🍕 Pizza</option>
                <option value="SANDWICH">🥪 Sandviç</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Sıra</label>
              <input
                type="number"
                value={editingBase.sortOrder ?? 0}
                onChange={(e) => setEditingBase({ ...editingBase, sortOrder: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Ad</label>
            <input
              value={editingBase.name ?? ''}
              onChange={(e) => setEditingBase({ ...editingBase, name: e.target.value })}
              className="input w-full"
              placeholder="örn. İnce Hamur"
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Açıklama</label>
            <input
              value={editingBase.description ?? ''}
              onChange={(e) => setEditingBase({ ...editingBase, description: e.target.value })}
              className="input w-full"
              placeholder="opsiyonel"
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Fiyat (₺)</label>
            <input
              type="number"
              step="0.5"
              value={editingBase.basePrice ?? 100}
              onChange={(e) => setEditingBase({ ...editingBase, basePrice: Number(e.target.value) })}
              className="input w-full"
            />
          </div>
          <ImageUploadField
            label="Taban Görseli (yuvarlak pizza veya dikdörtgen ekmek)"
            value={(editingBase.baseImage as string) ?? ''}
            onChange={(url) => setEditingBase({ ...editingBase, baseImage: url })}
            token={token!}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editingBase.isActive ?? true}
              onChange={(e) => setEditingBase({ ...editingBase, isActive: e.target.checked })}
            />
            <span className="text-sm">Aktif</span>
          </label>
        </EditModal>
      )}

      {/* INGREDIENT EDIT MODAL */}
      {editingIng && (
        <EditModal
          title={editingIng.id ? 'Malzeme Düzenle' : 'Yeni Malzeme'}
          onClose={() => setEditingIng(null)}
          onSave={saveIng}
          token={token!}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">Tip</label>
              <select
                value={editingIng.type ?? 'PIZZA'}
                onChange={(e) => setEditingIng({ ...editingIng, type: e.target.value as any })}
                className="input w-full"
              >
                <option value="PIZZA">🍕 Pizza</option>
                <option value="SANDWICH">🥪 Sandviç</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Kategori</label>
              <select
                value={editingIng.category ?? 'CHEESE'}
                onChange={(e) => {
                  const cat = e.target.value;
                  const def = CATEGORIES.find((c) => c.value === cat);
                  setEditingIng({
                    ...editingIng,
                    category: cat,
                    layerOrder: editingIng.layerOrder ?? def?.layerDefault ?? 5,
                  });
                }}
                className="input w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">Ad</label>
            <input
              value={editingIng.name ?? ''}
              onChange={(e) => setEditingIng({ ...editingIng, name: e.target.value })}
              className="input w-full"
              placeholder="örn. Mozzarella"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">Ek Fiyat (₺)</label>
              <input
                type="number"
                step="0.5"
                value={editingIng.extraPrice ?? 0}
                onChange={(e) => setEditingIng({ ...editingIng, extraPrice: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Layer Sırası</label>
              <input
                type="number"
                value={editingIng.layerOrder ?? 5}
                onChange={(e) => setEditingIng({ ...editingIng, layerOrder: Number(e.target.value) })}
                className="input w-full"
              />
              <p className="text-[9px] text-foreground-muted mt-0.5">Küçük = altta</p>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Sıra</label>
              <input
                type="number"
                value={editingIng.sortOrder ?? 0}
                onChange={(e) => setEditingIng({ ...editingIng, sortOrder: Number(e.target.value) })}
                className="input w-full"
              />
            </div>
          </div>
          <ImageUploadField
            label="Layer Görseli (Transparent PNG)"
            value={(editingIng.layerImage as string) ?? ''}
            onChange={(url) => setEditingIng({ ...editingIng, layerImage: url })}
            token={token!}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editingIng.isActive ?? true}
              onChange={(e) => setEditingIng({ ...editingIng, isActive: e.target.checked })}
            />
            <span className="text-sm">Aktif</span>
          </label>
        </EditModal>
      )}
    </div>
  );
}

function EditModal({
  title,
  children,
  onClose,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  token: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b p-5 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t p-5 sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn btn-secondary">İptal</button>
          <button onClick={onSave} className="btn btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  token,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  token: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.upload('/api/upload', file, token);
      const url = result?.file?.url || result?.url;
      if (url) onChange(url);
    } catch (err: any) {
      alert('Yükleme başarısız: ' + (err?.message ?? 'hata'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="text-xs font-semibold mb-1 block">{label}</label>
      <div className="flex gap-3 items-start">
        {value ? (
          <div className="relative">
            <img src={value} alt="" className="w-24 h-24 rounded-xl object-cover border border-border-light" />
            <button
              onClick={() => onChange('')}
              className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5"
            >
              Sil
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-[10px] text-foreground-muted">Yükleniyor...</span>
            ) : (
              <>
                <Upload className="h-5 w-5 text-foreground-muted" />
                <span className="text-[10px] text-foreground-muted mt-1">Yükle</span>
              </>
            )}
          </button>
        )}
        <div className="flex-1">
          <p className="text-[11px] text-foreground-muted">
            Pizza için yuvarlak transparent PNG (320x320), sandviç için dikdörtgen.
          </p>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="veya URL yapıştır (data:image/svg+xml; veya /uploads/...)"
            className="input w-full text-xs mt-1"
          />
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
      </div>
    </div>
  );
}
