// POS — Achievement yönetim sayfası
// Admin yeni rozet tanımlayabilir, mevcutları aktive/pasive edebilir.

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Ach = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  criteria: any;
  rewardPoints: number;
  sortOrder: number;
  isActive: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  ORDER_COUNT: 'Sipariş Sayısı',
  TOTAL_SPENT: 'Toplam Harcama (₺)',
  STREAK: 'Streak (Gün)',
  REFERRAL_COUNT: 'Davet Sayısı',
  CATEGORY_MASTER: 'Kategori Ustası',
  TIME_BASED: 'Zaman Bazlı',
  SPIN_WIN: 'Çark Ödülü',
};

function CriteriaEditor({ type, value, onChange }: { type: string; value: any; onChange: (v: any) => void }) {
  if (type === 'ORDER_COUNT' || type === 'TOTAL_SPENT' || type === 'REFERRAL_COUNT') {
    return (
      <div>
        <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Eşik (threshold)</label>
        <input
          type="number"
          value={value?.threshold ?? 0}
          onChange={(e) => onChange({ ...value, threshold: Number(e.target.value) })}
          className="input w-full text-sm"
        />
      </div>
    );
  }
  if (type === 'STREAK') {
    return (
      <div>
        <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Gün</label>
        <input
          type="number"
          value={value?.days ?? 7}
          onChange={(e) => onChange({ ...value, days: Number(e.target.value) })}
          className="input w-full text-sm"
        />
      </div>
    );
  }
  if (type === 'CATEGORY_MASTER') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Kategori ID</label>
          <input
            value={value?.categoryId ?? ''}
            onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
            className="input w-full text-sm"
            placeholder="cat-pizza"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Adet</label>
          <input
            type="number"
            value={value?.count ?? 10}
            onChange={(e) => onChange({ ...value, count: Number(e.target.value) })}
            className="input w-full text-sm"
          />
        </div>
      </div>
    );
  }
  if (type === 'TIME_BASED') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Başlangıç Saat</label>
          <input
            type="number"
            min={0}
            max={23}
            value={value?.hourStart ?? 6}
            onChange={(e) => onChange({ ...value, hourStart: Number(e.target.value) })}
            className="input w-full text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Bitiş Saat</label>
          <input
            type="number"
            min={0}
            max={26}
            value={value?.hourEnd ?? 11}
            onChange={(e) => onChange({ ...value, hourEnd: Number(e.target.value) })}
            className="input w-full text-sm"
          />
          <p className="text-[9px] text-foreground-muted mt-0.5">24+ ertesi gün</p>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Adet</label>
          <input
            type="number"
            value={value?.count ?? 5}
            onChange={(e) => onChange({ ...value, count: Number(e.target.value) })}
            className="input w-full text-sm"
          />
        </div>
      </div>
    );
  }
  if (type === 'SPIN_WIN') {
    return (
      <div>
        <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Min İndirim (%)</label>
        <input
          type="number"
          value={value?.minDiscount ?? 15}
          onChange={(e) => onChange({ ...value, minDiscount: Number(e.target.value) })}
          className="input w-full text-sm"
        />
      </div>
    );
  }
  return null;
}

export default function AchievementsAdmin() {
  const { token } = useAuth();
  const [items, setItems] = useState<Ach[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Ach> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/games/achievements', token!);
      if (r?.achievements) setItems(r.achievements);
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

  const startNew = () => {
    setEditing({
      key: '',
      name: '',
      description: '',
      icon: '🏅',
      type: 'ORDER_COUNT',
      criteria: { threshold: 1 },
      rewardPoints: 50,
      sortOrder: items.length + 1,
      isActive: true,
    });
  };

  const save = async () => {
    if (!editing?.key || !editing.name) {
      alert('Key ve isim zorunlu');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/games/achievements', editing, token!);
      setEditing(null);
      await refresh();
    } catch (e: any) {
      alert('Kaydedilemedi: ' + (e?.message ?? 'hata'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            🏅 Rozet Yönetimi
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Müşterilerin kazanabileceği rozetleri tanımla. Sipariş tamamlandığında otomatik unlock olur.
          </p>
        </div>
        <button onClick={startNew} className="btn btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Rozet
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card">
        {loading ? (
          <p className="text-foreground-muted">Yükleniyor...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-foreground-muted py-8">
            Henüz rozet yok. "Yeni Rozet" ile ekle.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border-2 p-3 ${
                  a.isActive ? 'border-amber-200 bg-amber-50' : 'border-border-light bg-surface opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{a.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{a.name}</p>
                    <p className="text-[11px] text-foreground-muted">{a.description}</p>
                    <p className="text-[10px] mt-1 text-amber-700 font-semibold uppercase">
                      {TYPE_LABELS[a.type] ?? a.type}
                    </p>
                    {a.rewardPoints > 0 && (
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        +{a.rewardPoints} puan ödül
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b p-5 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">🏅 Rozet</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Key (unique)</label>
                  <input
                    value={editing.key ?? ''}
                    onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                    className="input w-full"
                    placeholder="first_order"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Emoji</label>
                  <input
                    value={editing.icon ?? '🏅'}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    className="input w-full text-center text-lg"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">İsim</label>
                <input
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="input w-full"
                  placeholder="İlk Sipariş"
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Açıklama</label>
                <input
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="input w-full"
                  placeholder="Hesap açtıktan sonra ilk siparişini ver"
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Tip</label>
                <select
                  value={editing.type ?? 'ORDER_COUNT'}
                  onChange={(e) =>
                    setEditing({ ...editing, type: e.target.value, criteria: {} })
                  }
                  className="input w-full"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-[11px] font-bold uppercase text-amber-900 mb-2">Kriterler</p>
                <CriteriaEditor
                  type={editing.type ?? 'ORDER_COUNT'}
                  value={editing.criteria ?? {}}
                  onChange={(v) => setEditing({ ...editing, criteria: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Ödül Puan</label>
                  <input
                    type="number"
                    value={editing.rewardPoints ?? 0}
                    onChange={(e) => setEditing({ ...editing, rewardPoints: Number(e.target.value) })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Sıra</label>
                  <input
                    type="number"
                    value={editing.sortOrder ?? 0}
                    onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                    className="input w-full"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive ?? true}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <span className="text-sm">Aktif</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t p-5 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="btn btn-secondary">İptal</button>
              <button
                onClick={save}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
