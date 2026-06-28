import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Token storage. Uses the OS keychain/keystore on native via expo-secure-store,
 * and falls back to localStorage on web (where SecureStore is unavailable).
 */
const webStore = {
  getItem: async (k: string) => (typeof localStorage !== "undefined" ? localStorage.getItem(k) : null),
  setItem: async (k: string, v: string) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(k, v);
  },
  removeItem: async (k: string) => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(k);
  },
};

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return webStore.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return webStore.setItem(key, value);
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") return webStore.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};

export const TOKEN_KEYS = {
  access: "umuturanyi.access",
  refresh: "umuturanyi.refresh",
} as const;
