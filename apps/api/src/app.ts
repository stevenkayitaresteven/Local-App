import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { apiRouter } from "./routes.js";
import { healthRouter } from "./modules/health/health.controller.js";
import { attachUser } from "./middleware/auth.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { registerSubscribers } from "./modules/notifications/subscribers.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      // Cross-origin resource policy relaxed so the SPA on another port can load
      // images served from /uploads.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    }),
  );

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      autoLogging: env.NODE_ENV !== "test",
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health/metrics are unversioned and unauthenticated for probes.
  app.use(healthRouter);

  // Serve locally-stored uploads.
  app.use("/uploads", express.static(resolve(process.cwd(), env.STORAGE_LOCAL_DIR), { maxAge: "7d", index: false }));

  app.use(globalLimiter);
  app.use(attachUser);

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  registerSubscribers();

  return app;
}
