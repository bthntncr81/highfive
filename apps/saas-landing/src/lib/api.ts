// OtOrder platform API client — /api/platform/* + /api/auth/login.
// API_BASE: prod'da boş (aynı origin, nginx /api → api.otorder.com proxy) veya
// VITE_API_URL ile override.
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Hata (${res.status})`);
  return data as T;
}

export interface Plan {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxLocations: number;
  maxUsers: number;
  features: Record<string, boolean>;
}

export const api = {
  plans: () => req<{ plans: Plan[] }>('/api/platform/billing/plans'),

  checkSubdomain: (subdomain: string) =>
    req<{ available: boolean; reason?: string }>(
      `/api/platform/signup/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`,
    ),

  signup: (body: {
    name: string;
    email: string;
    password: string;
    restaurantName: string;
    subdomain: string;
    planKey: string;
  }) =>
    req<{ token: string; tenant: { subdomain: string }; loginUrl: string }>(
      '/api/platform/signup',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  login: (email: string, password: string) =>
    req<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

export const BASE_DOMAIN = (import.meta as any).env?.VITE_BASE_DOMAIN || 'otorder.com';
