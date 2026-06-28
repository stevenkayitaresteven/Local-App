import "./loadEnv.js";
import { z } from "zod";

/**
 * Centralized, validated configuration. The process refuses to start with an
 * invalid environment — fail fast and loud rather than at the first request.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),

  DATABASE_URL: z.string().default("file:./prisma/dev.db"),

  JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret-change-me-please-0000"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret-change-me-please-1111"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  REDIS_URL: z.string().optional(),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./uploads"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().default("Umuturanyi <noreply@umuturanyi.rw>"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

if (isProd) {
  for (const [key, fallback] of [
    ["JWT_ACCESS_SECRET", "dev-access-secret-change-me-please-0000"],
    ["JWT_REFRESH_SECRET", "dev-refresh-secret-change-me-please-1111"],
  ] as const) {
    if (env[key] === fallback) {
      throw new Error(`Refusing to start in production with the default ${key}.`);
    }
  }
}
