import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolve the API base URL across web, simulators, and physical devices.
 *
 * On a real phone, `localhost` is the phone itself — so we reach the API on the
 * same host that serves the JS bundle (your dev machine), which Expo exposes as
 * the Metro "hostUri" (e.g. "192.168.1.104:8081"). That means a phone on the same
 * Wi-Fi just works with no configuration. Override anytime with EXPO_PUBLIC_API_URL.
 */
const API_PORT = 4000;

function metroHost(): string | null {
  const candidates = [
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) {
      const host = c.split(":")[0];
      if (host) return host;
    }
  }
  return null;
}

function resolveApiUrl(): string {
  // 1. Explicit override always wins.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  // 2. Physical device / Expo Go: use the dev machine's LAN IP on the API port.
  const host = metroHost();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${API_PORT}`;
  }

  // 3. Android emulator maps the host loopback to 10.0.2.2; web/iOS sim use localhost.
  if (Platform.OS === "android") return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();
export const API_V1 = `${API_URL}/api/v1`;
export const REALTIME_URL = API_URL;
