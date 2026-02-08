// HighFive Suite - Shared Utilities

// Format currency
export function formatCurrency(amount: number, currency = 'TL'): string {
  return `${amount.toLocaleString('tr-TR')} ${currency}`;
}

// Format date
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return d.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'time':
      return d.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
  }
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(d, 'short');
}

// Get order status text
export function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Bekliyor',
    CONFIRMED: 'Onaylandı',
    PREPARING: 'Hazırlanıyor',
    READY: 'Hazır',
    SERVED: 'Servis Edildi',
    COMPLETED: 'Tamamlandı',
    CANCELLED: 'İptal',
  };
  return statusMap[status] || status;
}

// Get order status color
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PREPARING: 'bg-orange-100 text-orange-800',
    READY: 'bg-green-100 text-green-800',
    SERVED: 'bg-teal-100 text-teal-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

// Get table status text
export function getTableStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    FREE: 'Boş',
    OCCUPIED: 'Dolu',
    RESERVED: 'Rezerve',
    CLEANING: 'Temizleniyor',
  };
  return statusMap[status] || status;
}

// Get table status color
export function getTableStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    FREE: 'bg-green-500',
    OCCUPIED: 'bg-red-500',
    RESERVED: 'bg-blue-500',
    CLEANING: 'bg-yellow-500',
  };
  return colorMap[status] || 'bg-gray-500';
}

// Get payment method text
export function getPaymentMethodText(method: string): string {
  const methodMap: Record<string, string> = {
    CASH: 'Nakit',
    CREDIT_CARD: 'Kredi Kartı',
    DEBIT_CARD: 'Banka Kartı',
    ONLINE: 'Online',
    MULTINET: 'Multinet',
    SODEXO: 'Sodexo',
    TICKET: 'Ticket',
    OTHER: 'Diğer',
  };
  return methodMap[method] || method;
}

// Generate order number display
export function formatOrderNumber(orderNumber: number): string {
  return `#${orderNumber.toString().padStart(4, '0')}`;
}

// Calculate cart total
export function calculateCartTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Check if object is empty
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

// Group array by key
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Play notification sound
export function playNotificationSound() {
  if (typeof window !== 'undefined') {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }
}

// Vibrate device
export function vibrateDevice(pattern: number | number[] = 200) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// Local storage helpers
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined') return defaultValue ?? null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  },
  
  set(key: string, value: any): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },
  
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};

// Session storage helpers
export const session = {
  get<T>(key: string, defaultValue?: T): T | null {
    if (typeof window === 'undefined') return defaultValue ?? null;
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  },
  
  set(key: string, value: any): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },
  
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  },
};

