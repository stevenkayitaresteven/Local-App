import { PrismaClient } from "@prisma/client";
import { isProd } from "../config/env.js";

/**
 * A single PrismaClient per process. Reused across hot reloads in development to
 * avoid exhausting database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ["warn", "error"] : ["warn", "error"],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export type { Prisma } from "@prisma/client";
