import { Router } from "express";
import { z } from "zod";
import * as search from "./search.service.js";
import * as listings from "../listings/listings.service.js";
import { listingQuerySchema } from "@umuturanyi/shared";
import { asyncHandler, ok, noContent } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, attachUser } from "../../middleware/auth.js";

export const searchRouter = Router();

searchRouter.get(
  "/",
  attachUser,
  validate(listingQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as never as { q?: string };
    if (query.q) void search.recordSearch(query.q, req.auth?.userId);
    ok(res, await listings.listListings(req.query as never, req.auth?.userId));
  }),
);

const suggestQuery = z.object({ q: z.string().max(100).default("") });
searchRouter.get(
  "/suggest",
  validate(suggestQuery, "query"),
  asyncHandler(async (req, res) => {
    ok(res, { suggestions: await search.suggestions((req.query as { q: string }).q) });
  }),
);

searchRouter.get(
  "/popular",
  asyncHandler(async (_req, res) => {
    ok(res, { popular: await search.popularSearches() });
  }),
);

searchRouter.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { recent: await search.recentSearches(req.auth!.userId) });
  }),
);

searchRouter.delete(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    await search.clearRecentSearches(req.auth!.userId);
    noContent(res);
  }),
);
