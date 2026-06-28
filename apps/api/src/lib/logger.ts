import pino from "pino";
import { env, isProd, isTest } from "../config/env.js";

export const logger = pino({
  level: isTest ? "silent" : isProd ? "info" : "debug",
  base: { service: "umuturanyi-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.refreshToken",
      "*.token",
    ],
    censor: "[redacted]",
  },
});

void env;
void isProd;
