import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; wsUrl?: string }
  | undefined;

// Production API
export const API_URL = extra?.apiUrl ?? "https://api.highfivepps.com";
export const WS_URL = extra?.wsUrl ?? "wss://api.highfivepps.com/ws";

// Görsel URL'lerini absolute path'e çevir
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Fiyat string ya da number gelebiliyor — güvenli parse
export function parsePrice(p: string | number | null | undefined): number {
  if (p === null || p === undefined) return 0;
  if (typeof p === "number") return p;
  const n = parseFloat(p);
  return Number.isNaN(n) ? 0 : n;
}

const TOKEN_KEY = "hf_auth_token";

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token === null) await AsyncStorage.removeItem(TOKEN_KEY);
  else await AsyncStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (e: any) {
    // Network failure — anlamlı mesaj
    throw new ApiError(
      `Sunucuya ulaşılamıyor.\n\n` +
        `• İnternet bağlantını kontrol et\n` +
        `• ${API_URL} adresine ulaşılabilir mi?\n\n` +
        `Detay: ${e?.message ?? "bilinmiyor"}`,
      0,
      "NETWORK_ERROR",
    );
  }

  if (!res.ok) {
    let errMsg = `${res.status} ${res.statusText}`;
    let errCode: string | undefined;
    try {
      const j = (await res.json()) as { error?: string; code?: string };
      errMsg = j.error ?? errMsg;
      errCode = j.code;
    } catch {
      try {
        errMsg = await res.text();
      } catch {}
    }

    // Bilinen route'lar için daha açıklayıcı mesaj
    if (res.status === 404) {
      errMsg =
        `Endpoint bulunamadı: ${path}\n\n` +
        `Sunucudaki API güncel olmayabilir. Yöneticinin api.highfivepps.com'u son sürümle deploy etmesi gerek.\n\n` +
        `(${errMsg})`;
    } else if (res.status === 401) {
      errMsg = "Oturumun süresi doldu, tekrar giriş yap.";
    } else if (res.status >= 500) {
      errMsg = `Sunucu hatası (${res.status}). Lütfen tekrar dene.\n\n(${errMsg})`;
    }

    throw new ApiError(errMsg, res.status, errCode);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ==================== TYPES ====================

export type ApiCategory = {
  id: string;
  name: string;
  icon: string | null;
  image: string | null;
  sortOrder: number;
  active: boolean;
  printToKitchen: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  badges: string[];
  allergens: string[];
  calories: number | null;
  prepTime: number | null;
  available: boolean;
  sortOrder: number;
  featured?: boolean;
  discountPrice?: string | null;
  discountUntil?: string | null;
  category?: ApiCategory;
};

export type ApiCampaign = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  discountType?: string | null;
  discountValue?: number | null;
  minPurchase?: number | null;
  minItems?: number | null;
  image?: string | null;
};

export type ApiHappyHour = {
  id: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  discountType: string;
  discountPercent: number | null;
  discountAmount: number | null;
  isActive: boolean;
  items?: { menuItemId: string; specialPrice?: number; discountPercent?: number }[];
};

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type ApiOrderItem = {
  id: string;
  menuItemId: string | null;
  menuItemName: string | null;
  quantity: number;
  unitPrice: string;
  total: string;
  notes: string | null;
  modifiers: string[];
  status: OrderStatus;
  menuItem?: { id: string; name: string; image: string | null };
};

export type ApiOrder = {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  subtotal: string;
  tax: string;
  serviceCharge: string;
  deliveryFee: string;
  discount: string;
  total: string;
  tip: string;
  notes: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  items: ApiOrderItem[];
  courier?: { id: string; name: string; phone: string | null } | null;
  payments?: { id: string; amount: string; method: string; createdAt: string }[];
  pointsEarned?: number;
  pointsSpent?: number;
};

export type ApiLoyaltyTier = {
  id: string;
  name: string;
  minPoints: number;
  pointsMultiplier: string;
  discountPercent: string;
  color?: string | null;
  icon?: string | null;
};

export type ApiCustomer = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  totalPoints: number;
  lifetimePoints: number;
  orderCount: number;
  totalSpent: string;
  loyaltyTier: ApiLoyaltyTier | null;
};

export type ApiPointsTransaction = {
  id: string;
  customerId: string;
  orderId: string | null;
  points: number;
  type: "EARN" | "SPEND" | "BONUS" | "EXPIRE" | "ADJUSTMENT";
  description: string | null;
  createdAt: string;
};

export type ApiAddress = {
  id: string;
  customerId: string;
  label: string;
  fullAddress: string;
  district: string | null;
  city: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type ApiNotificationPreferences = {
  id: string;
  customerId: string;
  pushEnabled: boolean;
  orderStatus: boolean;
  campaigns: boolean;
  loyalty: boolean;
  marketing: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

// ==================== ENDPOINTS ====================

export const endpoints = {
  // PUBLIC
  menu: () =>
    api.get<{ categories: ApiCategory[]; items: ApiMenuItem[] }>("/api/menu"),
  menuItem: (id: string) => api.get<ApiMenuItem>(`/api/menu/${id}`),
  campaigns: () =>
    api.get<{ campaigns: ApiCampaign[] }>("/api/campaigns/active"),
  happyHours: () => api.get<{ active: ApiHappyHour[] }>("/api/happyhours/active"),
  health: () => api.get<{ status: string; timestamp: string }>("/health"),

  // AUTH
  requestOtp: (phone: string) =>
    api.post<{ ok: true; devCode?: string }>(
      "/api/mobile/auth/request-otp",
      { phone },
    ),
  verifyOtp: (phone: string, code: string) =>
    api.post<{
      token: string;
      user: ApiCustomer;
    }>("/api/mobile/auth/verify-otp", { phone, code }),
  me: () => api.get<{ user: ApiCustomer }>("/api/mobile/me"),
  updateMe: (data: { name?: string; email?: string }) =>
    api.patch<{ user: ApiCustomer }>("/api/mobile/me", data),

  // DEVICES (push token)
  registerDevice: (
    token: string,
    platform: "ios" | "android",
    extra?: { deviceId?: string; appVersion?: string; locale?: string },
  ) =>
    api.post<{ ok: true; deviceId: string }>(
      "/api/mobile/devices/register",
      { token, platform, ...extra },
    ),
  unregisterDevice: (token: string) =>
    api.post<{ ok: true }>("/api/mobile/devices/unregister", { token }),

  // ORDERS
  createOrder: (data: {
    type: OrderType;
    items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
    addressId?: string;
    customerAddress?: string;
    customerLatitude?: number;
    customerLongitude?: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    tip?: number;
    pointsToRedeem?: number;
    couponCode?: string;
    paymentMethod?: "CASH" | "ONLINE" | "CREDIT_CARD";
  }) => api.post<{ order: ApiOrder & { discountBreakdown: any } }>("/api/mobile/orders", data),

  // GUEST ORDER (auth opsiyonel — ad+telefon ile)
  createGuestOrder: (data: {
    type: OrderType;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress?: string;
    customerLatitude?: number;
    customerLongitude?: number;
    items: { menuItemId: string; quantity: number; notes?: string; modifiers?: string[] }[];
    notes?: string;
    tip?: number;
    paymentMethod?: "CASH" | "ONLINE" | "CREDIT_CARD";
  }) =>
    api.post<{
      order: ApiOrder;
      token: string;
      customer: { id: string; phone: string; name: string | null; isVerified: boolean };
    }>("/api/mobile/orders/guest", data),
  myOrders: (params?: { limit?: number; status?: string; before?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.status) q.set("status", params.status);
    if (params?.before) q.set("before", params.before);
    const qs = q.toString();
    return api.get<{ orders: ApiOrder[] }>(
      `/api/mobile/orders${qs ? `?${qs}` : ""}`,
    );
  },
  orderDetail: (id: string) =>
    api.get<{ order: ApiOrder }>(`/api/mobile/orders/${id}`),
  cancelOrder: (id: string) =>
    api.post<{ order: ApiOrder }>(`/api/mobile/orders/${id}/cancel`),

  // PAYMENT (3DS)
  initialize3DS: (data: {
    orderId: string;
    cardNumber: string;
    cardHolderName: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    email?: string;
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    tipAmount?: number;
  }) =>
    api.post<{ htmlContent: string; conversationId: string }>(
      "/api/payment/initialize-3ds",
      data,
    ),
  complete3DS: (paymentId: string) =>
    api.post<{ success: boolean; payment: any }>(
      "/api/payment/complete-3ds",
      { paymentId },
    ),
  paymentStatus: (conversationId: string) =>
    api.get<{ status: string }>(
      `/api/payment/status/${conversationId}`,
    ),

  // LOYALTY
  loyaltyMe: () =>
    api.get<{
      customer: ApiCustomer;
      nextTier: ApiLoyaltyTier | null;
      pointsToNextTier: number | null;
      recentTransactions: ApiPointsTransaction[];
      pointsRules: { earnRate: string; redeemRate: string; minRedemption: number };
    }>("/api/mobile/loyalty/me"),
  loyaltyHistory: (params?: { limit?: number; before?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.before) q.set("before", params.before);
    const qs = q.toString();
    return api.get<{ transactions: ApiPointsTransaction[] }>(
      `/api/mobile/loyalty/history${qs ? `?${qs}` : ""}`,
    );
  },
  calcRedeem: (points: number) =>
    api.post<{
      pointsToRedeem: number;
      discountAmount: number;
      remainingPoints: number;
    }>("/api/mobile/loyalty/calc-redeem", { points }),

  // ADDRESSES
  addresses: () => api.get<{ addresses: ApiAddress[] }>("/api/mobile/addresses"),
  createAddress: (data: Partial<ApiAddress>) =>
    api.post<{ address: ApiAddress }>("/api/mobile/addresses", data),
  updateAddress: (id: string, data: Partial<ApiAddress>) =>
    api.patch<{ address: ApiAddress }>(`/api/mobile/addresses/${id}`, data),
  deleteAddress: (id: string) =>
    api.del<{ ok: true }>(`/api/mobile/addresses/${id}`),
  setDefaultAddress: (id: string) =>
    api.post<{ ok: true }>(`/api/mobile/addresses/${id}/default`),

  // FAVORITES
  favorites: () =>
    api.get<{ favorites: { id: string; menuItemId: string; createdAt: string }[]; items: ApiMenuItem[] }>(
      "/api/mobile/favorites",
    ),
  toggleFavorite: (menuItemId: string) =>
    api.post<{ favorited: boolean }>(`/api/mobile/favorites/${menuItemId}`),

  // PREFS
  notificationPrefs: () =>
    api.get<{ preferences: ApiNotificationPreferences }>(
      "/api/mobile/prefs/notifications",
    ),
  updateNotificationPrefs: (data: Partial<ApiNotificationPreferences>) =>
    api.patch<{ preferences: ApiNotificationPreferences }>(
      "/api/mobile/prefs/notifications",
      data,
    ),

  // COUPON validation
  validateCoupon: (code: string, orderTotal: number) =>
    api.post<{ valid: boolean; discount?: number; coupon?: any; error?: string }>(
      "/api/coupons/validate",
      { code, orderTotal },
    ),
};
