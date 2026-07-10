import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, BillingTx, TenantRow } from '../lib/api';
import { fmtMoney, fmtDate, fmtDateTime, txTypeLabel } from '../lib/format';
import { PageHeader, LoadingBlock, ErrorBlock, EmptyBlock, SuccessBadge } from '../components/ui';

export default function Transactions() {
  const [txs, setTxs] = useState<BillingTx[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tenant list once, for the filter dropdown
  useEffect(() => {
    api
      .tenants()
      .then((r) => setTenants(r.tenants))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .transactions({ tenantId: tenantId || undefined, limit: 200 })
      .then((r) => !cancelled && setTxs(r.transactions))
      .catch((err: any) => !cancelled && setError(err.message || 'İşlemler yüklenemedi'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <>
      <PageHeader title="Ödemeler" subtitle="Tüm abonelik ve fatura işlemleri" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="input w-auto max-w-xs"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          aria-label="Restoran filtresi"
        >
          <option value="">Tüm restoranlar</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.subdomain})
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-muted">{txs.length} işlem</span>
      </div>

      {error ? (
        <ErrorBlock message={error} />
      ) : loading ? (
        <LoadingBlock />
      ) : txs.length === 0 ? (
        <div className="card">
          <EmptyBlock label="İşlem bulunamadı." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Restoran</th>
                  <th>Tip</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Dönem</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(t.createdAt)}</td>
                    <td>
                      {t.tenantId ? (
                        <Link to={`/restoranlar/${t.tenantId}`} className="font-semibold text-ink hover:text-brand-600">
                          {t.tenantName || t.subdomain || '—'}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink">{t.tenantName || '—'}</span>
                      )}
                      {t.subdomain && <p className="text-xs text-ink-muted">{t.subdomain}</p>}
                    </td>
                    <td className="whitespace-nowrap">{txTypeLabel(t.type)}</td>
                    <td className="whitespace-nowrap font-medium text-ink">{fmtMoney(t.amount, t.currency)}</td>
                    <td>
                      <SuccessBadge success={t.success} />
                    </td>
                    <td className="whitespace-nowrap">
                      {t.periodStart ? `${fmtDate(t.periodStart)} – ${fmtDate(t.periodEnd)}` : '—'}
                    </td>
                    <td className="max-w-[240px] truncate text-ink-muted" title={t.errorMessage || ''}>
                      {t.errorMessage || '—'}
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
