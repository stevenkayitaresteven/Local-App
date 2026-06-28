import { createServer } from "node:http";
import { createApp } from "./app.js";
import { attachRealtime } from "./realtime/socket.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

async function main(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);
  attachRealtime(httpServer);

  httpServer.listen(env.API_PORT, () => {
    logger.info(`🧺 Umuturanyi API listening on http://localhost:${env.API_PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
