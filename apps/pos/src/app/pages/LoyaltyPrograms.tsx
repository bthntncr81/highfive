// POS — Sadakat Programları yönetim sayfası
// 12+ farklı program türü, her biri için template + kural editörü

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Plus, Trash2, Edit2, Power, X, Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type ProgramType =
  | 'BASIC_POINTS' | 'STAMP_CARD' | 'BIRTHDAY' | 'WELCOME'
  | 'REFERRAL' | 'MILESTONE' | 'STREAK' | 'CASHBACK'
  | 'PRODUCT_VIP' | 'HAPPY_HOUR_POINTS' | 'SOCIAL' | 'TIER_DISCOUNT';

type Program = {
  id: string;
  type: ProgramType;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  config: any;
  tierConfig: any;
  applicableMenuItemIds: string[];
  applicableCategoryIds: string[];
  rewardMenuItemIds: string[];
  rewardCategoryIds: string[];
  createdAt: string;
};

type Templates = Record<ProgramType, {
  name: string;
  description: string;
  icon: string;
  color: string;
  config: any;
}>;

const TYPE_LABELS: Record<ProgramType, string> = {
  BASIC_POINTS: '⭐ Klasik Puan',
  STAMP_CARD: '🎫 Damga Kartı',
  BIRTHDAY: '🎂 Doğum Günü',
  WELCOME: '👋 Hoş Geldin',
  REFERRAL: '🤝 Davet',
  MILESTONE: '🎯 Sipariş Milestones',
  STREAK: '🔥 Süreklilik',
  CASHBACK: '💰 Cashback',
  PRODUCT_VIP: '🏆 Ürün VIP',
  HAPPY_HOUR_POINTS: '⏰ Saat Bonusu',
  SOCIAL: '📱 Sosyal Puan',
  TIER_DISCOUNT: '💎 Tier Indirimi',
};

export default function LoyaltyPrograms() {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [progsRes, tmplRes, menuRes] = await Promise.all([
        api.get('/api/loyalty/programs', token!),
        api.get('/api/loyalty/programs/templates', token!),
        api.get('/api/menu', token!),
      ]);
      setPrograms(progsRes.programs ?? []);
      setTemplates(tmplRes.templates ?? null);
      setMenuItems(menuRes.items ?? []);
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

  const createFromTemplate = async (type: ProgramType) => {
    if (!templates) return;
    const tpl = templates[type];
    try {
      const res = await api.post(
        '/api/loyalty/programs',
        {
          type,
          name: tpl.name,
          description: tpl.description,
          icon: tpl.icon,
          color: tpl.color,
          config: tpl.config,
          isActive: false, // taslak olarak aç
        },
        token!,
      );
      setShowTypePicker(false);
      setEditingProgram(res.program);
      refresh();
    } catch (e: any) {
      alert('Oluşturulamadı: ' + (e?.message ?? 'hata'));
    }
  };

  const toggleActive = async (p: Program) => {
    try {
      await api.post(`/api/loyalty/programs/${p.id}/toggle`, {}, token!);
      refresh();
    } catch (e: any) {
      alert(e?.message ?? 'hata');
    }
  };

  const deleteProgram = async (p: Program) => {
    if (!window.confirm(`"${p.name}" silinsin mi?`)) return;
    try {
      await api.delete(`/api/loyalty/programs/${p.id}`, token!);
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
            <Sparkles className="h-7 w-7 text-purple-500" />
            Sadakat Programları
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            12+ farklı sadakat türü — Domino's, McDonald's, Burger King tarzı zengin sadakat sistemi
          </p>
        </div>
        <button
          onClick={() => setShowTypePicker(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-semibold text-white shadow-card hover:bg-purple-600 transition"
        >
          <Plus className="h-5 w-5" />
          Yeni Program
        </button>
      </div>

      {loading ? (
        <p className="text-foreground-muted">Yükleniyor...</p>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <Sparkles className="h-12 w-12 text-purple-300 mx-auto mb-3" />
          <h3 className="font-bold text-lg">Henüz program yok</h3>
          <p className="text-sm text-foreground-muted mb-4">
            Sadakat sistemini güçlendirmek için ilk programını ekle
          </p>
          <button
            onClick={() => setShowTypePicker(true)}
            className="btn btn-primary"
          >
            🚀 İlk programı oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => (
            <motion.div
              key={p.id}
              whileHover={{ y: -2 }}
              className={`relative rounded-2xl border-2 p-5 ${
                p.isActive
                  ? 'border-green-300 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
              style={p.color ? { borderColor: p.isActive ? p.color : undefined } : undefined}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: (p.color ?? '#999') + '20' }}
                >
                  {p.icon || '⭐'}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`p-1.5 rounded-lg transition ${
                      p.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={p.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingProgram(p)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteProgram(p)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs uppercase tracking-wide font-bold text-foreground-muted">
                {TYPE_LABELS[p.type]}
              </p>
              <h3 className="text-lg font-bold mt-1">{p.name}</h3>
              {p.description && (
                <p className="text-sm text-foreground-muted mt-1 line-clamp-2">
                  {p.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  p.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {p.isActive ? '✓ Aktif' : '⏸ Pasif'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Type Picker Modal */}
      {showTypePicker && templates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">Program türü seç</h2>
                <p className="text-sm text-foreground-muted">12 farklı sadakat türü — birleştirip kullanabilirsin</p>
              </div>
              <button onClick={() => setShowTypePicker(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
              {(Object.keys(templates) as ProgramType[]).map((type) => {
                const t = templates[type];
                return (
                  <button
                    key={type}
                    onClick={() => createFromTemplate(type)}
                    className="text-left rounded-2xl border-2 border-gray-200 hover:border-purple-400 p-4 transition group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ backgroundColor: t.color + '20' }}
                      >
                        {t.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-foreground-muted">
                          {type.replace(/_/g, ' ')}
                        </p>
                        <h3 className="font-bold mt-0.5">{t.name}</h3>
                        <p className="text-sm text-foreground-muted mt-1">{t.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingProgram && (
        <ProgramEditor
          program={editingProgram}
          menuItems={menuItems}
          token={token}
          onClose={() => setEditingProgram(null)}
          onSave={() => {
            setEditingProgram(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ==================== PROGRAM EDITOR ====================
function ProgramEditor({
  program,
  menuItems,
  token,
  onClose,
  onSave,
}: {
  program: Program;
  menuItems: any[];
  token: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description ?? '');
  const [icon, setIcon] = useState(program.icon ?? '');
  const [color, setColor] = useState(program.color ?? '#bb1e10');
  const [config, setConfig] = useState<any>(program.config ?? {});
  const [applicableMenuItemIds, setApplicableMenuItemIds] = useState<string[]>(
    program.applicableMenuItemIds ?? [],
  );
  const [rewardMenuItemIds, setRewardMenuItemIds] = useState<string[]>(
    program.rewardMenuItemIds ?? [],
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(
        `/api/loyalty/programs/${program.id}`,
        {
          name, description, icon, color, config,
          applicableMenuItemIds,
          rewardMenuItemIds,
        },
        token!,
      );
      onSave();
    } catch (e: any) {
      alert(e?.message ?? 'hata');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-foreground-muted">
              {TYPE_LABELS[program.type]}
            </p>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">{icon || '⭐'}</span>
              Programı Düzenle
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block">İkon (emoji)</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="input"
                placeholder="🎁"
                maxLength={4}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Renk</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input h-10 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block">Program adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block">Açıklama (mobile'da gözükür)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={2}
            />
          </div>

          {/* Türe özel config editörü */}
          <ConfigEditor
            type={program.type}
            config={config}
            setConfig={setConfig}
            menuItems={menuItems}
            applicableMenuItemIds={applicableMenuItemIds}
            setApplicableMenuItemIds={setApplicableMenuItemIds}
            rewardMenuItemIds={rewardMenuItemIds}
            setRewardMenuItemIds={setRewardMenuItemIds}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-5">
          <button onClick={onClose} className="btn btn-secondary">İptal</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== TÜRE ÖZEL CONFIG EDITOR ====================
const VISUAL_STYLE_OPTIONS = [
  { v: 'auto', label: '🤖 Otomatik (kategoriden algıla)' },
  { v: 'pie', label: '🍕 Pizza dilimleri (pasta için de uygun)' },
  { v: 'stack', label: '🍔 Burger / sandviç katmanları' },
  { v: 'bowl', label: '🍝 Makarna / çorba kâsesi' },
  { v: 'cups', label: '🥤 İçecek / yan ürün dizisi' },
  { v: 'hex', label: '⬡ Genel premium peteği' },
  { v: 'dots', label: '⚪ Klasik damga noktaları' },
];

function ConfigEditor({
  type, config, setConfig, menuItems,
  applicableMenuItemIds, setApplicableMenuItemIds,
  rewardMenuItemIds, setRewardMenuItemIds,
}: {
  type: ProgramType;
  config: any;
  setConfig: (c: any) => void;
  menuItems: any[];
  applicableMenuItemIds: string[];
  setApplicableMenuItemIds: (ids: string[]) => void;
  rewardMenuItemIds: string[];
  setRewardMenuItemIds: (ids: string[]) => void;
}) {
  const update = (k: string, v: any) => setConfig({ ...config, [k]: v });

  switch (type) {
    case 'BASIC_POINTS':
      return (
        <ConfigBlock title="Puan Sistemi Kuralları">
          <NumberField label="Her ₺ harcamada kaç puan?" value={config.pointsPerTL ?? 10}
            onChange={(v) => update('pointsPerTL', v)} suffix="₺ = 1 puan" />
          <NumberField label="100 puan kaç ₺ indirime denk?" value={config.redeemRatio ?? 10}
            onChange={(v) => update('redeemRatio', v)} suffix="₺" />
          <NumberField label="Min puan kullanım" value={config.minRedemption ?? 100}
            onChange={(v) => update('minRedemption', v)} suffix="puan" />
          <NumberField label="Hoş geldin bonusu" value={config.welcomeBonus ?? 50}
            onChange={(v) => update('welcomeBonus', v)} suffix="puan" />
        </ConfigBlock>
      );

    case 'STAMP_CARD':
      return (
        <ConfigBlock title="Damga Kartı Kuralları">
          <NumberField label="Kaç sipariş = 1 ödül?" value={config.stampsRequired ?? 10}
            onChange={(v) => update('stampsRequired', v)} />
          <SelectField label="🎨 Mobile görseli (stamp visual)"
            value={config.visualStyle ?? 'auto'}
            options={VISUAL_STYLE_OPTIONS.map((o) => ({ v: o.v, label: o.label }))}
            onChange={(v) => update('visualStyle', v)} />
          <SelectField label="Ödül türü" value={config.rewardType ?? 'FREE_ITEM'}
            options={[
              { v: 'FREE_ITEM', label: 'Bedava ürün (çoklu seçim)' },
              { v: 'DISCOUNT', label: 'Tutar indirimi' },
            ]}
            onChange={(v) => update('rewardType', v)} />
          {config.rewardType === 'DISCOUNT' && (
            <NumberField label="İndirim tutarı (₺)" value={config.rewardValue ?? 0}
              onChange={(v) => update('rewardValue', v)} suffix="₺" />
          )}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-3">
            <div>
              <p className="text-xs font-bold text-amber-900 mb-1">📥 ALINAN ÜRÜNLER</p>
              <p className="text-[10px] text-amber-700 mb-2">Müşteri bunları sipariş edince damga kazanır (boş = tüm sipariş damga sayar)</p>
              <ItemMultiSelect label=""
                menuItems={menuItems} value={applicableMenuItemIds}
                onChange={setApplicableMenuItemIds} />
            </div>
          </div>
          {config.rewardType === 'FREE_ITEM' && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-3">
              <div>
                <p className="text-xs font-bold text-emerald-900 mb-1">🎁 VERİLEN ÜRÜNLER</p>
                <p className="text-[10px] text-emerald-700 mb-2">Damga dolduğunda müşteri bunlardan birini bedava alır (en az 1 seç)</p>
                <ItemMultiSelect label=""
                  menuItems={menuItems} value={rewardMenuItemIds}
                  onChange={setRewardMenuItemIds} />
              </div>
            </div>
          )}
        </ConfigBlock>
      );

    case 'BIRTHDAY':
      return (
        <ConfigBlock title="Doğum Günü Kuralları">
          <NumberField label="İndirim yüzdesi" value={config.discountPercent ?? 20}
            onChange={(v) => update('discountPercent', v)} suffix="%" />
          <ItemSelectField label="Bedava ürün (opsiyonel)" menuItems={menuItems}
            value={config.freeItemId} onChange={(v) => update('freeItemId', v)} />
          <NumberField label="Kaç gün önce duyurulsun?" value={config.daysBeforeBirthday ?? 0}
            onChange={(v) => update('daysBeforeBirthday', v)} suffix="gün" />
          <NumberField label="Kupon kaç gün geçerli?" value={config.validDays ?? 7}
            onChange={(v) => update('validDays', v)} suffix="gün" />
        </ConfigBlock>
      );

    case 'WELCOME':
      return (
        <ConfigBlock title="Hoş Geldin Kuralları">
          <NumberField label="İlk siparişe indirim" value={config.discountPercent ?? 25}
            onChange={(v) => update('discountPercent', v)} suffix="%" />
          <NumberField label="Bonus puan" value={config.bonusPoints ?? 50}
            onChange={(v) => update('bonusPoints', v)} suffix="puan" />
          <ItemSelectField label="Bedava ürün (opsiyonel)" menuItems={menuItems}
            value={config.freeItemId} onChange={(v) => update('freeItemId', v)} />
        </ConfigBlock>
      );

    case 'REFERRAL':
      return (
        <ConfigBlock title="Davet Kuralları">
          <NumberField label="Davet eden bonusu" value={config.referrerPoints ?? 100}
            onChange={(v) => update('referrerPoints', v)} suffix="puan" />
          <NumberField label="Davet edilenin indirimi" value={config.refereeDiscount ?? 15}
            onChange={(v) => update('refereeDiscount', v)} suffix="%" />
          <NumberField label="Min sipariş tutarı (ödül için)" value={config.minOrderForReward ?? 50}
            onChange={(v) => update('minOrderForReward', v)} suffix="₺" />
        </ConfigBlock>
      );

    case 'CASHBACK':
      return (
        <ConfigBlock title="Cashback Kuralları">
          <NumberField label="Geri ödeme yüzdesi" value={config.cashbackPercent ?? 5}
            onChange={(v) => update('cashbackPercent', v)} suffix="%" />
          <NumberField label="Sipariş başına max" value={config.maxPerOrder ?? 50}
            onChange={(v) => update('maxPerOrder', v)} suffix="₺" />
          <NumberField label="Min sipariş tutarı" value={config.minSpendForReward ?? 0}
            onChange={(v) => update('minSpendForReward', v)} suffix="₺" />
        </ConfigBlock>
      );

    case 'STREAK':
      return (
        <ConfigBlock title="Süreklilik Kuralları">
          <SelectField label="Süreklilik periyodu" value={config.period ?? 'WEEKLY'}
            options={[
              { v: 'DAILY', label: 'Günlük' },
              { v: 'WEEKLY', label: 'Haftalık' },
              { v: 'MONTHLY', label: 'Aylık' },
            ]}
            onChange={(v) => update('period', v)} />
          <NumberField label="Kaç periyot üst üste?" value={config.requiredCount ?? 5}
            onChange={(v) => update('requiredCount', v)} />
          <NumberField label="Bonus puan" value={config.bonusPoints ?? 100}
            onChange={(v) => update('bonusPoints', v)} suffix="puan" />
        </ConfigBlock>
      );

    case 'HAPPY_HOUR_POINTS':
      return (
        <ConfigBlock title="Saat Bonusu Kuralları">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Başlangıç saati" value={config.startHour ?? 14}
              onChange={(v) => update('startHour', v)} />
            <NumberField label="Bitiş saati" value={config.endHour ?? 17}
              onChange={(v) => update('endHour', v)} />
          </div>
          <NumberField label="Puan çarpanı" value={config.multiplier ?? 2}
            onChange={(v) => update('multiplier', v)} suffix="x" />
        </ConfigBlock>
      );

    case 'PRODUCT_VIP':
      return (
        <ConfigBlock title="Ürün VIP Kuralları">
          <NumberField label="Kaç adet gerekli?" value={config.requiredCount ?? 20}
            onChange={(v) => update('requiredCount', v)} suffix="adet" />
          <SelectField label="🎨 Mobile görseli"
            value={config.visualStyle ?? 'auto'}
            options={VISUAL_STYLE_OPTIONS.map((o) => ({ v: o.v, label: o.label }))}
            onChange={(v) => update('visualStyle', v)} />
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-3">
            <p className="text-xs font-bold text-amber-900 mb-1">📥 TAKİP EDİLEN ÜRÜNLER</p>
            <p className="text-[10px] text-amber-700 mb-2">Müşteri bu ürünlerden satın aldıkça sayaç artar</p>
            <ItemMultiSelect label="" menuItems={menuItems}
              value={applicableMenuItemIds} onChange={setApplicableMenuItemIds} />
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-3">
            <p className="text-xs font-bold text-emerald-900 mb-1">🎁 ÖDÜL ÜRÜNLERİ</p>
            <p className="text-[10px] text-emerald-700 mb-2">Hedef tamamlanınca müşteri bunlardan birini bedava alır</p>
            <ItemMultiSelect label="" menuItems={menuItems}
              value={rewardMenuItemIds} onChange={setRewardMenuItemIds} />
          </div>
        </ConfigBlock>
      );

    case 'MILESTONE':
      return (
        <ConfigBlock title="Milestone Kuralları">
          <p className="text-xs text-foreground-muted">
            JSON olarak düzenle (gelişmiş): { '{ "milestones": [{ "orderCount": 5, "discountPercent": 20 }] }' }
          </p>
          <textarea
            value={JSON.stringify(config, null, 2)}
            onChange={(e) => {
              try { setConfig(JSON.parse(e.target.value)); } catch {}
            }}
            className="input font-mono text-xs h-48"
          />
        </ConfigBlock>
      );

    case 'SOCIAL':
      return (
        <ConfigBlock title="Sosyal Puan Kuralları">
          <p className="text-xs text-foreground-muted">
            Platform listesini JSON ile düzenle:
          </p>
          <textarea
            value={JSON.stringify(config, null, 2)}
            onChange={(e) => {
              try { setConfig(JSON.parse(e.target.value)); } catch {}
            }}
            className="input font-mono text-xs h-48"
          />
        </ConfigBlock>
      );

    case 'TIER_DISCOUNT':
      return (
        <ConfigBlock title="Tier Indirimi">
          <p className="text-sm text-foreground-muted">
            Bu program her zaman aktif olur — Tier indirimi otomatik uygulanır
            (Tier ayarları için Sadakat → Tier sekmesi).
          </p>
        </ConfigBlock>
      );

    default:
      return (
        <textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => {
            try { setConfig(JSON.parse(e.target.value)); } catch {}
          }}
          className="input font-mono text-xs h-32"
        />
      );
  }
}

function ConfigBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 space-y-3">
      <h4 className="font-bold text-purple-900 text-sm">{title}</h4>
      {children}
    </div>
  );
}

function NumberField({
  label, value, onChange, suffix,
}: {
  label: string; value: number; onChange: (n: number) => void; suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input flex-1"
        />
        {suffix && <span className="text-xs text-foreground-muted whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ItemSelectField({
  label, value, menuItems, onChange,
}: {
  label: string; value?: string; menuItems: any[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1 block">{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="input">
        <option value="">— Seç —</option>
        {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  );
}

function ItemMultiSelect({
  label, value, menuItems, onChange,
}: {
  label: string; value: string[]; menuItems: any[]; onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1 block">{label}</label>
      <select
        multiple
        value={value}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
        className="input h-32"
      >
        {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <p className="text-[10px] text-foreground-muted mt-1">Cmd/Ctrl + tık ile çoklu seç</p>
    </div>
  );
}
