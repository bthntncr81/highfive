// OtOrder platform super-admin API client — /api/platform/admin/*.
// Same-origin in prod (nginx proxies /api). Dev: VITE_API_URL override or vite proxy.
// Bearer token lives in localStorage; any 401 clears it and redirects to /login.

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const TOKEN_KEY = 'otorder.admin.token';

export const BASE_DOMAIN = (import.meta as any).env?.VITE_BASE_DOMAIN || 'otorder.com';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init?: RequestInit & { skipAuthRedirect?: boolean }): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/platform${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  // Expired/invalid session → drop token, back to login (except the login call itself)
  if (res.status === 401 && !init?.skipAuthRedirect) {
    clearToken();
    if (window.location.pathname !== '/login') window.location.href = '/login';
    throw new Error('Oturum süresi doldu');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Hata (${res.status})`);
  return data as T;
}

// --- Response shapes (mirrors apps/api/src/routes/platform/admin.ts) ---

export interface Metrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  totalRevenue: number;
  tenantsByStatus: Record<string, number>;
}

export interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  trialEndsAt: string | null;
  createdAt: string;
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  users: number;
  locations: number;
  orders: number;
}

export interface TenantMember {
  role: string;
  active: boolean;
  email: string;
  name: string | null;
}

export interface BillingTx {
  id: string;
  tenantId?: string;
  tenantName?: string | null;
  subdomain?: string | null;
  type: string;
  amount: number;
  currency?: string;
  success: boolean;
  errorMessage: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface TenantDetail {
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    createdAt: string;
    trialEndsAt: string | null;
    onboardingStep: number;
  };
  subscription: {
    status: string;
    cycle: string;
    plan: string;
    planName: string;
    monthlyPrice: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    failedAttempts: number;
    whatsappAI: boolean;
  } | null;
  members: TenantMember[];
  usage: {
    locations: number;
    ordersTotal: number;
    ordersLast30d: number;
    menuItems: number;
    categories: number;
    openTickets: number;
  };
  theme: {
    published: boolean;
    customLanding: string | null;
    logoUrl: string | null;
  };
  transactions: BillingTx[];
}

export interface TicketReply {
  id: string;
  fromAdmin: boolean;
  authorName: string | null;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  tenantId: string;
  tenant: { name: string; subdomain: string };
  openedByName: string | null;
  type: 'REQUEST' | 'COMPLAINT' | 'ISSUE';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  source: string;
  subject: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

// --- Endpoints ---

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string; email: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuthRedirect: true,
    }),

  metrics: () => req<Metrics>('/admin/metrics'),

  tenants: (params?: { status?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    const s = qs.toString();
    return req<{ tenants: TenantRow[] }>(`/admin/tenants${s ? `?${s}` : ''}`);
  },

  tenant: (id: string) => req<TenantDetail>(`/admin/tenants/${id}`),

  suspendTenant: (id: string) =>
    req<{ success: boolean; status: string }>(`/admin/tenants/${id}/suspend`, { method: 'POST' }),

  activateTenant: (id: string) =>
    req<{ success: boolean; status: string }>(`/admin/tenants/${id}/activate`, { method: 'POST' }),

  giftPlan: (id: string, planKey: string, months: number) =>
    req<{ success: boolean; plan: string; until: string }>(`/admin/tenants/${id}/plan`, {
      method: 'POST',
      body: JSON.stringify({ planKey, months }),
    }),

  impersonate: (id: string) =>
    req<{ token: string; tenant: { id: string; subdomain: string; name: string } }>(
      `/admin/tenants/${id}/impersonate`,
      { method: 'POST' },
    ),

  transactions: (params?: { tenantId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tenantId) qs.set('tenantId', params.tenantId);
    if (params?.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return req<{ transactions: BillingTx[] }>(`/admin/transactions${s ? `?${s}` : ''}`);
  },

  tickets: (params?: { status?: string; tenantId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.tenantId) qs.set('tenantId', params.tenantId);
    const s = qs.toString();
    return req<{ tickets: Ticket[] }>(`/admin/tickets${s ? `?${s}` : ''}`);
  },

  replyTicket: (id: string, message: string) =>
    req<{ reply: TicketReply }>(`/admin/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  updateTicket: (id: string, data: { status?: string; priority?: string }) =>
    req<{ ticket: Ticket }>(`/admin/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
