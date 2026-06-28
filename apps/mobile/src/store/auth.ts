import { create } from "zustand";
import type { AuthUser } from "@umuturanyi/shared";
import { api, setTokens, onAuthExpired } from "../lib/api";
import { secureStorage, TOKEN_KEYS } from "../lib/storage";

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  devCode?: string;
}

interface AuthState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "anonymous";
  lastDevCode: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    displayName: string;
    phone: string;
    password: string;
    neighborhoodSlug: string;
    email?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: "loading",
  lastDevCode: null,

  async bootstrap() {
    onAuthExpired(() => {
      void get().logout();
    });
    const [access, refresh] = await Promise.all([
      secureStorage.get(TOKEN_KEYS.access),
      secureStorage.get(TOKEN_KEYS.refresh),
    ]);
    if (!access || !refresh) {
      set({ status: "anonymous" });
      return;
    }
    setTokens(access, refresh);
    try {
      const { user } = await api.get<{ user: AuthUser }>("/auth/me");
      set({ user, status: "authenticated" });
    } catch {
      await get().logout();
    }
  },

  async login(identifier, password) {
    const res = await api.post<AuthResponse>("/auth/login", { identifier, password }, false);
    await api.persistTokens(res.accessToken, res.refreshToken);
    set({ user: res.user, status: "authenticated" });
  },

  async register(input) {
    const res = await api.post<AuthResponse>("/auth/register", input, false);
    await api.persistTokens(res.accessToken, res.refreshToken);
    set({ user: res.user, status: "authenticated", lastDevCode: res.devCode ?? null });
  },

  async logout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      /* ignore */
    }
    setTokens(null, null);
    await Promise.all([secureStorage.remove(TOKEN_KEYS.access), secureStorage.remove(TOKEN_KEYS.refresh)]);
    set({ user: null, status: "anonymous" });
  },

  async refreshMe() {
    try {
      const { user } = await api.get<{ user: AuthUser }>("/auth/me");
      set({ user });
    } catch {
      /* ignore */
    }
  },

  setUser(user) {
    set({ user });
  },
}));
