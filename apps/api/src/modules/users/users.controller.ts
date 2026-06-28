import { Router } from "express";
import { updateProfileSchema, createReviewSchema, createReportSchema } from "@umuturanyi/shared";
import * as users from "./users.service.js";
import * as reviews from "../reviews/reviews.service.js";
import * as reports from "../reports/reports.service.js";
import * as listings from "../listings/listings.service.js";
import { prisma } from "../../lib/prisma.js";
import { toAuthUser } from "../../mappers/index.js";
import { asyncHandler, ok, created } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, attachUser } from "../../middleware/auth.js";
import { errors } from "../../lib/errors.js";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw errors.notFound();
    ok(res, { user: toAuthUser(user) });
  }),
);

usersRouter.patch(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    ok(res, { user: await users.updateProfile(req.auth!.userId, req.body) });
  }),
);

usersRouter.get(
  "/:id",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { profile: await users.getProfile(req.params.id, req.auth?.userId) });
  }),
);

usersRouter.get(
  "/:id/listings",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { listings: await listings.listingsBySeller(req.params.id, req.auth?.userId) });
  }),
);

usersRouter.get(
  "/:id/reviews",
  asyncHandler(async (req, res) => {
    ok(res, { reviews: await reviews.listReviews(req.params.id) });
  }),
);

usersRouter.put(
  "/:id/follow",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await users.follow(req.auth!.userId, req.params.id));
  }),
);

usersRouter.delete(
  "/:id/follow",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await users.unfollow(req.auth!.userId, req.params.id));
  }),
);

usersRouter.put(
  "/:id/block",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await users.block(req.auth!.userId, req.params.id));
  }),
);

usersRouter.delete(
  "/:id/block",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await users.unblock(req.auth!.userId, req.params.id));
  }),
);

// Reviews & reports are authored "about" a subject — colocated under users for clarity.
usersRouter.post(
  "/reviews",
  requireAuth,
  validate(createReviewSchema),
  asyncHandler(async (req, res) => {
    created(res, { review: await reviews.createReview(req.auth!.userId, req.body) });
  }),
);

usersRouter.post(
  "/reports",
  requireAuth,
  validate(createReportSchema),
  asyncHandler(async (req, res) => {
    const report = await reports.createReport(req.auth!.userId, req.body);
    created(res, { reportId: report.id, status: report.status });
  }),
);
