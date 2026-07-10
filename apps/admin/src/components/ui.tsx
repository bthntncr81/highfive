import { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  TENANT_STATUS_LABELS,
  SUB_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from '../lib/format';

// --- Badges ------------------------------------------------------------

type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';

const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-brand-50 text-brand-700 border-brand-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

const TENANT_STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'green',
  TRIAL: 'amber',
  PAST_DUE: 'amber',
  SUSPENDED: 'red',
};

export function TenantStatusBadge({ status }: { status: string }) {
  return <Badge tone={TENANT_STATUS_TONES[status] || 'gray'}>{TENANT_STATUS_LABELS[status] || status}</Badge>;
}

const SUB_STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'green',
  TRIAL: 'amber',
  PAST_DUE: 'amber',
  CANCELLED: 'gray',
  EXPIRED: 'red',
};

export function SubscriptionStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge tone="gray">Abonelik yok</Badge>;
  return <Badge tone={SUB_STATUS_TONES[status] || 'gray'}>{SUB_STATUS_LABELS[status] || status}</Badge>;
}

const TICKET_TYPE_TONES: Record<string, Tone> = {
  REQUEST: 'blue',
  COMPLAINT: 'amber',
  ISSUE: 'red',
};

export function TicketTypeBadge({ type }: { type: string }) {
  return <Badge tone={TICKET_TYPE_TONES[type] || 'gray'}>{TICKET_TYPE_LABELS[type] || type}</Badge>;
}

const TICKET_STATUS_TONES: Record<string, Tone> = {
  OPEN: 'red',
  IN_PROGRESS: 'amber',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

export function TicketStatusBadge({ status }: { status: string }) {
  return <Badge tone={TICKET_STATUS_TONES[status] || 'gray'}>{TICKET_STATUS_LABELS[status] || status}</Badge>;
}

const TICKET_PRIORITY_TONES: Record<string, Tone> = {
  LOW: 'gray',
  NORMAL: 'blue',
  HIGH: 'red',
};

export function TicketPriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={TICKET_PRIORITY_TONES[priority] || 'gray'}>{TICKET_PRIORITY_LABELS[priority] || priority}</Badge>;
}

export function SuccessBadge({ success }: { success: boolean }) {
  return <Badge tone={success ? 'green' : 'red'}>{success ? 'Başarılı' : 'Başarısız'}</Badge>;
}

// --- Layout helpers ------------------------------------------------------

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-muted">
      <Loader2 size={18} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorBlock({ message }: { message: string }) {
  return <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">{message}</div>;
}

export function EmptyBlock({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-ink-muted">{label}</div>;
}

// --- Modal ---------------------------------------------------------------

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="card relative w-full max-w-md p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-muted hover:bg-paper hover:text-ink" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel} disabled={busy}>
          Vazgeç
        </button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
