import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/http.js";

export const healthRouter = Router();

/** Liveness — is the process up. */
healthRouter.get("/healthz", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/** Readiness — can we serve traffic (DB reachable). */
healthRouter.get(
  "/readyz",
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready", db: "up" });
    } catch {
      res.status(503).json({ status: "not_ready", db: "down" });
    }
  }),
);

/** Minimal Prometheus-style metrics — process + key counters. */
healthRouter.get(
  "/metrics",
  asyncHandler(async (_req, res) => {
    const mem = process.memoryUsage();
    const [users, listings, messages] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.message.count(),
    ]);
    const lines = [
      "# HELP umuturanyi_process_uptime_seconds Process uptime.",
      "# TYPE umuturanyi_process_uptime_seconds gauge",
      `umuturanyi_process_uptime_seconds ${process.uptime().toFixed(0)}`,
      "# HELP umuturanyi_process_resident_memory_bytes Resident memory.",
      "# TYPE umuturanyi_process_resident_memory_bytes gauge",
      `umuturanyi_process_resident_memory_bytes ${mem.rss}`,
      "# HELP umuturanyi_users_total Registered users.",
      "# TYPE umuturanyi_users_total gauge",
      `umuturanyi_users_total ${users}`,
      "# HELP umuturanyi_listings_total Listings created.",
      "# TYPE umuturanyi_listings_total gauge",
      `umuturanyi_listings_total ${listings}`,
      "# HELP umuturanyi_messages_total Messages sent.",
      "# TYPE umuturanyi_messages_total counter",
      `umuturanyi_messages_total ${messages}`,
    ];
    res.type("text/plain").send(lines.join("\n") + "\n");
  }),
);
