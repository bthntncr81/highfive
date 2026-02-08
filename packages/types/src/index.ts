// HighFive Suite - Shared Types

// User types
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN',
  CASHIER = 'CASHIER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Table types
export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  CLEANING = 'CLEANING',
}

export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: TableStatus;
  positionX?: number;
  positionY?: number;
  floor: number;
  orders?: Order[];
}

// Menu types
export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  active: boolean;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  badges: string[];
  prepTime?: number;
  available: boolean;
  category?: Category;
  modifiers?: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

// Order types
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY',
  WHATSAPP = 'WHATSAPP',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  ONLINE = 'ONLINE',
  MULTINET = 'MULTINET',
  SODEXO = 'SODEXO',
  TICKET = 'TICKET',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export interface Order {
  id: string;
  orderNumber: number;
  tableId?: string;
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  tip: number;
  notes?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  table?: Table;
  user?: User;
  items: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  modifiers: string[];
  status: OrderStatus;
  menuItem: MenuItem;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  createdAt: string;
}

// Cart types (for POS)
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  modifiers: string[];
}

// WebSocket message types
export interface WSMessage {
  type: string;
  channel?: string;
  data?: any;
  timestamp?: string;
}

// Report types
export interface DailySummary {
  date: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    cashAmount: number;
    cardAmount: number;
    otherAmount: number;
    cancelledOrders: number;
    avgOrderTime?: number;
  };
  topItems: {
    id: string;
    name: string;
    count: number;
    revenue: number;
  }[];
  hourlyBreakdown: Record<number, { orders: number; revenue: number }>;
}

// Settings types
export interface RestaurantSettings {
  name: string;
  phone: string;
  address: string;
  taxRate: number;
  currency: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  phone: string;
  defaultMessage: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

