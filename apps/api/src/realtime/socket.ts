import { Server as IOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyAccessToken } from "../lib/tokens.js";
import { isOriginAllowed } from "../lib/cors.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { realtime } from "./registry.js";
import { markRead } from "../modules/messages/messages.service.js";

interface SocketData {
  userId: string;
}

export function attachRealtime(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, isOriginAllowed(origin ?? undefined)),
      credentials: true,
    },
    path: "/realtime",
  });
  realtime.attach(io);

  // Authenticate every socket from its handshake token before any events flow.
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.replace("Bearer ", "") as string | undefined);
    if (!token) return next(new Error("unauthorized"));
    try {
      const claims = verifyAccessToken(token);
      (socket.data as SocketData).userId = claims.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as SocketData).userId;
    void socket.join(realtime.userRoom(userId));

    if (realtime.markOnline(userId)) {
      void prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }).catch(() => {});
      socket.broadcast.emit("presence:online", { userId });
    }

    // Join a conversation room only after verifying membership.
    socket.on("conversation:join", async (conversationId: string) => {
      const member = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { id: true },
      });
      if (member) void socket.join(realtime.conversationRoom(conversationId));
    });

    socket.on("conversation:leave", (conversationId: string) => {
      void socket.leave(realtime.conversationRoom(conversationId));
    });

    socket.on("typing", (payload: { conversationId: string; typing: boolean }) => {
      realtime.toConversation(payload.conversationId, "typing", {
        conversationId: payload.conversationId,
        userId,
        typing: payload.typing,
      });
    });

    socket.on("message:read", async (conversationId: string) => {
      await markRead(conversationId, userId).catch((err) => logger.debug({ err }, "read receipt failed"));
    });

    socket.on("presence:check", (targetId: string, ack?: (online: boolean) => void) => {
      ack?.(realtime.isOnline(targetId));
    });

    socket.on("disconnect", () => {
      if (realtime.markOffline(userId)) {
        socket.broadcast.emit("presence:offline", { userId, lastSeen: new Date().toISOString() });
      }
    });
  });

  logger.info("realtime gateway attached at /realtime");
  return io;
}
