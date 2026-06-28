import { Router } from "express";
import { z } from "zod";
import { startConversationSchema, sendMessageSchema } from "@umuturanyi/shared";
import * as messages from "./messages.service.js";
import { asyncHandler, ok, created, noContent } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    ok(res, { conversations: await messages.listConversations(req.auth!.userId) });
  }),
);

messagesRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    ok(res, { unread: await messages.totalUnread(req.auth!.userId) });
  }),
);

messagesRouter.post(
  "/conversations",
  writeLimiter,
  validate(startConversationSchema),
  asyncHandler(async (req, res) => {
    const conversationId = await messages.findOrCreateConversation(
      req.auth!.userId,
      req.body.recipientId,
      req.body.listingId,
    );
    const message = await messages.sendMessage(conversationId, req.auth!.userId, { body: req.body.body });
    created(res, { conversationId, message });
  }),
);

const listMessagesQuery = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
messagesRouter.get(
  "/conversations/:id/messages",
  validate(listMessagesQuery, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { before?: string; limit: number };
    ok(res, await messages.getMessages(req.params.id, req.auth!.userId, q));
  }),
);

messagesRouter.post(
  "/conversations/:id/messages",
  writeLimiter,
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await messages.sendMessage(req.params.id, req.auth!.userId, req.body);
    created(res, { message });
  }),
);

messagesRouter.post(
  "/conversations/:id/read",
  asyncHandler(async (req, res) => {
    await messages.markRead(req.params.id, req.auth!.userId);
    noContent(res);
  }),
);
