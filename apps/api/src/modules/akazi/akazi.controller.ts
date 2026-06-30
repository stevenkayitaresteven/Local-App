import { Router } from "express";
import {
  createAkaziSchema,
  updateAkaziSchema,
  akaziQuerySchema,
  applyAkaziSchema,
  akaziApplicationStatusSchema,
  AKAZI_STATUS,
} from "@umuturanyi/shared";
import { z } from "zod";
import * as akazi from "./akazi.service.js";
import { asyncHandler, ok, created, noContent } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, attachUser } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";

export const akaziRouter = Router();

function isStaff(role?: string): boolean {
  return role === "admin" || role === "moderator";
}

// ── Browse ───────────────────────────────────────────────────────────────────
akaziRouter.get(
  "/",
  attachUser,
  validate(akaziQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    ok(res, await akazi.listAkazi(req.query as never, req.auth?.userId));
  }),
);

akaziRouter.post(
  "/",
  requireAuth,
  writeLimiter,
  validate(createAkaziSchema),
  asyncHandler(async (req, res) => {
    created(res, { akazi: await akazi.createAkazi(req.auth!.userId, req.body) });
  }),
);

// The signed-in user's saved (bookmarked) posts.
akaziRouter.get(
  "/bookmarks",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { akazi: await akazi.listBookmarks(req.auth!.userId) });
  }),
);

// The signed-in user's own applications across all posts.
akaziRouter.get(
  "/applications/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { applications: await akazi.listMyApplications(req.auth!.userId) });
  }),
);

// Update an application's status (poster: shortlist/accept/decline · applicant: withdraw).
akaziRouter.post(
  "/applications/:id/status",
  requireAuth,
  validate(akaziApplicationStatusSchema),
  asyncHandler(async (req, res) => {
    ok(res, { application: await akazi.setApplicationStatus(req.params.id, req.auth!.userId, req.body.status) });
  }),
);

akaziRouter.get(
  "/:id",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { akazi: await akazi.getAkazi(req.params.id, req.auth?.userId) });
  }),
);

akaziRouter.patch(
  "/:id",
  requireAuth,
  validate(updateAkaziSchema),
  asyncHandler(async (req, res) => {
    ok(res, { akazi: await akazi.updateAkazi(req.params.id, req.auth!.userId, req.body) });
  }),
);

const statusSchema = z.object({ status: z.enum(AKAZI_STATUS) });
akaziRouter.post(
  "/:id/status",
  requireAuth,
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    ok(res, { akazi: await akazi.setStatus(req.params.id, req.auth!.userId, req.body.status) });
  }),
);

akaziRouter.post(
  "/:id/bump",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { akazi: await akazi.bumpAkazi(req.params.id, req.auth!.userId) });
  }),
);

akaziRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await akazi.deleteAkazi(req.params.id, req.auth!.userId, isStaff(req.auth!.role));
    noContent(res);
  }),
);

// ── Bookmarks ────────────────────────────────────────────────────────────────
akaziRouter.put(
  "/:id/bookmark",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await akazi.addBookmark(req.auth!.userId, req.params.id));
  }),
);

akaziRouter.delete(
  "/:id/bookmark",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await akazi.removeBookmark(req.auth!.userId, req.params.id));
  }),
);

// ── Applications on a post ───────────────────────────────────────────────────
akaziRouter.post(
  "/:id/apply",
  requireAuth,
  writeLimiter,
  validate(applyAkaziSchema),
  asyncHandler(async (req, res) => {
    created(res, { application: await akazi.applyToAkazi(req.auth!.userId, req.params.id, req.body.message) });
  }),
);

akaziRouter.get(
  "/:id/applications",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { applications: await akazi.listApplications(req.params.id, req.auth!.userId, isStaff(req.auth!.role)) });
  }),
);
