// Mock data — Faz 7'de gerçek API ile değiştirilecek

export type MockCampaign = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  price: string;
  bgFrom: string;
  bgTo: string;
  emoji: string;
};

export type MockProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  rating: number;
  emoji: string;
  badge?: string;
  category: string;
};

export type MockCategory = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

export const CAMPAIGNS: MockCampaign[] = [
  {
    id: "c1",
    title: "2 Pizza 1 İçecek",
    subtitle: "Kaçırma — Bu hafta sonuna kadar",
    badge: "Bu hafta",
    price: "269 ₺",
    bgFrom: "#bb1e10", // primary
    bgTo: "#8a1610",
    emoji: "🍕",
  },
  {
    id: "c2",
    title: "Akşam Lezzetleri",
    subtitle: "18:00 - 22:00 arası %20 indirim",
    badge: "Sınırlı süre",
    price: "%20 indirim",
    bgFrom: "#005387", // accent
    bgTo: "#003d63",
    emoji: "🍝",
  },
  {
    id: "c3",
    title: "Burger + Patates",
    subtitle: "İçecek bizden ikram",
    badge: "Yeni",
    price: "189 ₺",
    bgFrom: "#8a1610", // primary-dark
    bgTo: "#5a0f0b",
    emoji: "🍔",
  },
];

export const CATEGORIES: MockCategory[] = [
  { id: "all", name: "Tümü", emoji: "🍽️", color: "#F97316" },
  { id: "pizza", name: "Pizza", emoji: "🍕", color: "#EF4444" },
  { id: "burger", name: "Burger", emoji: "🍔", color: "#F59E0B" },
  { id: "pasta", name: "Pasta", emoji: "🍝", color: "#10B981" },
  { id: "sandwich", name: "Sandviç", emoji: "🥪", color: "#3B82F6" },
  { id: "drink", name: "İçecek", emoji: "🥤", color: "#8B5CF6" },
  { id: "dessert", name: "Tatlı", emoji: "🍰", color: "#EC4899" },
];

export const PRODUCTS: MockProduct[] = [
  {
    id: "p1",
    name: "Margherita Pizza",
    description: "Domates, mozzarella, taze fesleğen",
    price: 149,
    oldPrice: 179,
    rating: 4.8,
    emoji: "🍕",
    badge: "Popüler",
    category: "pizza",
  },
  {
    id: "p2",
    name: "Pepperoni Pizza",
    description: "Bol pepperoni, mozzarella, mantar",
    price: 189,
    rating: 4.9,
    emoji: "🍕",
    badge: "En çok satan",
    category: "pizza",
  },
  {
    id: "p3",
    name: "Cheeseburger",
    description: "Dana köfte, cheddar, marul, soğan",
    price: 159,
    rating: 4.7,
    emoji: "🍔",
    category: "burger",
  },
  {
    id: "p4",
    name: "Carbonara",
    description: "Krema sos, parmesan, pastırma",
    price: 169,
    rating: 4.6,
    emoji: "🍝",
    category: "pasta",
  },
  {
    id: "p5",
    name: "Klasik Sandviç",
    description: "Hindi füme, kaşar, marul, domates",
    price: 89,
    rating: 4.5,
    emoji: "🥪",
    category: "sandwich",
  },
  {
    id: "p6",
    name: "Cola 330ml",
    description: "Buz gibi servis edilir",
    price: 35,
    rating: 4.4,
    emoji: "🥤",
    category: "drink",
  },
  {
    id: "p7",
    name: "Tiramisu",
    description: "İtalyan klasiği, mascarpone & kakao",
    price: 79,
    rating: 4.9,
    emoji: "🍰",
    badge: "Yeni",
    category: "dessert",
  },
];
