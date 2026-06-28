import { Router } from "express";
import { z } from "zod";
import { paymentIntentSchema, PAYMENT_PROVIDERS, priceSchema, phoneSchema } from "@umuturanyi/shared";
import * as wallet from "./wallet.service.js";
import { asyncHandler, ok } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";

export const walletRouter = Router();
walletRouter.use(requireAuth);

walletRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    ok(res, await wallet.getWallet(req.auth!.userId));
  }),
);

const topUpSchema = z.object({
  amount: priceSchema.refine((n) => n > 0, "Amafaranga agomba kurenga 0"),
  provider: z.enum(PAYMENT_PROVIDERS),
  phone: phoneSchema.optional(),
});
walletRouter.post(
  "/topup",
  writeLimiter,
  validate(topUpSchema),
  asyncHandler(async (req, res) => {
    ok(res, await wallet.topUp(req.auth!.userId, req.body.amount, req.body.provider, req.body.phone));
  }),
);

walletRouter.post(
  "/pay",
  writeLimiter,
  validate(paymentIntentSchema),
  asyncHandler(async (req, res) => {
    ok(res, await wallet.pay(req.auth!.userId, req.body));
  }),
);
