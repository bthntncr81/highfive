// Formatting helpers + Turkish label maps for platform enums.

const nf = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function fmtMoney(amount: number, currency = 'TRY'): string {
  const prefix = currency === 'TRY' || currency === 'TL' ? '₺' : `${currency} `;
  return `${prefix}${nf.format(amount)}`;
}

export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('tr-TR');
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

// BillingTransactionType → Turkish
export const TX_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION_PAYMENT: 'Abonelik Ödemesi',
  SUBSCRIPTION_UPGRADE: 'Paket Yükseltme',
  REFUND: 'İade',
  MANUAL_CREDIT: 'Manuel Tanımlama',
};

export function txTypeLabel(type: string): string {
  return TX_TYPE_LABELS[type] || type;
}

// TenantStatus → Turkish
export const TENANT_STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Deneme',
  ACTIVE: 'Aktif',
  PAST_DUE: 'Ödeme Gecikti',
  SUSPENDED: 'Askıda',
};

// SubscriptionStatus → Turkish
export const SUB_STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Deneme',
  ACTIVE: 'Aktif',
  PAST_DUE: 'Gecikmiş',
  CANCELLED: 'İptal',
  EXPIRED: 'Süresi Doldu',
};

// Ticket enums → Turkish
export const TICKET_TYPE_LABELS: Record<string, string> = {
  REQUEST: 'Talep',
  COMPLAINT: 'Şikayet',
  ISSUE: 'Teknik Sorun',
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Açık',
  IN_PROGRESS: 'İşlemde',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapalı',
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Düşük',
  NORMAL: 'Normal',
  HIGH: 'Yüksek',
};
