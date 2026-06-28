import { Router } from "express";
import { z } from "zod";
import * as admin from "./admin.service.js";
import { asyncHandler, ok } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const adminRouter = Router();

// Every admin route requires an authenticated moderator or admin.
adminRouter.use(requireAuth, requireRole("moderator", "admin"));

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => ok(res, { stats: await admin.dashboardStats() })),
);

const reportQuery = z.object({ status: z.string().optional() });
adminRouter.get(
  "/reports",
  validate(reportQuery, "query"),
  asyncHandler(async (req, res) => {
    ok(res, { reports: await admin.listReports((req.query as { status?: string }).status) });
  }),
);

const resolveSchema = z.object({
  action: z.enum(["actioned", "dismissed"]),
  note: z.string().max(500).optional(),
  removeTarget: z.boolean().default(false),
});
adminRouter.post(
  "/reports/:id/resolve",
  validate(resolveSchema),
  asyncHandler(async (req, res) => {
    ok(res, await admin.resolveReport(req.params.id, req.auth!.userId, req.body.action, req.body));
  }),
);

const usersQuery = z.object({ q: z.string().optional() });
adminRouter.get(
  "/users",
  validate(usersQuery, "query"),
  asyncHandler(async (req, res) => {
    ok(res, { users: await admin.listUsers((req.query as { q?: string }).q) });
  }),
);

const roleSchema = z.object({ role: z.enum(["member", "moderator", "admin"]) });
adminRouter.post(
  "/users/:id/role",
  requireRole("admin"),
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    ok(res, await admin.setRole(req.auth!.userId, req.params.id, req.body.role));
  }),
);

const suspendSchema = z.object({ suspended: z.boolean() });
adminRouter.post(
  "/users/:id/suspend",
  validate(suspendSchema),
  asyncHandler(async (req, res) => {
    ok(res, await admin.setSuspended(req.auth!.userId, req.params.id, req.body.suspended));
  }),
);

adminRouter.get(
  "/audit-logs",
  requireRole("admin"),
  asyncHandler(async (_req, res) => ok(res, { logs: await admin.listAuditLogs() })),
);
