import { Router } from "express";
import * as favorites from "./favorites.service.js";
import { asyncHandler, ok } from "../../lib/http.js";
import { requireAuth } from "../../middleware/auth.js";

/** "Me" surface — the current user's saved and recently-viewed listings. */
export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

favoritesRouter.get(
  "/favorites",
  asyncHandler(async (req, res) => {
    ok(res, { listings: await favorites.listFavorites(req.auth!.userId) });
  }),
);

favoritesRouter.get(
  "/recently-viewed",
  asyncHandler(async (req, res) => {
    ok(res, { listings: await favorites.listRecentlyViewed(req.auth!.userId) });
  }),
);
