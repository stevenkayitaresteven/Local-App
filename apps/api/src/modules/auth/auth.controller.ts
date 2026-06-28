import { Router } from "express";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
} from "@umuturanyi/shared";
import * as authService from "./auth.service.js";
import { prisma } from "../../lib/prisma.js";
import { toAuthUser } from "../../mappers/index.js";
import { asyncHandler, ok, created } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from "../../lib/cookies.js";
import { errors } from "../../lib/errors.js";
import { isProd } from "../../config/env.js";

export const authRouter = Router();

function sessionCtx(req: { headers: Record<string, unknown>; ip?: string }) {
  return { userAgent: String(req.headers["user-agent"] ?? ""), ip: req.ip };
}

/** Expose dev OTP/reset codes only outside production, so flows are testable. */
const devCode = (code: string | null) => (isProd || !code ? {} : { devCode: code });

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { user, tokens, otp } = await authService.register(req.body, sessionCtx(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    created(res, { user: toAuthUser(user), ...tokens, ...devCode(otp) });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.login(req.body, sessionCtx(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    ok(res, { user: toAuthUser(user), ...tokens });
  }),
);

const refreshSchema = z.object({ refreshToken: z.string().optional() });
authRouter.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    const token = req.body.refreshToken ?? cookieToken;
    if (!token) throw errors.unauthorized("Nta refresh token");
    const { user, tokens } = await authService.refresh(token, sessionCtx(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    ok(res, { user: toAuthUser(user), ...tokens });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    await authService.logout(req.body?.refreshToken ?? cookieToken);
    clearAuthCookies(res);
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw errors.notFound("Umukoresha ntabaho");
    ok(res, { user: toAuthUser(user) });
  }),
);

// ── Phone verification ──────────────────────────────────────────────────────
authRouter.post(
  "/phone/send-otp",
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = await authService.createPhoneOtp(req.auth!.userId);
    ok(res, { sent: true, ...devCode(code) });
  }),
);

const otpSchema = z.object({ code: z.string().length(6) });
authRouter.post(
  "/phone/verify",
  requireAuth,
  validate(otpSchema),
  asyncHandler(async (req, res) => {
    await authService.verifyPhoneOtp(req.auth!.userId, req.body.code);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    ok(res, { user: toAuthUser(user!) });
  }),
);

// ── Password reset ──────────────────────────────────────────────────────────
const requestResetSchema = z.object({ identifier: z.string().min(3) });
authRouter.post(
  "/password/forgot",
  authLimiter,
  validate(requestResetSchema),
  asyncHandler(async (req, res) => {
    const code = await authService.requestPasswordReset(req.body.identifier);
    ok(res, { sent: true, ...devCode(code) });
  }),
);

const resetSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().length(6),
  password: z.string().min(8).max(128),
});
authRouter.post(
  "/password/reset",
  authLimiter,
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.identifier, req.body.code, req.body.password);
    ok(res, { reset: true });
  }),
);

// ── Device sessions ─────────────────────────────────────────────────────────
authRouter.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, { sessions: await authService.listSessions(req.auth!.userId) });
  }),
);

authRouter.delete(
  "/sessions/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.revokeSession(req.auth!.userId, req.params.id);
    res.status(204).end();
  }),
);
