// API Client for connecting to HighFive Suite backend
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || "Bir hata oluştu",
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error("API Error:", error);
      return {
        success: false,
        error: "Sunucuya bağlanılamadı",
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }
}

export const api = new ApiClient(API_BASE);

// ==================== TYPES ====================

// Allergen types
export type Allergen = 
  | 'GLUTEN' | 'DAIRY' | 'EGGS' | 'FISH' | 'SHELLFISH' 
  | 'NUTS' | 'PEANUTS' | 'SOY' | 'SESAME' | 'CELERY' 
  | 'MUSTARD' | 'SULPHITES' | 'LUPIN' | 'MOLLUSCS';

// Allergen display info
export const ALLERGEN_INFO: Record<Allergen, { icon: string; name: string }> = {
  GLUTEN: { icon: '🌾', name: 'Gluten' },
  DAIRY: { icon: '🥛', name: 'Süt' },
  EGGS: { icon: '🥚', name: 'Yumurta' },
  FISH: { icon: '🐟', name: 'Balık' },
  SHELLFISH: { icon: '🦐', name: 'Kabuklu Deniz' },
  NUTS: { icon: '🥜', name: 'Fındık/Ceviz' },
  PEANUTS: { icon: '🥜', name: 'Yer Fıstığı' },
  SOY: { icon: '🫘', name: 'Soya' },
  SESAME: { icon: '🌱', name: 'Susam' },
  CELERY: { icon: '🥬', name: 'Kereviz' },
  MUSTARD: { icon: '🟡', name: 'Hardal' },
  SULPHITES: { icon: '🧪', name: 'Sülfit' },
  LUPIN: { icon: '🌸', name: 'Lupin' },
  MOLLUSCS: { icon: '🐚', name: 'Yumuşakça' },
};

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  badges?: string[];
  allergens?: Allergen[];
  calories?: number;
  prepTime?: number;
  available: boolean;
  featured?: boolean;
  discountPrice?: number;
  discountUntil?: string;
  stockQuantity?: number | null;
  outOfStockReason?: string | null;
  category: {
    id: string;
    name: string;
    icon?: string;
  };
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  modifiers?: string[];
  isUpsell?: boolean;
  isCrossSell?: boolean;
}

export interface CreateOrderRequest {
  tableId?: string;
  sessionToken?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  items: OrderItem[];
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  notes?: string;
  tip?: number;
  deliveryFee?: number;
}

export interface TableInfo {
  id: string;
  number: number;
  name: string;
  status: string;
  sessionToken?: string;
}

export interface UpsellSuggestion {
  id: string;
  item: MenuItem;
  message?: string;
  discountAmount?: number;
}

export interface CrossSellSuggestion {
  id: string;
  item: MenuItem;
  message?: string;
  discountAmount?: number;
}

export interface HappyHour {
  id: string;
  name: string;
  description?: string;
  endTime: string;
  discountPercent?: number;
  items: {
    menuItem: MenuItem;
    specialPrice?: number;
    discountPercent?: number;
  }[];
}

export interface TipSuggestion {
  percent: number;
  amount: number;
}

// ==================== API METHODS ====================

export const orderApi = {
  // Get table info (public)
  getTable: (tableId: string) =>
    api.get<{ table: TableInfo }>(`/api/tables/${tableId}/public`),

  // Get menu items with categories (public)
  getMenu: () => api.get<{ categories: Category[]; items: MenuItem[] }>("/api/menu"),

  // Get categories (public)
  getCategories: () => api.get<{ categories: any[] }>("/api/categories"),

  // Create customer order (public - for QR and web orders)
  createOrder: (order: CreateOrderRequest) =>
    api.post<{ order: any }>("/api/orders/customer", order),

  // Get order status (public - for tracking)
  getOrderStatus: (orderId: string) =>
    api.get<{ order: OrderStatus }>(`/api/orders/${orderId}/status`),

  // Check if API is available
  health: () => api.get<{ status: string }>("/health"),
};

// Order Status type for tracking
export interface OrderStatus {
  id: string;
  orderNumber: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  customerName?: string;
  total: number;
  createdAt: string;
  estimatedTime?: number;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

// Upselling & Cross-selling API
export const suggestionApi = {
  // Get upsell suggestions for an item
  getUpsells: (menuItemId: string) =>
    api.get<{ suggestions: UpsellSuggestion[] }>(`/api/menu/${menuItemId}/upsells`),

  // Get cross-sell suggestions for cart
  getCrossSells: (cartItemIds: string[]) =>
    api.post<{ suggestions: CrossSellSuggestion[] }>("/api/crosssells/suggestions", {
      cartItemIds,
    }),

  // Track upsell acceptance
  trackUpsellAccepted: (upsellId: string, orderId?: string) =>
    api.post(`/api/upsells/${upsellId}/accepted`, { orderId }),

  // Track cross-sell acceptance
  trackCrossSellAccepted: (crossSellId: string, orderId?: string) =>
    api.post(`/api/crosssells/${crossSellId}/accepted`, { orderId }),
};

// Happy Hour API
export const happyHourApi = {
  // Get active happy hours
  getActive: (locationId?: string) =>
    api.get<{ active: HappyHour[] }>(
      `/api/happyhours/active${locationId ? `?locationId=${locationId}` : ""}`
    ),

  // Calculate price with happy hour discount
  calculatePrice: (menuItemId: string, locationId?: string) =>
    api.post<{
      originalPrice: number;
      finalPrice: number;
      discount: number;
      appliedHappyHour: string | null;
    }>("/api/happyhours/calculate-price", { menuItemId, locationId }),
};

// Tip API
export const tipApi = {
  // Get tip suggestions
  getSuggestions: (orderId: string) =>
    api.get<{
      baseAmount: number;
      suggestions: TipSuggestion[];
      customAllowed: boolean;
    }>(`/api/orders/${orderId}/tip-suggestions`),

  // Add tip to order
  addTip: (orderId: string, amount?: number, percent?: number) =>
    api.post<{ success: boolean; tip: number; newTotal: number }>(
      `/api/orders/${orderId}/tip`,
      { amount, percent }
    ),
};

// Service Charge API
export const serviceChargeApi = {
  // Get service charge settings
  getSettings: (locationId?: string) =>
    api.get<{
      serviceCharge: number;
      serviceChargeType: string;
    }>(`/api/settings/service-charge${locationId ? `?locationId=${locationId}` : ""}`),

  // Calculate service charge
  calculate: (subtotal: number, locationId?: string, orderType?: string) =>
    api.post<{
      subtotal: number;
      serviceCharge: number;
      serviceChargeRate: number;
      serviceChargeType: string;
      total: number;
    }>("/api/orders/calculate-service-charge", {
      subtotal,
      locationId,
      orderType,
    }),
};

// Payment API
export const paymentApi = {
  // Initialize 3DS payment
  initialize3DS: (data: {
    orderId: string;
    cardNumber: string;
    cardHolderName: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    email: string;
    name: string;
    phone: string;
    address?: string;
    city?: string;
    tipAmount?: number;
  }) => api.post<{ htmlContent: string; conversationId: string }>("/api/payment/initialize-3ds", data),

  // Complete 3DS payment
  complete3DS: (data: { paymentId: string }) =>
    api.post<{ success: boolean; order: any }>("/api/payment/complete-3ds", data),
};

// Analytics API
export const analyticsApi = {
  // Track event
  trackEvent: (eventType: string, eventData?: any, sessionId?: string) =>
    api.post("/api/analytics/track", {
      eventType,
      eventData,
      sessionId,
      deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      userAgent: navigator.userAgent,
    }),
};

// Loyalty Types
export interface LoyaltyTier {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  discountPercent?: number;
  pointMultiplier?: number;
}

export interface LoyaltyCustomer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  totalPoints: number;
  lifetimePoints?: number;
  loyaltyTier?: LoyaltyTier;
}

// Loyalty Program API
export const loyaltyApi = {
  // Lookup customer by phone
  lookupCustomer: (phone: string) =>
    api.get<{ customer: LoyaltyCustomer | null }>(`/api/loyalty/customers/phone/${encodeURIComponent(phone)}`),

  // Register new customer
  register: (data: {
    phone: string;
    name?: string;
    email?: string;
    birthDate?: string;
    smsConsent?: boolean;
    emailConsent?: boolean;
  }) =>
    api.post<{
      customer: LoyaltyCustomer;
      message: string;
    }>("/api/loyalty/customers/register", data),

  // Calculate points for amount
  calculatePoints: (amount: number, customerId?: string) =>
    api.post<{
      basePoints: number;
      multiplier: number;
      finalPoints: number;
    }>("/api/loyalty/calculate-points", { amount, customerId }),

  // Redeem points
  redeemPoints: (customerId: string, points: number) =>
    api.post<{
      pointsToRedeem: number;
      discountAmount: number;
      remainingPoints: number;
    }>("/api/loyalty/redeem-points", { customerId, points }),

  // Validate coupon
  validateCoupon: (code: string, orderTotal: number, customerId?: string) =>
    api.post<{
      valid: boolean;
      coupon?: {
        id: string;
        code: string;
        name: string;
        discountType: string;
        discountValue: number;
      };
      discount?: number;
    }>("/api/coupons/validate", { code, orderTotal, customerId }),

  // Get active campaigns
  getActiveCampaigns: () =>
    api.get<{ campaigns: any[] }>("/api/campaigns/active"),

  // Get active bundles
  getActiveBundles: () =>
    api.get<{ bundles: any[] }>("/api/bundles/active"),
};
