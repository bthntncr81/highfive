import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

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

// KRİTİK: JWT token expo-secure-store'a (iOS Keychain / Android Keystore) taşındı.
// Eski AsyncStorage anahtarı 'hf_auth_token' migration için tutuluyor:
// uygulama ilk açılışta varsa SecureStore'a kopyalanır + AsyncStorage'tan silinir.
const TOKEN_KEY = "hf_auth_token";
const LEGACY_TOKEN_KEY = "hf_auth_token";

export async function getToken(): Promise<string | null> {
  try {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    if (t) return t;
  } catch {
    // SecureStore okunamadıysa AsyncStorage fallback'i dene
  }

  // Migration: legacy AsyncStorage'da kalan token varsa SecureStore'a taşı
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      try {
        await SecureStore.setItemAsync(TOKEN_KEY, legacy);
      } catch {}
      try {
        await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
      } catch {}
      return legacy;
    }
  } catch {}

  return null;
}

export async function setToken(token: string | null): Promise<void> {
  if (token === null) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {}
    try {
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // SecureStore başarısız olursa AsyncStorage'a yaz (graceful degrade,
    // ama log'la — sandbox/simulator dışında bu olmamalı)
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[api] SecureStore.setItemAsync failed, falling back to AsyncStorage");
    }
    await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
  }
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

// 401 sırasında otomatik logout için (auth.ts'in setSession'ını import etmeden)
async function clearSessionLocal() {
  await setToken(null);
  // AsyncStorage'da auth key'ini de temizle (zustand persist için)
  try {
    await AsyncStorage.removeItem("highfive-auth");
  } catch {}
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
    throw new ApiError(
      `Sunucuya ulaşılamıyor. İnternet bağlantını kontrol et.`,
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

    if (res.status === 404) {
      errMsg =
        `Endpoint bulunamadı: ${path}\n\n` +
        `Sunucu eski sürümde olabilir.`;
    } else if (res.status === 401) {
      // Token YOK → giriş yapmamış (normal). VAR → server reddetti.
      // ESKİDEN: clearSessionLocal token'ı silerdi — hydration race / transient 401
      // sırasında yanlışlıkla logout yapıyordu. ARTIK: sadece error throw, token korunur.
      // Calling code 401'i kendisi handle etsin (yumuşak prompt).
      if (token) {
        errMsg = "Yetki gerekli.";
        errCode = "TOKEN_EXPIRED";
        console.log(`[api] 401 with token, path=${path} — token KORUNUYOR`);
      } else {
        errMsg = "Bu işlem için giriş yapman gerek.";
        errCode = "AUTH_REQUIRED";
      }
    } else if (res.status >= 500) {
      errMsg = `Sunucu hatası (${res.status}). Lütfen tekrar dene.`;
    }

    throw new ApiError(errMsg, res.status, errCode);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Sessiz çağrı: 401/404 olursa exception fırlatma, null döner
async function requestSilent<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  try {
    return await request<T>(path, init);
  } catch (e: any) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
      return null;
    }
    throw e;
  }
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
  // Sessiz çağrı — 401/404 sessizce null döner, Alert açmaz
  getSilent: <T>(path: string) => requestSilent<T>(path),
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

export type ApiBundleOptionGroup = {
  id: string;
  name: string;
  description: string | null;
  minSelect: number;
  maxSelect: number;
  items: {
    id: string;
    extraPrice: string | number;
    isDefault: boolean;
    menuItem: { id: string; name: string; price: string | number; image: string | null };
  }[];
};

export type ApiBundle = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  categoryId: string | null;
  originalPrice: string;
  bundlePrice: string;
  savings: string;
  isActive: boolean;
  soldCount: number;
  startDate: string | null;
  endDate: string | null;
  items: { quantity: number; menuItem: { id: string; name: string; image: string | null } }[];
  // Reusable opsiyon grupları (yeni sistem) — her assignment.quantity slot oluşturur
  optionGroupAssignments?: {
    id: string;
    sortOrder: number;
    quantity: number;
    optionGroup: ApiBundleOptionGroup;
  }[];
};

// ==================== ENDPOINTS ====================

export const endpoints = {
  // PUBLIC
  menu: () =>
    api.get<{ categories: ApiCategory[]; items: ApiMenuItem[]; bundles?: ApiBundle[] }>(
      "/api/menu",
    ),
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
  updateMe: (data: {
    name?: string;
    email?: string;
    emailConsent?: boolean;
    smsConsent?: boolean;
  }) => api.patch<{ user: ApiCustomer }>("/api/mobile/me", data),

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
    bundles?: {
      bundleId: string;
      quantity?: number;
      // Yeni slot bazlı format (assignment + slotIndex)
      selections?: { assignmentId: string; slotIndex: number; optionGroupItemIds: string[] }[];
      // Geriye uyumluluk
      assignedSelections?: { optionGroupId: string; optionGroupItemIds: string[] }[];
    }[];
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
    bundles?: {
      bundleId: string;
      quantity?: number;
      selections?: { assignmentId: string; slotIndex: number; optionGroupItemIds: string[] }[];
      assignedSelections?: { optionGroupId: string; optionGroupItemIds: string[] }[];
    }[];
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

  // PAYMENT (3DS) — backend customerName/customerEmail/customerPhone zorunlu
  initialize3DS: (data: {
    orderId: string;
    cardNumber: string;
    cardHolderName: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress?: string;
    customerCity?: string;
    customerIp?: string;
  }) =>
    api.post<{ htmlContent: string; conversationId: string; success?: boolean }>(
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

  // LOYALTY — public, herkese açık (login gerekmez)
  loyaltyPrograms: () =>
    api.get<{
      programs: {
        id: string;
        type: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        config: any;
        applicableMenuItemIds: string[];
        rewardMenuItemIds: string[];
        applicableMenuItems?: { id: string; name: string; price: string; image: string | null; categoryId: string | null }[];
        rewardMenuItems?: { id: string; name: string; price: string; image: string | null; categoryId: string | null }[];
      }[];
    }>("/api/mobile/loyalty/programs"),

  // GAMES — Spin wheel, achievements, scratch card
  gameSpinConfig: () =>
    api.get<{
      config: {
        id: string;
        name: string;
        description: string | null;
        cooldownHours: number;
        minCartTotal: number;
        slices: Array<{
          label: string;
          type: string;
          value: number;
          color: string;
          emoji: string | null;
        }>;
        canSpin?: boolean;
        nextSpinAt?: string | null;
      } | null;
    }>("/api/games/spin/config"),

  gameSpinPlay: () =>
    api.post<{
      attempt: {
        id: string;
        prizeIndex: number;
        prizeLabel: string;
        prizeType: string;
        prizeValue: number | null;
        couponId: string | null;
        pointsAwarded: number;
      };
    }>("/api/games/spin/play", {}),

  gameAchievementsMe: () =>
    api.get<{
      achievements: Array<{
        id: string;
        key: string;
        name: string;
        description: string;
        icon: string;
        type: string;
        rewardPoints: number;
        unlocked: boolean;
        unlockedAt: string | null;
        seenAt: string | null;
      }>;
    }>("/api/games/achievements/me"),

  gameAchievementSeen: (id: string) =>
    api.post<{ updated: number }>(`/api/games/achievements/${id}/seen`, {}),

  gameScratchIssue: (orderId: string) =>
    api.post<{
      reward: {
        id: string;
        prizeType: string;
        prizeLabel: string;
        prizeValue: number | null;
        couponId: string | null;
        scratchedAt: string | null;
      } | null;
    }>(`/api/games/scratch/issue/${orderId}`, {}),

  gameScratchOpen: (id: string) =>
    api.post<{
      reward: {
        id: string;
        prizeType: string;
        prizeLabel: string;
        prizeValue: number | null;
        couponId: string | null;
        scratchedAt: string | null;
      };
    }>(`/api/games/scratch/${id}/scratch`, {}),

  gameLeaderboard: () =>
    api.get<{
      weekStart: string;
      myRank: number | null;
      myPoints: number;
      leaderboard: Array<{
        rank: number;
        name: string;
        points: number;
        tier: { name: string; icon: string | null; color: string | null } | null;
        isMe: boolean;
      }>;
    }>("/api/games/leaderboard"),

  // CART OFFERS — sepete uygun en avantajlı sadakat (auth opsiyonel)
  cartEvaluate: (items: Array<{ menuItemId: string; quantity: number; unitPrice: number }>) =>
    api.post<{
      bestOffer: {
        source: "PROGRAM" | "COUPON" | "TIER";
        programId?: string;
        programType?: string;
        couponId?: string;
        couponCode?: string;
        name: string;
        description?: string;
        discountType: "PERCENT" | "FIXED";
        discountValue: number;
        calculatedDiscount: number;
      } | null;
      allOffers: any[];
      subtotal: number;
    }>("/api/mobile/loyalty/cart/evaluate", { items }),

  // LOYALTY
  loyaltyMe: () =>
    api.get<{
      customer: ApiCustomer;
      nextTier: ApiLoyaltyTier | null;
      pointsToNextTier: number | null;
      recentTransactions: ApiPointsTransaction[];
      pointsRules: { earnRate: string; redeemRate: string; minRedemption: number };
    }>("/api/mobile/loyalty/me"),

  // Yeni: aktif sadakat programları + her programda kullanıcı durumu
  loyaltyProgress: () =>
    api.get<{
      customer: {
        id: string;
        name: string | null;
        phone: string;
        email: string | null;
        totalPoints: number;
        lifetimePoints: number;
        cashbackBalance: string | number;
        referralCode: string | null;
        referralCount: number;
        currentStreak: number;
        longestStreak: number;
        orderCount: number;
        loyaltyTier: ApiLoyaltyTier | null;
        birthDate: string | null;
      };
      programs: {
        id: string;
        type: string;
        name: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        config: any;
        applicableMenuItemIds: string[];
      }[];
      progress: {
        id: string;
        programId: string;
        data: any;
      }[];
    }>("/api/mobile/loyalty/me/progress"),

  applyReferralCode: (code: string) =>
    api.post<{ ok: true; referrer: { name: string | null; phone: string } }>(
      "/api/mobile/loyalty/apply-referral",
      { code },
    ),
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
