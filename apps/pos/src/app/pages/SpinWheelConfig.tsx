// POS — Şans Çarkı yapılandırma sayfası
// Admin slices array'ini düzenler, weight + tip + değer + renk + emoji.

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Slice = {
  label: string;
  weight: number;
  type: 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'POINTS' | 'FREE_ITEM' | 'TRY_AGAIN' | 'NOTHING';
  value: number;
  color: string;
  emoji?: string;
};

type Config = {
  id: string;
  name: string;
  description: string | null;
  cooldownHours: number;
  minCartTotal: number;
  slices: Slice[];
  isActive: boolean;
};

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#06b6d4'];

const TYPE_OPTIONS = [
  { value: 'DISCOUNT_PERCENT', label: '% İndirim Kuponu' },
  { value: 'DISCOUNT_FIXED', label: '₺ Birim İndirim' },
  { value: 'POINTS', label: 'Puan' },
  { value: 'FREE_ITEM', label: 'Ücretsiz Ürün' },
  { value: 'TRY_AGAIN', label: 'Tekrar Dene' },
  { value: 'NOTHING', label: 'Kazanamadı' },
] as const;

export default function SpinWheelConfig() {
  const { token } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [minCartTotal, setMinCartTotal] = useState(0);
  const [name, setName] = useState('HighFive Şans Çarkı');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/games/spin/config', token!);
      if (r.config) {
        setConfig(r.config);
        setSlices((r.config.slices ?? []).map((s: any) => ({
          label: s.label ?? '',
          weight: s.weight ?? 10, // weight gizleniyor backend'te — varsayılan
          type: s.type ?? 'DISCOUNT_PERCENT',
          value: s.value ?? 0,
          color: s.color ?? '#ef4444',
          emoji: s.emoji ?? '🎁',
        })));
        setCooldownHours(r.config.cooldownHours ?? 24);
        setMinCartTotal(r.config.minCartTotal ?? 0);
        setName(r.config.name ?? 'HighFive Şans Çarkı');
        setDescription(r.config.description ?? '');
      }
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

  const addSlice = () => {
    setSlices((s) => [
      ...s,
      {
        label: 'Yeni Ödül',
        weight: 10,
        type: 'DISCOUNT_PERCENT',
        value: 5,
        color: PRESET_COLORS[s.length % PRESET_COLORS.length],
        emoji: '🎁',
      },
    ]);
  };

  const updateSlice = (idx: number, patch: Partial<Slice>) => {
    setSlices((s) => s.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const removeSlice = (idx: number) => {
    setSlices((s) => s.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (slices.length < 2) {
      alert('En az 2 dilim gerekli');
      return;
    }
    const totalWeight = slices.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight <= 0) {
      alert('Toplam weight 0\'dan büyük olmalı');
      return;
    }
    setSaving(true);
    try {
      await api.post(
        '/api/games/spin/config',
        {
          name,
          description,
          cooldownHours,
          minCartTotal,
          slices,
          isActive,
        },
        token!,
      );
      await refresh();
      alert('Kaydedildi ✅');
    } catch (e: any) {
      alert('Kaydedilemedi: ' + (e?.message ?? 'hata'));
    } finally {
      setSaving(false);
    }
  };

  const totalWeight = slices.reduce((sum, s) => sum + s.weight, 0);

  if (loading) {
    return (
      <div className="p-6 text-foreground-muted">Yükleniyor...</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            🎡 Şans Çarkı Yapılandırma
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Müşterilerin günde 1 kez çevirdiği çarkın dilimlerini, ağırlıklarını ve ödüllerini düzenle.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="btn btn-secondary flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Genel ayarlar */}
      <div className="rounded-2xl bg-white p-5 shadow-card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold mb-1 block">Çark Adı</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Açıklama</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Cooldown (saat)</label>
          <input type="number" min={1} value={cooldownHours} onChange={(e) => setCooldownHours(Number(e.target.value))} className="input w-full" />
          <p className="text-[11px] text-foreground-muted mt-1">24 = günde 1, 12 = 12 saatte 1 vs.</p>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block">Min Sepet Tutarı (₺)</label>
          <input type="number" min={0} value={minCartTotal} onChange={(e) => setMinCartTotal(Number(e.target.value))} className="input w-full" />
          <p className="text-[11px] text-foreground-muted mt-1">0 = sepet şartı yok.</p>
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm font-semibold">Aktif (müşteriler şu an çark çevirebilir)</span>
          </label>
        </div>
      </div>

      {/* Dilimler */}
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Dilimler ({slices.length})</h2>
            <p className="text-xs text-foreground-muted">
              Toplam ağırlık: <span className="font-bold">{totalWeight}</span> — her dilim göreceli olasılığını belirler (yüksek weight = daha sık çıkar).
            </p>
          </div>
          <button onClick={addSlice} className="btn btn-secondary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Dilim Ekle
          </button>
        </div>

        {slices.length === 0 ? (
          <div className="text-center text-foreground-muted text-sm py-8">
            Henüz dilim yok. "Dilim Ekle" ile başla.
          </div>
        ) : (
          <div className="space-y-3">
            {slices.map((slice, idx) => {
              const percent = totalWeight > 0 ? ((slice.weight / totalWeight) * 100).toFixed(1) : '0';
              return (
                <div key={idx} className="rounded-xl border-2 p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end" style={{ borderColor: slice.color }}>
                  {/* Renk önizleme */}
                  <div className="md:col-span-1 flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: slice.color }}>
                      {slice.emoji}
                    </div>
                  </div>

                  {/* Etiket */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Etiket</label>
                    <input
                      value={slice.label}
                      onChange={(e) => updateSlice(idx, { label: e.target.value })}
                      className="input w-full text-sm"
                      placeholder="örn: %10 İndirim"
                    />
                  </div>

                  {/* Tip */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Tip</label>
                    <select
                      value={slice.type}
                      onChange={(e) => updateSlice(idx, { type: e.target.value as Slice['type'] })}
                      className="input w-full text-sm"
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Değer */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Değer</label>
                    <input
                      type="number"
                      min={0}
                      value={slice.value}
                      onChange={(e) => updateSlice(idx, { value: Number(e.target.value) })}
                      className="input w-full text-sm"
                    />
                  </div>

                  {/* Weight */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Weight</label>
                    <input
                      type="number"
                      min={0}
                      value={slice.weight}
                      onChange={(e) => updateSlice(idx, { weight: Number(e.target.value) })}
                      className="input w-full text-sm"
                    />
                    <p className="text-[9px] text-foreground-muted mt-0.5">≈ %{percent}</p>
                  </div>

                  {/* Emoji */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Emoji</label>
                    <input
                      value={slice.emoji ?? ''}
                      onChange={(e) => updateSlice(idx, { emoji: e.target.value })}
                      className="input w-full text-center text-base"
                      maxLength={2}
                    />
                  </div>

                  {/* Renk */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-foreground-muted mb-0.5 block">Renk</label>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateSlice(idx, { color: c })}
                          className="h-6 w-6 rounded-md border-2"
                          style={{
                            backgroundColor: c,
                            borderColor: slice.color === c ? '#000' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Sil */}
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeSlice(idx)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      title="Dilimi sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bilgilendirme */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs text-blue-900">
          💡 <span className="font-bold">Ağırlık (weight) nasıl çalışır?</span> Backend toplam weight'i hesaplar ve weighted random ile dilim seçer.
          Örn: dilim A weight=30, B=10, C=10 → A çıkma şansı 60%, B ve C 20%. Müşteri client-side manipülasyon ile sonuç değiştiremez.
        </p>
      </div>
    </div>
  );
}
