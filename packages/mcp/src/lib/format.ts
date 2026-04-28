export function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return typeof val === 'number' ? val : Number(val);
}

export function formatTL(amount: number): string {
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  READY: 'Hazır',
  OUT_FOR_DELIVERY: 'Yolda',
  DELIVERED: 'Teslim Edildi',
  SERVED: 'Servis Edildi',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

const TABLE_STATUS_MAP: Record<string, string> = {
  FREE: 'Boş',
  OCCUPIED: 'Dolu',
  RESERVED: 'Rezerve',
  CLEANING: 'Temizleniyor',
};

const ORDER_TYPE_MAP: Record<string, string> = {
  DINE_IN: 'Restoranda',
  TAKEAWAY: 'Paket',
  DELIVERY: 'Kurye',
  ROOM_SERVICE: 'Oda Servisi',
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  DEBIT_CARD: 'Banka Kartı',
  ONLINE: 'Online',
  MULTINET: 'Multinet',
  SODEXO: 'Sodexo',
  TICKET: 'Ticket',
  TAB: 'Hesaba Ekle',
  DIGITAL_COIN: 'Dijital Coin',
  OTHER: 'Diğer',
};

export function getOrderStatusText(status: string): string {
  return ORDER_STATUS_MAP[status] || status;
}

export function getTableStatusText(status: string): string {
  return TABLE_STATUS_MAP[status] || status;
}

export function getOrderTypeText(type: string): string {
  return ORDER_TYPE_MAP[type] || type;
}

export function getPaymentMethodText(method: string): string {
  return PAYMENT_METHOD_MAP[method] || method;
}

export function formatOrderNumber(num: number): string {
  return `#${String(num).padStart(4, '0')}`;
}
