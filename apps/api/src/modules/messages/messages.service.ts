import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import { realtime } from "../../realtime/registry.js";
import { toConversationDto, toMessageDto } from "../../mappers/index.js";
import type { ConversationDto, MessageDto } from "@umuturanyi/shared";
import type { Prisma } from "@prisma/client";

const listingInclude = { images: { orderBy: { position: "asc" } } } satisfies Prisma.ListingInclude;

async function assertNotBlocked(a: string, b: string): Promise<void> {
  const block = await prisma.block.findFirst({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  if (block) throw errors.forbidden("Ntushobora kohereza ubutumwa kuri uyu mukoresha");
}

export async function findOrCreateConversation(
  userId: string,
  recipientId: string,
  listingId?: string,
): Promise<string> {
  if (userId === recipientId) throw errors.badRequest("Ntushobora kwiyandikira");
  const recipient = await prisma.user.findFirst({ where: { id: recipientId, deletedAt: null } });
  if (!recipient) throw errors.notFound("Uwo mukoresha ntabaho");
  await assertNotBlocked(userId, recipientId);

  const existing = await prisma.conversation.findFirst({
    where: {
      listingId: listingId ?? null,
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: recipientId } } },
      ],
    },
  });
  if (existing) return existing.id;

  const conversation = await prisma.conversation.create({
    data: {
      listingId: listingId ?? null,
      participants: { create: [{ userId }, { userId: recipientId }] },
    },
  });
  if (listingId) {
    await prisma.listing.update({ where: { id: listingId }, data: { chatCount: { increment: 1 } } }).catch(() => {});
  }
  return conversation.id;
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: { body?: string; imageId?: string },
): Promise<MessageDto> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!participant) throw errors.forbidden("Ntabwo uri muri iki kiganiro");
  if (!input.body?.trim() && !input.imageId) throw errors.badRequest("Ubutumwa burimo ubusa");

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
  });
  for (const o of others) await assertNotBlocked(senderId, o.userId);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId,
        body: input.body?.trim() ?? "",
        imageId: input.imageId ?? null,
      },
      include: { image: true },
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } });
    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId: { not: senderId } },
      data: { unreadCount: { increment: 1 } },
    });
    return created;
  });

  const dto = toMessageDto(message);
  realtime.toConversation(conversationId, "message:new", dto);
  for (const o of others) {
    realtime.toUser(o.userId, "conversation:updated", { conversationId });
    events.emit("message.sent", { conversationId, messageId: message.id, senderId, recipientId: o.userId });
  }
  return dto;
}

export async function listConversations(userId: string): Promise<ConversationDto[]> {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId, archivedAt: null },
    include: {
      conversation: {
        include: {
          listing: { include: listingInclude },
          participants: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { image: true } },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 100,
  });

  return participations.map((p) => {
    const counterpartPart = p.conversation.participants.find((x) => x.userId !== userId);
    return toConversationDto({
      id: p.conversation.id,
      listing: p.conversation.listing,
      counterpart: counterpartPart!.user,
      lastMessage: p.conversation.messages[0] ?? null,
      unreadCount: p.unreadCount,
      updatedAt: p.conversation.lastMessageAt,
    });
  });
}

export async function getMessages(
  conversationId: string,
  userId: string,
  opts: { before?: string; limit: number },
): Promise<{ conversation: ConversationDto; items: MessageDto[]; nextCursor: string | null }> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        include: {
          listing: { include: listingInclude },
          participants: { include: { user: true } },
        },
      },
    },
  });
  if (!participant) throw errors.forbidden("Ntabwo uri muri iki kiganiro");

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(opts.before ? { createdAt: { lt: new Date(Buffer.from(opts.before, "base64url").toString()) } } : {}),
    },
    include: { image: true },
    orderBy: { createdAt: "desc" },
    take: opts.limit + 1,
  });
  const hasMore = messages.length > opts.limit;
  const page = (hasMore ? messages.slice(0, opts.limit) : messages).reverse();
  const oldest = page[0];

  const counterpart = participant.conversation.participants.find((x) => x.userId !== userId)!.user;
  return {
    conversation: toConversationDto({
      id: conversationId,
      listing: participant.conversation.listing,
      counterpart,
      lastMessage: page[page.length - 1] ?? null,
      unreadCount: participant.unreadCount,
      updatedAt: participant.conversation.lastMessageAt,
    }),
    items: page.map(toMessageDto),
    nextCursor: hasMore && oldest ? Buffer.from(oldest.createdAt.toISOString()).toString("base64url") : null,
  };
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw errors.forbidden();
  const now = new Date();
  await prisma.$transaction([
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now, unreadCount: 0 },
    }),
    prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: now },
    }),
  ]);
  realtime.toConversation(conversationId, "message:read", { conversationId, userId, readAt: now.toISOString() });
}

export async function totalUnread(userId: string): Promise<number> {
  const agg = await prisma.conversationParticipant.aggregate({
    where: { userId },
    _sum: { unreadCount: true },
  });
  return agg._sum.unreadCount ?? 0;
}
