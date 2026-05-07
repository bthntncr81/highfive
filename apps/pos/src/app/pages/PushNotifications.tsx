// POS — Push Notifications Yönetim Ekranı
// Müşteri mobil uygulamasına anlık veya zamanlı bildirim gönderir.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Send,
  Clock,
  Smartphone,
  Apple,
  Users,
  Calendar,
  X,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type Notification = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  data?: Record<string, unknown>;
  campaignId?: string | null;
  targetType: 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE' | 'SEGMENT';
  targetIds?: string[];
  segmentCriteria?: any;
  recurrence?: any;
  sentCount: number;
  failedCount: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'RECURRING';
  scheduledAt?: string | null;
  sentAt?: string | null;
  lastSentAt?: string | null;
  createdAt: string;
};

type Customer = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  isVerified: boolean;
  totalPoints: number;
  orderCount: number;
  loyaltyTier?: { name: string; icon: string | null } | null;
};

type Stats = {
  totalDevices: number;
  verifiedDevices: number;
  iosDevices: number;
  androidDevices: number;
  totalSent: number;
  totalScheduled: number;
};

const STATUS_CHIPS: Record<Notification['status'], { label: string; cls: string }> = {
  DRAFT: { label: 'Taslak', cls: 'bg-foreground-subtle/10 text-foreground-muted' },
  SCHEDULED: { label: 'Zamanlandı', cls: 'bg-accent-100 text-accent-700' },
  SENDING: { label: 'Gönderiliyor', cls: 'bg-yellow-100 text-yellow-700' },
  SENT: { label: 'Gönderildi', cls: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Başarısız', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'İptal', cls: 'bg-foreground-subtle/10 text-foreground-muted' },
  RECURRING: { label: '🔁 Tekrarlanan', cls: 'bg-purple-100 text-purple-700' },
};

const TARGET_LABELS = {
  ALL: 'Tüm cihazlar',
  VERIFIED: 'Sadece üye olanlar',
  CUSTOMER: 'Belirli müşteriler',
  DEVICE: 'Belirli cihazlar',
  SEGMENT: 'Davranış segmenti',
};

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function PushNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  // Composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkRoute, setLinkRoute] = useState('');
  const [targetType, setTargetType] = useState<Notification['targetType']>('ALL');
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Segment kriterleri
  const [segMenuItemIds, setSegMenuItemIds] = useState<string[]>([]);
  const [segCategoryIds, setSegCategoryIds] = useState<string[]>([]);
  const [segLastNDays, setSegLastNDays] = useState<number | null>(null);
  const [segDayOfWeek, setSegDayOfWeek] = useState<number | null>(null);
  const [segMinOrderCount, setSegMinOrderCount] = useState<number | null>(null);
  const [segPreview, setSegPreview] = useState<{ count: number; sample: any[] } | null>(null);

  // Zamanlama
  type Schedule = 'NOW' | 'ONCE' | 'RECURRING';
  const [schedule, setSchedule] = useState<Schedule>('NOW');
  const [scheduledAt, setScheduledAt] = useState('');
  const [recType, setRecType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recHour, setRecHour] = useState(18);
  const [recMinute, setRecMinute] = useState(0);
  const [recDayOfWeek, setRecDayOfWeek] = useState(0); // Pazar
  const [recDayOfMonth, setRecDayOfMonth] = useState(1);

  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Menu items for segment criteria
  const [menuItems, setMenuItems] = useState<{ id: string; name: string; categoryId: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api
      .get('/api/menu', token)
      .then((res) => {
        setMenuItems(res?.items ?? []);
        setCategories(res?.categories ?? []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setError(null);
    try {
      const [list, st] = await Promise.all([
        api.get('/api/notifications', token),
        api.get('/api/notifications/stats', token),
      ]);
      setNotifications(list.notifications ?? []);
      setStats(st);
    } catch (e: any) {
      setError(e?.message ?? 'Bildirimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetComposer = () => {
    setTitle('');
    setBody('');
    setImageUrl('');
    setLinkRoute('');
    setTargetType('ALL');
    setSelectedCustomers([]);
    setSegMenuItemIds([]);
    setSegCategoryIds([]);
    setSegLastNDays(null);
    setSegDayOfWeek(null);
    setSegMinOrderCount(null);
    setSegPreview(null);
    setSchedule('NOW');
    setScheduledAt('');
    setRecType('WEEKLY');
    setRecHour(18);
    setRecMinute(0);
    setRecDayOfWeek(0);
    setRecDayOfMonth(1);
    setFeedback(null);
  };

  // Segment preview
  const previewSegment = async () => {
    try {
      const criteria: any = {
        verifiedOnly: true,
      };
      if (segMenuItemIds.length) criteria.menuItemIds = segMenuItemIds;
      if (segCategoryIds.length) criteria.categoryIds = segCategoryIds;
      if (segLastNDays) criteria.lastNDays = segLastNDays;
      if (typeof segDayOfWeek === 'number') criteria.dayOfWeek = segDayOfWeek;
      if (segMinOrderCount) criteria.minOrderCount = segMinOrderCount;
      const res = await api.post('/api/notifications/segment/preview', criteria, token);
      setSegPreview(res);
    } catch (e: any) {
      setFeedback({ type: 'err', text: e?.message ?? 'Önizleme hatası' });
    }
  };

  const handleSubmit = async () => {
    if (title.trim().length < 3) {
      setFeedback({ type: 'err', text: 'Başlık en az 3 karakter olmalı' });
      return;
    }
    if (body.trim().length < 5) {
      setFeedback({ type: 'err', text: 'İçerik en az 5 karakter olmalı' });
      return;
    }
    // Target validation
    if (targetType === 'CUSTOMER' && selectedCustomers.length === 0) {
      setFeedback({ type: 'err', text: 'En az 1 müşteri seç' });
      return;
    }
    if (targetType === 'SEGMENT' && !segPreview?.count) {
      setFeedback({ type: 'err', text: 'Segment kriteri eşleşen müşteri yok — önizleme yap' });
      return;
    }
    // Schedule validation
    if (schedule === 'ONCE' && !scheduledAt) {
      setFeedback({ type: 'err', text: 'Zamanlama tarihi gerekli' });
      return;
    }

    const sendNow = schedule === 'NOW';

    setSending(true);
    setFeedback(null);
    try {
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        targetType,
        sendNow,
        data: linkRoute.trim() ? { route: linkRoute.trim() } : undefined,
      };

      if (targetType === 'CUSTOMER') {
        payload.targetIds = selectedCustomers.map((c) => c.id);
      }
      if (targetType === 'SEGMENT') {
        const criteria: any = { verifiedOnly: true };
        if (segMenuItemIds.length) criteria.menuItemIds = segMenuItemIds;
        if (segCategoryIds.length) criteria.categoryIds = segCategoryIds;
        if (segLastNDays) criteria.lastNDays = segLastNDays;
        if (typeof segDayOfWeek === 'number') criteria.dayOfWeek = segDayOfWeek;
        if (segMinOrderCount) criteria.minOrderCount = segMinOrderCount;
        payload.segmentCriteria = criteria;
      }

      if (schedule === 'ONCE' && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }
      if (schedule === 'RECURRING') {
        payload.recurrence = {
          type: recType,
          hour: recHour,
          minute: recMinute,
          ...(recType === 'WEEKLY' && { dayOfWeek: recDayOfWeek }),
          ...(recType === 'MONTHLY' && { dayOfMonth: recDayOfMonth }),
        };
      }

      const res = await api.post('/api/notifications', payload, token);
      if (sendNow) {
        setFeedback({
          type: 'ok',
          text: `Gönderildi: ${res.result?.sent ?? 0} / ${res.result?.total ?? 0} cihaz`,
        });
      } else {
        setFeedback({ type: 'ok', text: 'Bildirim zamanlandı' });
      }
      setTimeout(() => {
        setComposerOpen(false);
        resetComposer();
      }, 1200);
      refresh();
    } catch (e: any) {
      setFeedback({ type: 'err', text: e?.message ?? 'Gönderilemedi' });
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Zamanlanan bildirim iptal edilsin mi?')) return;
    try {
      await api.post(`/api/notifications/${id}/cancel`, {}, token);
      refresh();
    } catch (e: any) {
      alert(e?.message ?? 'İptal edilemedi');
    }
  };

  const minSchedule = useMemo(() => {
    const d = new Date(Date.now() + 5 * 60_000); // en az 5 dk sonra
    return d.toISOString().slice(0, 16);
  }, [composerOpen]);

  const scheduled = notifications.filter((n) => n.status === 'SCHEDULED');
  const recurring = notifications.filter((n) => n.status === 'RECURRING');
  const history = notifications.filter(
    (n) => n.status !== 'SCHEDULED' && n.status !== 'RECURRING',
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary-500" />
            Push Bildirimleri
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Mobil müşteri uygulamasına kampanya ve duyuru bildirimi gönder.
          </p>
        </div>
        <button
          onClick={() => {
            resetComposer();
            setComposerOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-3 font-semibold text-white shadow-card hover:bg-primary-600 transition"
        >
          <Plus className="h-5 w-5" />
          Yeni Bildirim
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            icon={<Smartphone className="h-5 w-5 text-primary-500" />}
            label="Aktif cihaz"
            value={stats.totalDevices}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-accent-500" />}
            label="Üye olanlar"
            value={stats.verifiedDevices}
          />
          <StatCard
            icon={<Apple className="h-5 w-5 text-foreground" />}
            label="iOS"
            value={stats.iosDevices}
          />
          <StatCard
            icon={<Smartphone className="h-5 w-5 text-green-600" />}
            label="Android"
            value={stats.androidDevices}
          />
          <StatCard
            icon={<Send className="h-5 w-5 text-primary-500" />}
            label="Toplam gönderim"
            value={stats.totalSent}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <Section
          title="Zamanlanmış"
          subtitle={`${scheduled.length} bildirim sırada`}
          icon={<Clock className="h-5 w-5 text-accent-500" />}
        >
          <div className="space-y-2">
            {scheduled.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onCancel={() => handleCancel(n.id)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* History */}
      <Section
        title="Geçmiş"
        subtitle={loading ? 'Yükleniyor…' : `${history.length} bildirim`}
        icon={<RefreshCw className="h-5 w-5 text-foreground-muted" />}
        action={
          <button
            onClick={refresh}
            className="text-sm text-primary-600 hover:underline"
          >
            Yenile
          </button>
        }
      >
        {history.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-foreground-muted">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Henüz bildirim gönderilmedi</p>
            <p className="text-xs mt-1">İlk push bildirimini "Yeni Bildirim" ile gönder.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </div>
        )}
      </Section>

      {/* Composer Modal */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-light p-5">
              <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary-500" />
                Yeni Push Bildirimi
              </h2>
              <button
                onClick={() => setComposerOpen(false)}
                className="rounded-full p-2 hover:bg-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5 max-h-[70vh] overflow-auto">
              {/* Preview */}
              <div className="rounded-2xl bg-foreground p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm truncate">
                        {title || 'HighFive'}
                      </p>
                      <span className="text-[10px] text-white/60">şimdi</span>
                    </div>
                    <p className="text-sm text-white/90 mt-0.5 line-clamp-3">
                      {body || 'Bildirim önizlemesi burada görünür…'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <Field label="Başlık" hint={`${title.length}/65`}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 65))}
                  placeholder="Örn: 🍕 Bugün pizzalarda %30 indirim!"
                  className="input"
                />
              </Field>

              <Field label="İçerik" hint={`${body.length}/180`}>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 180))}
                  placeholder="Kampanyayı kısa açıkla; merak uyandırsın."
                  rows={3}
                  className="input"
                />
              </Field>

              <Field label="Görsel" hint="(opsiyonel)">
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-border-light">
                    <img
                      src={
                        imageUrl.startsWith('http')
                          ? imageUrl
                          : `${(import.meta as any).env?.VITE_API_URL || ''}${imageUrl}`
                      }
                      alt="Bildirim görseli"
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full px-3 py-1"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <ImageUploadField
                    onUploaded={(url) => setImageUrl(url)}
                    token={token}
                  />
                )}
              </Field>

              <Field
                label="Tıklama yönlendirmesi"
                hint="(opsiyonel)"
              >
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-foreground-muted" />
                  <input
                    value={linkRoute}
                    onChange={(e) => setLinkRoute(e.target.value)}
                    placeholder="/menu  veya  /campaign/c1  veya  /product/p1"
                    className="input flex-1"
                  />
                </div>
              </Field>

              <Field label="Hedef kitle">
                <div className="grid grid-cols-2 gap-2">
                  {(['ALL', 'VERIFIED', 'CUSTOMER', 'SEGMENT'] as const).map((t) => (
                    <label
                      key={t}
                      className={`cursor-pointer rounded-xl border-2 p-3 transition ${
                        targetType === t
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-border hover:border-foreground-subtle'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={targetType === t}
                        onChange={() => setTargetType(t)}
                      />
                      <p className="font-semibold text-sm text-foreground">
                        {TARGET_LABELS[t]}
                      </p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {t === 'ALL'
                          ? `${stats?.totalDevices ?? '?'} cihaz`
                          : t === 'VERIFIED'
                          ? `${stats?.verifiedDevices ?? '?'} cihaz`
                          : t === 'CUSTOMER'
                          ? `${selectedCustomers.length} seçili`
                          : segPreview
                          ? `${segPreview.count} müşteri`
                          : 'Kriter belirle'}
                      </p>
                    </label>
                  ))}
                </div>

                {/* CUSTOMER seçim */}
                {targetType === 'CUSTOMER' && (
                  <div className="mt-3 rounded-xl bg-surface p-3">
                    {selectedCustomers.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedCustomers.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs"
                          >
                            <span className="font-semibold">
                              {c.name || c.phone}
                            </span>
                            <button
                              onClick={() =>
                                setSelectedCustomers((s) => s.filter((x) => x.id !== c.id))
                              }
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCustomerPicker(true)}
                      className="w-full rounded-xl border-2 border-dashed border-primary-300 bg-white py-2.5 text-sm font-semibold text-primary-600 hover:bg-primary-50"
                    >
                      + Müşteri ekle (telefon/ad/e-posta arama)
                    </button>
                  </div>
                )}

                {/* SEGMENT kriter */}
                {targetType === 'SEGMENT' && (
                  <div className="mt-3 space-y-3 rounded-xl bg-surface p-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Hangi ürünleri sipariş etmiş?
                      </label>
                      <select
                        multiple
                        value={segMenuItemIds}
                        onChange={(e) =>
                          setSegMenuItemIds(
                            Array.from(e.target.selectedOptions).map((o) => o.value),
                          )
                        }
                        className="input h-32"
                      >
                        {menuItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-foreground-muted mt-1">
                        Cmd/Ctrl + tık ile çoklu seç. Boş = filtrele
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Son N gün içinde
                        </label>
                        <input
                          type="number"
                          value={segLastNDays ?? ''}
                          onChange={(e) =>
                            setSegLastNDays(e.target.value ? Number(e.target.value) : null)
                          }
                          placeholder="örn 30"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Hangi gün?
                        </label>
                        <select
                          value={segDayOfWeek ?? ''}
                          onChange={(e) =>
                            setSegDayOfWeek(e.target.value === '' ? null : Number(e.target.value))
                          }
                          className="input"
                        >
                          <option value="">— Hepsi —</option>
                          {DAYS_TR.map((d, i) => (
                            <option key={i} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Min sipariş sayısı
                      </label>
                      <input
                        type="number"
                        value={segMinOrderCount ?? ''}
                        onChange={(e) =>
                          setSegMinOrderCount(e.target.value ? Number(e.target.value) : null)
                        }
                        placeholder="örn 3"
                        className="input"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={previewSegment}
                      className="w-full rounded-xl bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
                    >
                      🔍 Segmenti önizle
                    </button>

                    {segPreview && (
                      <div className="rounded-xl bg-white border border-border-light p-3">
                        <p className="text-sm font-bold">
                          🎯 {segPreview.count} müşteri eşleşiyor
                        </p>
                        {segPreview.sample.length > 0 && (
                          <p className="mt-1 text-xs text-foreground-muted">
                            Örn:{' '}
                            {segPreview.sample
                              .map((c: any) => c.name || c.phone)
                              .join(', ')}
                            {segPreview.count > segPreview.sample.length && ' ...'}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-foreground-muted bg-amber-50 border border-amber-200 rounded-lg p-2">
                      💡 Örnek: "Pazarları 4 peynirli pizza alanlar" → ürün: 4 Peynirli, gün: Pazar, son: 60 gün → bu segmente 'tekrarlanan'
                      bildirim ile pazarlık yap (her pazar 18:00 indirim kodu)
                    </p>
                  </div>
                )}
              </Field>

              <Field label="Zamanlama">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: 'NOW', label: '⚡ Şimdi', desc: 'Anında gönder' },
                      { v: 'ONCE', label: '📅 Bir kez', desc: 'Belirli tarih' },
                      { v: 'RECURRING', label: '🔁 Tekrarlı', desc: 'Pazar/her ay vs.' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.v}
                      className={`cursor-pointer rounded-xl border-2 p-2.5 transition text-center ${
                        schedule === opt.v
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-border hover:border-foreground-subtle'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={schedule === opt.v}
                        onChange={() => setSchedule(opt.v)}
                      />
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className="text-[10px] text-foreground-muted mt-0.5">{opt.desc}</p>
                    </label>
                  ))}
                </div>

                {schedule === 'ONCE' && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={minSchedule}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="input mt-3"
                  />
                )}

                {schedule === 'RECURRING' && (
                  <div className="mt-3 space-y-3 rounded-xl bg-surface p-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setRecType(t)}
                          className={`rounded-lg border-2 py-1.5 text-xs font-semibold ${
                            recType === t
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-border bg-white text-foreground-muted'
                          }`}
                        >
                          {t === 'DAILY' ? 'Her gün' : t === 'WEEKLY' ? 'Haftalık' : 'Aylık'}
                        </button>
                      ))}
                    </div>

                    {recType === 'WEEKLY' && (
                      <div>
                        <label className="block text-xs font-semibold mb-1">Hangi gün?</label>
                        <select
                          value={recDayOfWeek}
                          onChange={(e) => setRecDayOfWeek(Number(e.target.value))}
                          className="input"
                        >
                          {DAYS_TR.map((d, i) => (
                            <option key={i} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {recType === 'MONTHLY' && (
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Ayın kaçı? (1-28)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={28}
                          value={recDayOfMonth}
                          onChange={(e) =>
                            setRecDayOfMonth(Math.max(1, Math.min(28, Number(e.target.value))))
                          }
                          className="input"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Saat</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={recHour}
                          onChange={(e) =>
                            setRecHour(Math.max(0, Math.min(23, Number(e.target.value))))
                          }
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Dakika</label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={recMinute}
                          onChange={(e) =>
                            setRecMinute(Math.max(0, Math.min(59, Number(e.target.value))))
                          }
                          className="input"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-foreground-muted bg-purple-50 border border-purple-200 rounded-lg p-2">
                      🔁 Bildirim {recType === 'DAILY' ? 'her gün' : recType === 'WEEKLY' ? `her ${DAYS_TR[recDayOfWeek]}` : `ayın ${recDayOfMonth}'inde`}{' '}
                      {String(recHour).padStart(2, '0')}:{String(recMinute).padStart(2, '0')} saatinde gidecek
                    </p>
                  </div>
                )}
              </Field>

              {feedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                    feedback.type === 'ok'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {feedback.type === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {feedback.text}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-light p-5">
              <button
                onClick={() => setComposerOpen(false)}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl text-foreground-muted hover:bg-surface"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white disabled:opacity-50 ${
                  schedule === 'NOW'
                    ? 'bg-primary-500 hover:bg-primary-600'
                    : schedule === 'RECURRING'
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-accent-500 hover:bg-accent-600'
                }`}
              >
                {schedule === 'NOW' ? (
                  <>
                    <Send className="h-4 w-4" />
                    {sending ? 'Gönderiliyor…' : 'Şimdi gönder'}
                  </>
                ) : schedule === 'RECURRING' ? (
                  <>
                    🔁 {sending ? 'Kaydediliyor…' : 'Tekrarlayan oluştur'}
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    {sending ? 'Zamanlanıyor…' : 'Zamanla'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <CustomerPickerModal
          token={token}
          selected={selectedCustomers}
          onClose={() => setShowCustomerPicker(false)}
          onChange={setSelectedCustomers}
        />
      )}

      {/* Recurring Section */}
      {recurring.length > 0 && (
        <Section
          title="🔁 Tekrarlayan bildirimler"
          subtitle={`${recurring.length} adet düzenli kampanya`}
          icon={<Bell className="h-5 w-5 text-purple-500" />}
        >
          <div className="space-y-2">
            {recurring.map((n) => (
              <RecurringRow key={n.id} n={n} onCancel={() => handleCancel(n.id)} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ==================== Customer Picker Modal ====================
function CustomerPickerModal({
  token,
  selected,
  onClose,
  onChange,
}: {
  token: string | null;
  selected: Customer[];
  onClose: () => void;
  onChange: (s: Customer[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!token) return;
      setLoading(true);
      try {
        const q = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
        const res = await api.get(`/api/notifications/customers/search${q}`, token);
        setResults(res.customers ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, token]);

  const isSelected = (id: string) => selected.some((s) => s.id === id);

  const toggle = (c: Customer) => {
    onChange(isSelected(c.id) ? selected.filter((s) => s.id !== c.id) : [...selected, c]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-light p-4">
          <h2 className="text-lg font-bold">Müşteri seç ({selected.length})</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Telefon, ad veya e-posta..."
            className="input w-full"
            autoFocus
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="text-center text-sm text-foreground-muted py-8">Aranıyor...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-sm text-foreground-muted py-8">
              {query ? 'Sonuç yok' : 'Müşteri ara'}
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c)}
                  className={`w-full text-left rounded-xl border p-3 transition ${
                    isSelected(c.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-border-light hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">
                        {c.name || '(İsimsiz)'}
                      </p>
                      <p className="text-xs text-foreground-muted truncate">
                        {c.phone}
                        {c.email && ` • ${c.email}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {c.isVerified && (
                        <span className="rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                      <span className="text-foreground-muted">
                        {c.orderCount} sip · {c.totalPoints}p
                      </span>
                      {isSelected(c.id) && <CheckCircle2 className="h-4 w-4 text-primary-500" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border-light p-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
          >
            Tamam ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Recurring Row ====================
function RecurringRow({ n, onCancel }: { n: Notification; onCancel: () => void }) {
  const r = n.recurrence as any;
  const dayName = (i: number) =>
    ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][i];
  const time = `${String(r?.hour ?? 0).padStart(2, '0')}:${String(r?.minute ?? 0).padStart(2, '0')}`;
  const desc =
    r?.type === 'DAILY'
      ? `Her gün ${time}`
      : r?.type === 'WEEKLY'
      ? `Her ${dayName(r.dayOfWeek)} ${time}`
      : r?.type === 'MONTHLY'
      ? `Ayın ${r.dayOfMonth}'inde ${time}`
      : '?';

  return (
    <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-purple-100 flex items-center justify-center text-lg">
        🔁
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground">{n.title}</p>
        <p className="text-xs text-foreground-muted line-clamp-1">{n.body}</p>
        <p className="mt-1 text-[11px] font-semibold text-purple-700">{desc}</p>
        {n.lastSentAt && (
          <p className="text-[10px] text-foreground-subtle">
            Son gönderim: {new Date(n.lastSentAt).toLocaleString('tr-TR')}
          </p>
        )}
      </div>
      <button onClick={onCancel} className="p-2 rounded-lg text-red-500 hover:bg-red-100">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==================== Components ====================

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-surface-elevated border border-border-light p-4">
      <div className="flex items-center gap-2">{icon}<span className="text-xs font-medium text-foreground-muted">{label}</span></div>
      <p className="mt-2 text-2xl font-extrabold text-foreground">
        {value.toLocaleString('tr-TR')}
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface-elevated border border-border-light p-5">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-xs text-foreground-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function NotificationRow({
  n,
  onCancel,
}: {
  n: Notification;
  onCancel?: () => void;
}) {
  const status = STATUS_CHIPS[n.status];
  const date = n.scheduledAt
    ? new Date(n.scheduledAt)
    : n.sentAt
    ? new Date(n.sentAt)
    : new Date(n.createdAt);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-light p-3 hover:bg-surface transition">
      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary-50 flex items-center justify-center">
        <Bell className="h-5 w-5 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-foreground truncate">
            {n.title}
          </p>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.cls}`}
          >
            {status.label}
          </span>
        </div>
        <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">
          {n.body}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-foreground-subtle">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date.toLocaleString('tr-TR')}
          </span>
          <span>•</span>
          <span>{TARGET_LABELS[n.targetType]}</span>
          {n.status === 'SENT' && (
            <>
              <span>•</span>
              <span className="text-green-600">
                {n.sentCount} gönderildi
                {n.failedCount > 0 && (
                  <span className="text-red-500"> · {n.failedCount} başarısız</span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="flex-shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50"
          title="İptal et"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {hint && <span className="text-[11px] text-foreground-subtle">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ImageUploadField({
  onUploaded,
  token,
}: {
  onUploaded: (url: string) => void;
  token: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Lütfen bir resim dosyası seç');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Resim 5MB'dan küçük olmalı");
      return;
    }
    setUploading(true);
    try {
      const result = await api.upload('/api/upload', file, token!);
      const url = result?.file?.url || result?.url;
      if (url) onUploaded(url);
    } catch (err: any) {
      alert('Yükleme hatası: ' + (err?.message ?? 'bilinmiyor'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-border rounded-xl p-5 text-center hover:bg-surface transition disabled:opacity-50"
      >
        {uploading ? (
          <span className="text-sm text-foreground-muted">Yükleniyor...</span>
        ) : (
          <>
            <div className="text-2xl mb-1">🖼️</div>
            <div className="text-sm font-semibold text-foreground">
              Resim yükle
            </div>
            <div className="text-[11px] text-foreground-muted mt-0.5">
              JPG/PNG/WebP, max 5MB
            </div>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </>
  );
}
