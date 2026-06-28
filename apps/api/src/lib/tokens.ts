import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import type { UserRole } from "@umuturanyi/shared";

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
}

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: "umuturanyi",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "umuturanyi" });
  if (typeof payload === "string") throw new Error("Invalid token payload");
  return { sub: String(payload.sub), role: payload.role as UserRole };
}

/** Opaque, high-entropy refresh token. Stored only as a hash server-side. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
