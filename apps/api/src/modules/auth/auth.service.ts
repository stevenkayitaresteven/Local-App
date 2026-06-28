import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword, hashToken, verifyToken } from "../../lib/password.js";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
} from "../../lib/tokens.js";
import { errors } from "../../lib/errors.js";
import { recomputeAgaciro } from "../users/reputation.service.js";
import { logger } from "../../lib/logger.js";
import type { RegisterInput, LoginInput, UserRole } from "@umuturanyi/shared";
import type { User } from "@prisma/client";

export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.replace(/^250/, "").replace(/^0/, "");
  return `+250${local}`;
}

async function issueSession(user: User, ctx: SessionContext): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: await hashToken(refreshToken),
      userAgent: ctx.userAgent?.slice(0, 255),
      ip: ctx.ip,
      expiresAt: refreshTokenExpiry(),
    },
  });
  const accessToken = signAccessToken({ sub: user.id, role: user.role as UserRole });
  return { accessToken, refreshToken };
}

export async function register(
  input: RegisterInput,
  ctx: SessionContext,
): Promise<{ user: User; tokens: IssuedTokens; otp: string }> {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone }, ...(input.email ? [{ email: input.email }] : [])] },
  });
  if (existing) throw errors.conflict("Iyi nimero cyangwa imeyili byamaze gukoreshwa");

  const user = await prisma.user.create({
    data: {
      displayName: input.displayName,
      phone,
      email: input.email ?? null,
      passwordHash: await hashPassword(input.password),
      neighborhoodSlug: input.neighborhoodSlug,
      wallet: { create: {} },
    },
  });

  await recomputeAgaciro(user.id);
  const otp = await createPhoneOtp(user.id);
  const tokens = await issueSession(user, ctx);
  return { user, tokens, otp };
}

export async function login(input: LoginInput, ctx: SessionContext): Promise<{ user: User; tokens: IssuedTokens }> {
  const identifier = input.identifier.includes("@")
    ? input.identifier.toLowerCase()
    : normalizePhone(input.identifier);

  const user = await prisma.user.findFirst({
    where: { OR: [{ phone: identifier }, { email: identifier }], deletedAt: null },
  });
  // Constant-ish work whether or not the user exists, to avoid user enumeration.
  const ok = user ? await verifyPassword(input.password, user.passwordHash) : await verifyPassword(input.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok) throw errors.unauthorized("Nimero/imeyili cyangwa ijambobanga ntibihuye");

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  const tokens = await issueSession(user, ctx);
  return { user, tokens };
}

export async function refresh(rawRefreshToken: string, ctx: SessionContext): Promise<{ user: User; tokens: IssuedTokens }> {
  if (!rawRefreshToken) throw errors.unauthorized("Nta refresh token");
  // Find a candidate session by scanning active sessions for a hash match.
  // (Hashes are salted; we cannot index by them, so scope to non-expired/non-revoked.)
  const sessions = await prisma.session.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  let matched: (typeof sessions)[number] | undefined;
  for (const s of sessions) {
    if (await verifyToken(rawRefreshToken, s.refreshTokenHash)) {
      matched = s;
      break;
    }
  }
  if (!matched || matched.user.deletedAt) throw errors.unauthorized("Refresh token ntiyemewe");

  // Rotate: revoke the old session and mint a new one (refresh-token rotation).
  await prisma.session.update({ where: { id: matched.id }, data: { revokedAt: new Date() } });
  const tokens = await issueSession(matched.user, ctx);
  return { user: matched.user, tokens };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const sessions = await prisma.session.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    take: 200,
  });
  for (const s of sessions) {
    if (await verifyToken(rawRefreshToken, s.refreshTokenHash)) {
      await prisma.session.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
      return;
    }
  }
}

export async function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
  });
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw errors.notFound("Iyi seshen ntibaho");
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

// ── Phone verification (OTP) ────────────────────────────────────────────────
export async function createPhoneOtp(userId: string): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  await prisma.verificationToken.create({
    data: {
      userId,
      type: "phone_otp",
      codeHash: await hashToken(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  // In production this would be dispatched via SMS. We log it for local dev.
  logger.info({ userId, code }, "📲 phone OTP issued (dev)");
  return code;
}

export async function verifyPhoneOtp(userId: string, code: string): Promise<void> {
  const token = await prisma.verificationToken.findFirst({
    where: { userId, type: "phone_otp", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token || !(await verifyToken(code, token.codeHash))) {
    throw errors.badRequest("Kode ntiyemewe cyangwa yararangiye");
  }
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { phoneVerified: true } }),
  ]);
  await recomputeAgaciro(userId);
}

// ── Password reset ──────────────────────────────────────────────────────────
export async function requestPasswordReset(identifier: string): Promise<string | null> {
  const id = identifier.includes("@") ? identifier.toLowerCase() : normalizePhone(identifier);
  const user = await prisma.user.findFirst({ where: { OR: [{ phone: id }, { email: id }] } });
  if (!user) return null; // do not reveal existence
  const code = String(randomInt(100000, 1000000));
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: "password_reset",
      codeHash: await hashToken(code),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  logger.info({ userId: user.id, code }, "🔐 password reset code issued (dev)");
  return code;
}

export async function resetPassword(identifier: string, code: string, newPassword: string): Promise<void> {
  const id = identifier.includes("@") ? identifier.toLowerCase() : normalizePhone(identifier);
  const user = await prisma.user.findFirst({ where: { OR: [{ phone: id }, { email: id }] } });
  if (!user) throw errors.badRequest("Kode ntiyemewe");
  const token = await prisma.verificationToken.findFirst({
    where: { userId: user.id, type: "password_reset", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token || !(await verifyToken(code, token.codeHash))) throw errors.badRequest("Kode ntiyemewe cyangwa yararangiye");

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } }),
    // Revoke all sessions on password change.
    prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
