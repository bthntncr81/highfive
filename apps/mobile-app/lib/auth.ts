import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken, api } from "./api";

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
  setSession: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  // API actions
  requestOtp: (
    phone: string,
  ) => Promise<{ ok: true; devCode?: string }>;
  verifyOtp: (
    phone: string,
    code: string,
  ) => Promise<{ user: AuthUser; token: string }>;
  refreshMe: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

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

      verifyOtp: async (phone: string, code: string) => {
        const res = await api.post<{
          token: string;
          user: AuthUser;
        }>("/api/mobile/auth/verify-otp", { phone, code });
        await setToken(res.token);
        set({ token: res.token, user: res.user });
        return res;
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
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        // rehydrate sonrası API client'a da token'ı yaz
        if (state?.token) setToken(state.token);
      },
    },
  ),
);
