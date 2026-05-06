// POS — Push Notifications Yönetim Ekranı
// Müşteri mobil uygulamasına anlık veya zamanlı bildirim gönderir.

import { useEffect, useMemo, useState } from 'react';
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
  targetType: 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE';
  sentCount: number;
  failedCount: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
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
};

const TARGET_LABELS = {
  ALL: 'Tüm cihazlar',
  VERIFIED: 'Sadece üye olanlar',
  CUSTOMER: 'Belirli müşteriler',
  DEVICE: 'Belirli cihazlar',
};

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
  const [linkRoute, setLinkRoute] = useState(''); // örn /campaign/abc, /menu, /product/123
  const [targetType, setTargetType] = useState<Notification['targetType']>('ALL');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
    setScheduleEnabled(false);
    setScheduledAt('');
    setFeedback(null);
  };

  const handleSubmit = async (sendNow: boolean) => {
    if (title.trim().length < 3) {
      setFeedback({ type: 'err', text: 'Başlık en az 3 karakter olmalı' });
      return;
    }
    if (body.trim().length < 5) {
      setFeedback({ type: 'err', text: 'İçerik en az 5 karakter olmalı' });
      return;
    }
    if (!sendNow && (!scheduleEnabled || !scheduledAt)) {
      setFeedback({ type: 'err', text: 'Zamanlama tarihi gerekli' });
      return;
    }

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
      if (!sendNow && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
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
  const history = notifications.filter((n) => n.status !== 'SCHEDULED');

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

              <Field
                label="Görsel URL"
                hint="(opsiyonel — uploads/ veya tam url)"
              >
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://api.highfivepps.com/uploads/..."
                  className="input"
                />
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
                  {(['ALL', 'VERIFIED'] as const).map((t) => (
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
                          : `${stats?.verifiedDevices ?? '?'} cihaz`}
                      </p>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Zamanlama">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      className="h-4 w-4 accent-primary-500"
                    />
                    <span className="text-sm text-foreground">
                      Belirli bir tarihte gönder
                    </span>
                  </label>
                  {scheduleEnabled && (
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={minSchedule}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="input"
                    />
                  )}
                </div>
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
              {scheduleEnabled ? (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={sending}
                  className="flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" />
                  {sending ? 'Zamanlanıyor…' : 'Zamanla'}
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={sending}
                  className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Gönderiliyor…' : 'Şimdi gönder'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
