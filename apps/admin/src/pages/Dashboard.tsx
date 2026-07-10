import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, CalendarRange, BadgeCheck, Wallet, ArrowRight, LifeBuoy } from 'lucide-react';
import { api, Metrics, BillingTx, Ticket } from '../lib/api';
import { fmtMoney, fmtDateTime, txTypeLabel, TENANT_STATUS_LABELS } from '../lib/format';
import {
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  TenantStatusBadge,
  SuccessBadge,
  TicketTypeBadge,
} from '../components/ui';

const METRIC_CARDS: Array<{ key: keyof Metrics; label: string; icon: typeof TrendingUp; money?: boolean }> = [
  { key: 'mrr', label: 'MRR', icon: TrendingUp, money: true },
  { key: 'arr', label: 'ARR', icon: CalendarRange, money: true },
  { key: 'activeSubscriptions', label: 'Aktif Abonelik', icon: BadgeCheck },
  { key: 'totalRevenue', label: 'Toplam Gelir', icon: Wallet, money: true },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [txs, setTxs] = useState<BillingTx[]>([]);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.metrics(), api.transactions({ limit: 10 }), api.tickets({ status: 'OPEN' })])
      .then(([m, t, k]) => {
        if (cancelled) return;
        setMetrics(m);
        setTxs(t.transactions);
        setOpenTickets(k.tickets);
      })
      .catch((err: any) => !cancelled && setError(err.message || 'Veriler yüklenemedi'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  if (!metrics) return null;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Platform geneli abonelik ve gelir görünümü" />

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRIC_CARDS.map(({ key, label, icon: Icon, money }) => (
          <div key={key} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
              <Icon size={18} className="text-brand-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-ink">
              {money ? fmtMoney(metrics[key] as number) : (metrics[key] as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Tenant status distribution */}
      <div className="card mt-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Restoran Durum Dağılımı</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {Object.keys(TENANT_STATUS_LABELS).map((status) => (
            <Link
              key={status}
              to={`/restoranlar?status=${status}`}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 transition-colors hover:border-brand-300"
            >
              <TenantStatusBadge status={status} />
              <span className="font-display text-lg font-bold text-ink">{metrics.tenantsByStatus[status] ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        {/* Last transactions */}
        <div className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="font-display text-sm font-bold text-ink">Son Ödeme İşlemleri</p>
            <Link to="/odemeler" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
              Tümü <ArrowRight size={13} />
            </Link>
          </div>
          {txs.length === 0 ? (
            <EmptyBlock label="Henüz işlem yok." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-x">
                <thead>
                  <tr>
                    <th>Restoran</th>
                    <th>Tip</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium text-ink">{t.tenantName || '—'}</td>
                      <td>{txTypeLabel(t.type)}</td>
                      <td className="whitespace-nowrap">{fmtMoney(t.amount, t.currency)}</td>
                      <td>
                        <SuccessBadge success={t.success} />
                      </td>
                      <td className="whitespace-nowrap text-ink-muted">{fmtDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Open tickets */}
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
              <LifeBuoy size={16} className="text-brand-500" /> Açık Talepler
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600">{openTickets.length}</span>
            </p>
            <Link to="/talepler" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
              Taleplere git <ArrowRight size={13} />
            </Link>
          </div>
          {openTickets.length === 0 ? (
            <EmptyBlock label="Açık talep yok." />
          ) : (
            <ul className="divide-y divide-line">
              {openTickets.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link to="/talepler" className="block px-5 py-3 transition-colors hover:bg-paper">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{t.subject}</p>
                      <TicketTypeBadge type={t.type} />
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t.tenant?.name} · {fmtDateTime(t.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
