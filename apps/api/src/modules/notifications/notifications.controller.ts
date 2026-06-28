import { Router } from "express";
import { z } from "zod";
import * as service from "./notifications.service.js";
import { asyncHandler, ok, noContent } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { paginationSchema } from "@umuturanyi/shared";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/",
  validate(paginationSchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { cursor?: string; limit: number };
    ok(res, await service.listNotifications(req.auth!.userId, q));
  }),
);

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    ok(res, { unread: await service.unreadCount(req.auth!.userId) });
  }),
);

const readSchema = z.object({ ids: z.array(z.string().cuid()).min(1) });
notificationsRouter.post(
  "/read",
  validate(readSchema),
  asyncHandler(async (req, res) => {
    ok(res, { unread: await service.markRead(req.auth!.userId, req.body.ids) });
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await service.markAllRead(req.auth!.userId);
    noContent(res);
  }),
);
