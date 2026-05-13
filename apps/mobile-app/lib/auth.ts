import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken, getToken, api } from "./api";

export type AuthUser = {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  totalPoints?: number;
  isVerified?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean; // AsyncStorage'dan persist okuması bitti mi
  setSession: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  // SMS OTP (legacy, master kod 999999 ile)
  requestOtp: (
    phone: string,
  ) => Promise<{ ok: true; devCode?: string }>;
  verifyOtp: (
    phone: string,
    code: string,
    extra?: { name?: string; email?: string },
  ) => Promise<{ user: AuthUser; token: string }>;
  // Email OTP (yeni, /api/auth/customer/email/...)
  requestEmailOtp: (
    email: string,
    extra?: {
      name?: string;
      phone?: string;
      gender?: "MALE" | "FEMALE" | "OTHER";
      birthDate?: string; // ISO YYYY-MM-DD
      termsAccepted?: boolean;
      kvkkAccepted?: boolean;
      marketingConsent?: boolean;
    },
  ) => Promise<{ success: true; message: string }>;
  verifyEmailOtp: (
    email: string,
    code: string,
  ) => Promise<{ user: AuthUser; token: string }>;
  refreshMe: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hydrated: false,

      setSession: async (token, user) => {
        await setToken(token);
        set({ token, user });
      },

      logout: async () => {
        await setToken(null);
        set({ token: null, user: null });
      },

      hydrate: async () => {
        // persist middleware zaten storage'tan yükler;
        // bu sadece API client'ın token'ı görmesi için
        const t = get().token;
        if (t) await setToken(t);
      },

      requestOtp: async (phone: string) => {
        return api.post<{ ok: true; devCode?: string }>(
          "/api/mobile/auth/request-otp",
          { phone },
        );
      },

      verifyOtp: async (
        phone: string,
        code: string,
        extra?: { name?: string; email?: string },
      ) => {
        const res = await api.post<{
          token: string;
          user: AuthUser;
        }>("/api/mobile/auth/verify-otp", {
          phone,
          code,
          name: extra?.name,
          email: extra?.email,
        });
        await setToken(res.token);
        set({ token: res.token, user: res.user });

        // Login sonrası push device kaydı
        try {
          const { initPushNotifications } = await import("./push");
          initPushNotifications().catch(() => { /* silent */ });
        } catch { /* skip */ }

        return res;
      },

      // ----- EMAIL OTP -----
      requestEmailOtp: async (
        email: string,
        extra?: {
          name?: string;
          phone?: string;
          gender?: "MALE" | "FEMALE" | "OTHER";
          birthDate?: string;
          termsAccepted?: boolean;
          kvkkAccepted?: boolean;
          marketingConsent?: boolean;
        },
      ) => {
        return api.post<{ success: true; message: string }>(
          "/api/auth/customer/email/request-otp",
          {
            email,
            ...(extra?.name ? { name: extra.name } : {}),
            ...(extra?.phone ? { phone: extra.phone } : {}),
            ...(extra?.gender ? { gender: extra.gender } : {}),
            ...(extra?.birthDate ? { birthDate: extra.birthDate } : {}),
            ...(extra?.termsAccepted !== undefined ? { termsAccepted: extra.termsAccepted } : {}),
            ...(extra?.kvkkAccepted !== undefined ? { kvkkAccepted: extra.kvkkAccepted } : {}),
            ...(extra?.marketingConsent !== undefined ? { marketingConsent: extra.marketingConsent } : {}),
          },
        );
      },

      verifyEmailOtp: async (email: string, code: string) => {
        const res = await api.post<{
          success: true;
          token: string;
          customer: {
            id: string;
            email: string | null;
            name: string | null;
            phone: string | null;
            totalPoints: number;
            loyaltyTier: any;
          };
        }>("/api/auth/customer/email/verify-otp", { email, code });
        const user: AuthUser = {
          id: res.customer.id,
          phone: res.customer.phone ?? "",
          name: res.customer.name,
          email: res.customer.email,
          totalPoints: res.customer.totalPoints,
          isVerified: true,
        };
        await setToken(res.token);
        set({ token: res.token, user });

        // Login sonrası push device kaydı (token'la birlikte customer'a bind edilir)
        // Lazy import — circular dep önleme
        try {
          const { initPushNotifications } = await import("./push");
          initPushNotifications().catch(() => { /* silent */ });
        } catch { /* push.ts yüklenemezse skip */ }

        return { user, token: res.token };
      },

      refreshMe: async () => {
        try {
          const res = await api.get<{ user: AuthUser }>("/api/mobile/me");
          set({ user: res.user });
        } catch {
          // token süresi dolmuş olabilir → logout
          await get().logout();
        }
      },
    }),
    {
      name: "highfive-auth",
      storage: createJSONStorage(() => AsyncStorage),
      // KRİTİK: token artık zustand persist'e DEĞİL, SecureStore'a (api.setToken)
      // yazılıyor. Burada partialize sadece user'ı kaydeder (UI için PII değil — id+name).
      // Token ayrıca getToken() ile SecureStore'dan okunup state'e yansıtılır.
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state, error) => {
        if (__DEV__ && error) {
          // eslint-disable-next-line no-console
          console.log("[auth] onRehydrateStorage error", String(error));
        }
        (async () => {
          try {
            // Token'ı SecureStore'dan oku (legacy AsyncStorage migration api.ts içinde)
            const token = await getToken();
            useAuth.setState({
              token: token ?? null,
              user: state?.user ?? null,
              hydrated: true,
            });
          } catch {
            useAuth.setState({ hydrated: true });
          }
        })();
      },
    },
  ),
);

// EK SAVUNMA: Persist callback ateşlenmezse 3sn'de manuel hydrate
setTimeout(async () => {
  const state = useAuth.getState();
  if (state.hydrated) return;
  try {
    const token = await getToken(); // SecureStore + legacy migration
    const raw = await AsyncStorage.getItem("highfive-auth");
    let persistedUser: AuthUser | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        persistedUser = parsed?.state?.user ?? null;
      } catch {}
    }
    useAuth.setState({
      token: token ?? null,
      user: persistedUser,
      hydrated: true,
    });
  } catch {
    useAuth.setState({ hydrated: true });
  }
}, 3000);
