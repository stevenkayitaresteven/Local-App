import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolve the API base URL. On a physical device, localhost points at the phone,
 * so set EXPO_PUBLIC_API_URL (or app.json `extra.apiUrl`) to your machine's LAN IP.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromExtra) return fromExtra;
  // Android emulator maps the host loopback to 10.0.2.2.
  if (Platform.OS === "android") return "http://10.0.2.2:4000";
  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();
export const API_V1 = `${API_URL}/api/v1`;
export const REALTIME_URL = API_URL;
