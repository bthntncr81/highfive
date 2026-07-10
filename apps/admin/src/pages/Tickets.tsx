import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Send, X } from 'lucide-react';
import { api, Ticket } from '../lib/api';
import { fmtDateTime, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '../lib/format';
import {
  PageHeader,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  TicketTypeBadge,
  TicketStatusBadge,
  TicketPriorityBadge,
} from '../components/ui';

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: 'OPEN', label: 'Açık' },
  { key: 'IN_PROGRESS', label: 'İşlemde' },
  { key: 'RESOLVED', label: 'Çözüldü' },
  { key: 'CLOSED', label: 'Kapalı' },
  { key: '', label: 'Tümü' },
];

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [panelError, setPanelError] = useState('');

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api
      .tickets({ status: statusFilter || undefined })
      .then((r) => {
        if (cancelled) return;
        setTickets(r.tickets);
        // Keep the drawer in sync with fresh data
        setSelected((prev) => (prev ? r.tickets.find((t) => t.id === prev.id) || prev : prev));
      })
      .catch((err: any) => !cancelled && setError(err.message || 'Talepler yüklenemedi'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  useEffect(() => load(), [load]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setBusy(true);
    setPanelError('');
    try {
      await api.replyTicket(selected.id, reply.trim());
      setReply('');
      load();
    } catch (err: any) {
      setPanelError(err.message || 'Yanıt gönderilemedi');
    } finally {
      setBusy(false);
    }
  }

  async function patchTicket(data: { status?: string; priority?: string }) {
    if (!selected) return;
    setBusy(true);
    setPanelError('');
    try {
      const r = await api.updateTicket(selected.id, data);
      setSelected((prev) => (prev ? { ...prev, ...r.ticket, tenant: prev.tenant, replies: prev.replies } : prev));
      load();
    } catch (err: any) {
      setPanelError(err.message || 'Güncellenemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Talepler" subtitle="Restoranlardan gelen destek talepleri ve şikayetler" />

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key || 'all'}
            onClick={() => {
              setStatusFilter(tab.key);
              setSelected(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              statusFilter === tab.key ? 'bg-brand-500 text-white' : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorBlock message={error} />
      ) : loading && tickets.length === 0 ? (
        <LoadingBlock />
      ) : tickets.length === 0 ? (
        <div className="card">
          <EmptyBlock label="Bu durumda talep yok." />
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {/* List */}
          <div className={`card overflow-hidden ${selected ? 'hidden flex-1 lg:block' : 'flex-1'}`}>
            <ul className="divide-y divide-line">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      setSelected(t);
                      setReply('');
                      setPanelError('');
                    }}
                    className={`block w-full px-5 py-4 text-left transition-colors hover:bg-paper ${
                      selected?.id === t.id ? 'bg-brand-50/60' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{t.tenant?.name}</span>
                      <TicketTypeBadge type={t.type} />
                      <TicketPriorityBadge priority={t.priority} />
                      <span className="ml-auto">
                        <TicketStatusBadge status={t.status} />
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-ink-soft">{t.subject}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t.openedByName || 'Bilinmiyor'} · {t.source} · {fmtDateTime(t.createdAt)}
                      {t.replies.length > 0 && ` · ${t.replies.length} yanıt`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Detail drawer */}
          {selected && (
            <div className="card w-full lg:w-[440px] lg:shrink-0">
              <div className="flex items-start justify-between gap-2 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">{selected.subject}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    <Link to={`/restoranlar/${selected.tenantId}`} className="font-semibold text-brand-600 hover:text-brand-700">
                      {selected.tenant?.name}
                    </Link>{' '}
                    · {selected.openedByName || 'Bilinmiyor'} · {fmtDateTime(selected.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1 text-ink-muted hover:bg-paper hover:text-ink"
                  aria-label="Paneli kapat"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status / priority controls */}
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                <select
                  className="input w-auto py-1.5 text-xs"
                  value={selected.status}
                  disabled={busy}
                  onChange={(e) => patchTicket({ status: e.target.value })}
                  aria-label="Durum"
                >
                  {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  className="input w-auto py-1.5 text-xs"
                  value={selected.priority}
                  disabled={busy}
                  onChange={(e) => patchTicket({ priority: e.target.value })}
                  aria-label="Öncelik"
                >
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v} öncelik
                    </option>
                  ))}
                </select>
                <TicketTypeBadge type={selected.type} />
              </div>

              {/* Original message + reply thread */}
              <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4">
                <div className="rounded-xl bg-paper px-4 py-3">
                  <p className="text-xs font-semibold text-ink-muted">{selected.openedByName || selected.tenant?.name}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{selected.message}</p>
                </div>
                {selected.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-xl px-4 py-3 ${
                      r.fromAdmin ? 'ml-6 border border-brand-100 bg-brand-50' : 'mr-6 bg-paper'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${r.fromAdmin ? 'text-brand-700' : 'text-ink-muted'}`}>
                      {r.fromAdmin ? `OtOrder · ${r.authorName || 'Destek'}` : r.authorName || 'Restoran'}
                      <span className="ml-2 font-normal text-ink-muted">{fmtDateTime(r.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{r.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <form onSubmit={sendReply} className="border-t border-line px-5 py-4">
                {panelError && <p className="mb-2 text-sm text-brand-700">{panelError}</p>}
                <textarea
                  className="input min-h-[80px] resize-y"
                  placeholder="Yanıt yaz…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <button type="submit" className="btn-primary" disabled={busy || !reply.trim()}>
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Yanıtla
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
