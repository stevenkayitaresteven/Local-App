import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/tokens.js";
import { errors } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { cache } from "../lib/cache.js";
import type { UserRole } from "@umuturanyi/shared";

export interface AuthContext {
  userId: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  // Cookie fallback for the web client (httpOnly access cookie).
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token;
  return cookieToken ?? null;
}

/** Populates req.auth when a valid token is present; never rejects. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const claims = verifyAccessToken(token);
      req.auth = { userId: claims.sub, role: claims.role };
    } catch {
      // ignore — treated as anonymous
    }
  }
  next();
}

interface LiveUser {
  role: UserRole;
  suspended: boolean;
}

/**
 * Confirm the token's subject is still a live, non-suspended account, and read the
 * authoritative role from the database so suspensions and role changes take effect
 * immediately (access tokens are short-lived but not instantly revocable). Cached
 * briefly to keep this off the hot path.
 */
async function loadLiveUser(userId: string): Promise<LiveUser | null> {
  const cacheKey = `live-user:${userId}`;
  const cached = await cache.get<LiveUser>(cacheKey);
  if (cached) return cached;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, deletedAt: true },
  });
  if (!user) return null;
  const live: LiveUser = { role: user.role as UserRole, suspended: Boolean(user.deletedAt) };
  await cache.set(cacheKey, live, 15);
  return live;
}

/** Hard gate: requires an authenticated, active user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) return next(errors.unauthorized());
  try {
    const live = await loadLiveUser(req.auth.userId);
    if (!live || live.suspended) return next(errors.unauthorized("Konti yawe ntikora"));
    req.auth.role = live.role;
    next();
  } catch (err) {
    next(err);
  }
}

/** Role gate: requires one of the given roles (implies requireAuth). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(errors.unauthorized());
    if (!roles.includes(req.auth.role)) return next(errors.forbidden());
    next();
  };
}
