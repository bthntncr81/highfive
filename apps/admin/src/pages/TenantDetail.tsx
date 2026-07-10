import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Gift,
  Ban,
  CheckCircle2,
  MonitorSmartphone,
  Loader2,
  Bot,
  Globe,
  Users,
  BarChart3,
} from 'lucide-react';
import { api, TenantDetail as TenantDetailData, BASE_DOMAIN } from '../lib/api';
import { fmtMoney, fmtDate, fmtDateTime, txTypeLabel, SUB_STATUS_LABELS } from '../lib/format';
import {
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  TenantStatusBadge,
  SuccessBadge,
  Badge,
  Modal,
  ConfirmDialog,
} from '../components/ui';

const GIFT_PLANS = ['STARTER', 'PRO', 'AI'];

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  MANAGER: 'Müdür',
  WAITER: 'Garson',
  KITCHEN: 'Mutfak',
  CASHIER: 'Kasiyer',
  COURIER: 'Kurye',
};

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TenantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<'suspend' | 'activate' | null>(null);
  const [gifting, setGifting] = useState(false);
  const [giftPlan, setGiftPlan] = useState('PRO');
  const [giftMonths, setGiftMonths] = useState(1);

  const load = useCallback(() => {
    if (!id) return;
    api
      .tenant(id)
      .then((r) => setData(r))
      .catch((err: any) => setError(err.message || 'Detay yüklenemedi'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runStatusAction(kind: 'suspend' | 'activate') {
    if (!id) return;
    setBusy(true);
    setActionError('');
    try {
      if (kind === 'suspend') await api.suspendTenant(id);
      else await api.activateTenant(id);
      setConfirming(null);
      load();
    } catch (err: any) {
      setActionError(err.message || 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  }

  async function submitGift(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    setActionError('');
    try {
      await api.giftPlan(id, giftPlan, giftMonths);
      setGifting(false);
      load();
    } catch (err: any) {
      setActionError(err.message || 'Plan tanımlanamadı');
    } finally {
      setBusy(false);
    }
  }

  // Open the tenant's POS in a new tab with a short-lived owner token
  async function impersonate() {
    if (!id) return;
    setBusy(true);
    setActionError('');
    try {
      const r = await api.impersonate(id);
      window.open(`https://${r.tenant.subdomain}.${BASE_DOMAIN}/pos/login-email#sso=${encodeURIComponent(r.token)}`);
    } catch (err: any) {
      setActionError(err.message || 'Panele girilemedi');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!data) return null;

  const { tenant, subscription, members, usage, theme, transactions } = data;
  const siteUrl = `https://${tenant.subdomain}.${BASE_DOMAIN}`;

  return (
    <>
      <Link to="/restoranlar" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> Restoranlar
      </Link>

      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.subdomain}.${BASE_DOMAIN} · Kayıt: ${fmtDate(tenant.createdAt)}`}
        actions={
          <>
            <TenantStatusBadge status={tenant.status} />
            <button className="btn-ghost" onClick={impersonate} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <MonitorSmartphone size={16} />} Panele Gir
            </button>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="btn-ghost">
              <ExternalLink size={16} /> Siteyi Aç
            </a>
            {subscription?.whatsappAI && (
              <a href="https://whatsapp.otorder.com" target="_blank" rel="noreferrer" className="btn-ghost">
                <Bot size={16} /> OtOrder AI
              </a>
            )}
            <button className="btn-primary" onClick={() => setGifting(true)}>
              <Gift size={16} /> Plan Hediye Et
            </button>
            {tenant.status === 'SUSPENDED' ? (
              <button className="btn-ghost" onClick={() => setConfirming('activate')}>
                <CheckCircle2 size={16} /> Aktifleştir
              </button>
            ) : (
              <button className="btn-danger" onClick={() => setConfirming('suspend')}>
                <Ban size={16} /> Askıya Al
              </button>
            )}
          </>
        }
      />

      {actionError && (
        <div className="mb-4">
          <ErrorBlock message={actionError} />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <BarChart3 size={14} /> Abonelik
          </p>
          {subscription ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-ink">{subscription.planName}</span>
                <Badge tone={subscription.status === 'ACTIVE' ? 'green' : 'amber'}>
                  {SUB_STATUS_LABELS[subscription.status] || subscription.status}
                </Badge>
                {subscription.whatsappAI && <Badge tone="blue">WhatsApp AI</Badge>}
              </div>
              <p className="text-ink-soft">
                {fmtMoney(subscription.monthlyPrice)}/ay · {subscription.cycle === 'ANNUAL' ? 'Yıllık' : 'Aylık'} döngü
              </p>
              <p className="text-ink-soft">
                Dönem: {fmtDate(subscription.currentPeriodStart)} – {fmtDate(subscription.currentPeriodEnd)}
              </p>
              {subscription.failedAttempts > 0 && (
                <p className="text-brand-700">Başarısız ödeme denemesi: {subscription.failedAttempts}</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Abonelik yok{tenant.trialEndsAt ? ` · Deneme bitişi: ${fmtDate(tenant.trialEndsAt)}` : ''}
            </p>
          )}
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Users size={14} /> Kullanım
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Şube</dt>
              <dd className="font-semibold text-ink">{usage.locations}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Toplam sipariş</dt>
              <dd className="font-semibold text-ink">{usage.ordersTotal}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Son 30 gün</dt>
              <dd className="font-semibold text-ink">{usage.ordersLast30d}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Ürün</dt>
              <dd className="font-semibold text-ink">{usage.menuItems}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Kategori</dt>
              <dd className="font-semibold text-ink">{usage.categories}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Açık talep</dt>
              <dd className={`font-semibold ${usage.openTickets > 0 ? 'text-brand-600' : 'text-ink'}`}>{usage.openTickets}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Globe size={14} /> Tema / Yayın
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={theme.published ? 'green' : 'gray'}>{theme.published ? 'Yayında' : 'Yayında değil'}</Badge>
              {theme.customLanding && <Badge tone="blue">Özel site</Badge>}
            </div>
            <p className="text-ink-soft">Logo: {theme.logoUrl ? 'Yüklü' : 'Yok'}</p>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700">
              {tenant.subdomain}.{BASE_DOMAIN} <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card mt-4 overflow-hidden">
        <p className="border-b border-line px-5 py-4 font-display text-sm font-bold text-ink">Üyeler ({members.length})</p>
        {members.length === 0 ? (
          <EmptyBlock label="Üye yok." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={`${m.email}-${i}`}>
                    <td className="font-medium text-ink">{m.name || '—'}</td>
                    <td>{m.email}</td>
                    <td>{ROLE_LABELS[m.role] || m.role}</td>
                    <td>
                      <Badge tone={m.active ? 'green' : 'gray'}>{m.active ? 'Aktif' : 'Pasif'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="card mt-4 overflow-hidden">
        <p className="border-b border-line px-5 py-4 font-display text-sm font-bold text-ink">Son İşlemler</p>
        {transactions.length === 0 ? (
          <EmptyBlock label="İşlem yok." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tip</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Dönem</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(t.createdAt)}</td>
                    <td>{txTypeLabel(t.type)}</td>
                    <td className="whitespace-nowrap">{fmtMoney(t.amount, t.currency)}</td>
                    <td>
                      <SuccessBadge success={t.success} />
                    </td>
                    <td className="whitespace-nowrap">
                      {t.periodStart ? `${fmtDate(t.periodStart)} – ${fmtDate(t.periodEnd)}` : '—'}
                    </td>
                    <td className="max-w-[220px] truncate text-ink-muted" title={t.errorMessage || ''}>
                      {t.errorMessage || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend / activate confirmation */}
      {confirming && (
        <ConfirmDialog
          title={confirming === 'suspend' ? 'Askıya Al' : 'Aktifleştir'}
          message={
            confirming === 'suspend'
              ? `${tenant.name} askıya alınacak; POS ve sipariş sitesi erişimi kapanır. Devam edilsin mi?`
              : `${tenant.name} yeniden aktifleştirilecek. Devam edilsin mi?`
          }
          confirmLabel={confirming === 'suspend' ? 'Askıya Al' : 'Aktifleştir'}
          danger={confirming === 'suspend'}
          busy={busy}
          onConfirm={() => runStatusAction(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}

      {/* Gift plan modal */}
      {gifting && (
        <Modal title="Plan Hediye Et" onClose={() => setGifting(false)}>
          <form onSubmit={submitGift} className="space-y-4">
            <p className="text-sm text-ink-soft">
              Ücret çekilmeden seçilen plan tanımlanır ve abonelik aktifleştirilir.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Paket</span>
              <select className="input" value={giftPlan} onChange={(e) => setGiftPlan(e.target.value)}>
                {GIFT_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-soft">Süre (ay)</span>
              <input
                type="number"
                min={1}
                max={36}
                className="input"
                value={giftMonths}
                onChange={(e) => setGiftMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setGifting(false)} disabled={busy}>
                Vazgeç
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />} Tanımla
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
