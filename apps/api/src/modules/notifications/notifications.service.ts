import { prisma } from "../../lib/prisma.js";
import { encodeCursor, decodeCursor } from "../../lib/cursor.js";
import { toNotificationDto } from "../../mappers/index.js";
import { realtime } from "../../realtime/registry.js";
import type { NotificationType, NotificationDto, Paginated } from "@umuturanyi/shared";

interface CreateArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
}

export async function createNotification(args: CreateArgs): Promise<void> {
  if (args.actorId && args.actorId === args.userId) return; // never notify yourself
  const notification = await prisma.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body ?? "",
      link: args.link ?? null,
      actorId: args.actorId ?? null,
    },
    include: { actor: true },
  });
  const unread = await unreadCount(args.userId);
  realtime.toUser(args.userId, "notification:new", {
    notification: toNotificationDto(notification),
    unread,
  });
}

export async function listNotifications(
  userId: string,
  opts: { cursor?: string; limit: number },
): Promise<Paginated<NotificationDto>> {
  const cursor = decodeCursor(opts.cursor);
  const rows = await prisma.notification.findMany({
    where: {
      userId,
      ...(cursor
        ? { OR: [{ createdAt: { lt: new Date(cursor.key) } }, { createdAt: new Date(cursor.key), id: { lt: cursor.id } }] }
        : {}),
    },
    include: { actor: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: opts.limit + 1,
  });
  const hasMore = rows.length > opts.limit;
  const page = hasMore ? rows.slice(0, opts.limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(toNotificationDto),
    nextCursor: hasMore && last ? encodeCursor({ key: last.createdAt.toISOString(), id: last.id }) : null,
  };
}

export function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, ids: string[]): Promise<number> {
  await prisma.notification.updateMany({
    where: { userId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
  return unreadCount(userId);
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
