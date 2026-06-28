import { Router } from "express";
import { z } from "zod";
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
  LISTING_STATUS,
} from "@umuturanyi/shared";
import * as listings from "./listings.service.js";
import * as favorites from "../favorites/favorites.service.js";
import { asyncHandler, ok, created, noContent } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, attachUser } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";

export const listingsRouter = Router();

listingsRouter.get(
  "/",
  attachUser,
  validate(listingQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    ok(res, await listings.listListings(req.query as never, req.auth?.userId));
  }),
);

listingsRouter.post(
  "/",
  requireAuth,
  writeLimiter,
  validate(createListingSchema),
  asyncHandler(async (req, res) => {
    created(res, { listing: await listings.createListing(req.auth!.userId, req.body) });
  }),
);

listingsRouter.get(
  "/:id",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { listing: await listings.getListing(req.params.id, req.auth?.userId) });
  }),
);

listingsRouter.patch(
  "/:id",
  requireAuth,
  validate(updateListingSchema),
  asyncHandler(async (req, res) => {
    ok(res, { listing: await listings.updateListing(req.params.id, req.auth!.userId, req.body) });
  }),
);

const statusSchema = z.object({ status: z.enum(LISTING_STATUS) });
listingsRouter.post(
  "/:id/status",
  requireAuth,
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    ok(res, { listing: await listings.setStatus(req.params.id, req.auth!.userId, req.body.status) });
  }),
);

listingsRouter.post(
  "/:id/bump",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { listing: await listings.bumpListing(req.params.id, req.auth!.userId) });
  }),
);

listingsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.auth!.role === "admin" || req.auth!.role === "moderator";
    await listings.deleteListing(req.params.id, req.auth!.userId, isStaff);
    noContent(res);
  }),
);

// ── Favorites on a listing ──────────────────────────────────────────────────
listingsRouter.put(
  "/:id/favorite",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await favorites.addFavorite(req.auth!.userId, req.params.id));
  }),
);

listingsRouter.delete(
  "/:id/favorite",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await favorites.removeFavorite(req.auth!.userId, req.params.id));
  }),
);
