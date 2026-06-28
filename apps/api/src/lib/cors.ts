import type { CorsOptions } from "cors";
import { env, isProd } from "../config/env.js";

/** Configured allow-list (comma-separated WEB_ORIGIN). */
const allowList = env.WEB_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

/** Local development hosts on any port — Expo web (:8081), simulators, LAN devices. */
const localOrigin =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|(10|192\.168|172\.(1[6-9]|2\d|3[01]))(\.\d{1,3}){1,3})(:\d+)?$/;

export function isOriginAllowed(origin: string | undefined): boolean {
  // Non-browser clients (mobile apps, curl) send no Origin — always allowed.
  if (!origin) return true;
  if (allowList.includes(origin)) return true;
  // In development be permissive about localhost/LAN so web & devices "just work".
  if (!isProd && localOrigin.test(origin)) return true;
  return false;
}

export const corsOptions: CorsOptions = {
  origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
  credentials: true,
};
