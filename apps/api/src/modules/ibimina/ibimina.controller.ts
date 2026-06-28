import { Router } from "express";
import { z } from "zod";
import { createIbiminaSchema, NEIGHBORHOOD_SLUGS } from "@umuturanyi/shared";
import * as ibimina from "./ibimina.service.js";
import { asyncHandler, ok, created } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, attachUser } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";

export const ibiminaRouter = Router();

const listQuery = z.object({
  neighborhood: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]).optional(),
});

ibiminaRouter.get(
  "/",
  attachUser,
  validate(listQuery, "query"),
  asyncHandler(async (req, res) => {
    ok(res, { ibimina: await ibimina.listIbimina((req.query as { neighborhood?: string }).neighborhood) });
  }),
);

ibiminaRouter.post(
  "/",
  requireAuth,
  writeLimiter,
  validate(createIbiminaSchema),
  asyncHandler(async (req, res) => {
    created(res, { ibimina: await ibimina.createIbimina(req.auth!.userId, req.body) });
  }),
);

ibiminaRouter.get(
  "/:id",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { ibimina: await ibimina.getIbimina(req.params.id) });
  }),
);

ibiminaRouter.put(
  "/:id/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { ibimina: await ibimina.joinIbimina(req.params.id, req.auth!.userId) });
  }),
);

ibiminaRouter.delete(
  "/:id/leave",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { ibimina: await ibimina.leaveIbimina(req.params.id, req.auth!.userId) });
  }),
);
