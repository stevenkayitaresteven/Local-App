import rateLimit from "express-rate-limit";
import { env, isTest } from "../config/env.js";

const noop = (_req: unknown, _res: unknown, next: () => void) => next();

/** Global limiter — generous; protects against accidental floods. */
export const globalLimiter = isTest
  ? noop
  : rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: "rate_limited", message: "Wagerageje kenshi cyane" } },
    });

/** Strict limiter for credential endpoints — blunts brute force. */
export const authLimiter = isTest
  ? noop
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      message: { error: { code: "rate_limited", message: "Wagerageje kwinjira kenshi" } },
    });

/** Limiter for write-heavy actions (posting, messaging) to curb spam. */
export const writeLimiter = isTest
  ? noop
  : rateLimit({
      windowMs: 60 * 1000,
      max: 40,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: "rate_limited", message: "Tegereza gato mbere yo kongera" } },
    });
