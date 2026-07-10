import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api, TenantRow } from '../lib/api';
import { fmtDate, TENANT_STATUS_LABELS } from '../lib/format';
import { PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, TenantStatusBadge, SubscriptionStatusBadge } from '../components/ui';

export default function Tenants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const [q, setQ] = useState('');
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounced fetch on search / status change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .tenants({ status: status || undefined, q: q.trim() || undefined })
        .then((r) => !cancelled && setTenants(r.tenants))
        .catch((err: any) => !cancelled && setError(err.message || 'Liste yüklenemedi'))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status, q]);

  return (
    <>
      <PageHeader title="Restoranlar" subtitle="Platformdaki tüm tenant kayıtları" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Ad veya subdomain ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setSearchParams(v ? { status: v } : {});
          }}
          aria-label="Durum filtresi"
        >
          <option value="">Tüm durumlar</option>
          {Object.entries(TENANT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-muted">{tenants.length} kayıt</span>
      </div>

      {error ? (
        <ErrorBlock message={error} />
      ) : loading ? (
        <LoadingBlock />
      ) : tenants.length === 0 ? (
        <div className="card">
          <EmptyBlock label="Eşleşen restoran bulunamadı." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>Restoran</th>
                  <th>Plan</th>
                  <th>Abonelik</th>
                  <th>Dönem Sonu</th>
                  <th className="text-right">Kullanıcı</th>
                  <th className="text-right">Şube</th>
                  <th className="text-right">Sipariş</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/restoranlar/${t.id}`)}
                    className="cursor-pointer transition-colors hover:bg-paper"
                  >
                    <td>
                      <p className="font-semibold text-ink">{t.name}</p>
                      <p className="text-xs text-ink-muted">{t.subdomain}.otorder.com</p>
                    </td>
                    <td className="font-medium">{t.plan || '—'}</td>
                    <td>
                      <SubscriptionStatusBadge status={t.subscriptionStatus} />
                    </td>
                    <td className="whitespace-nowrap">{fmtDate(t.currentPeriodEnd)}</td>
                    <td className="text-right">{t.users}</td>
                    <td className="text-right">{t.locations}</td>
                    <td className="text-right">{t.orders}</td>
                    <td>
                      <TenantStatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
