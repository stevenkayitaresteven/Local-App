import { prisma } from "../../lib/prisma.js";
import { events } from "../../lib/events.js";
import { logger } from "../../lib/logger.js";
import { createNotification } from "./notifications.service.js";
import { recomputeAgaciro } from "../users/reputation.service.js";

/**
 * Wire domain events to side effects (notifications, reputation). Registered once
 * at startup. Handlers are defensive: a failure here must never break the request
 * that produced the event.
 */
let registered = false;

export function registerSubscribers(): void {
  if (registered) return;
  registered = true;

  const safe =
    <T>(fn: (p: T) => Promise<void>) =>
    (payload: T) =>
      fn(payload).catch((err) => logger.error({ err }, "subscriber failed"));

  events.on(
    "listing.favorited",
    safe(async ({ listingId, actorId, sellerId }) => {
      const [actor, listing] = await Promise.all([
        prisma.user.findUnique({ where: { id: actorId }, select: { displayName: true } }),
        prisma.listing.findUnique({ where: { id: listingId }, select: { title: true } }),
      ]);
      await createNotification({
        userId: sellerId,
        type: "listing_favorited",
        title: `${actor?.displayName ?? "Umuturanyi"} yakunze igicuruzwa cyawe`,
        body: listing?.title ?? "",
        link: `/isoko/${listingId}`,
        actorId,
      });
    }),
  );

  events.on(
    "post.liked",
    safe(async ({ postId, actorId, authorId }) => {
      const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { displayName: true } });
      await createNotification({
        userId: authorId,
        type: "post_liked",
        title: `${actor?.displayName ?? "Umuturanyi"} yakunze inkuru yawe`,
        link: `/umuryango/${postId}`,
        actorId,
      });
    }),
  );

  events.on(
    "post.commented",
    safe(async ({ postId, actorId, authorId }) => {
      const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { displayName: true } });
      await createNotification({
        userId: authorId,
        type: "post_commented",
        title: `${actor?.displayName ?? "Umuturanyi"} yasubije inkuru yawe`,
        link: `/umuryango/${postId}`,
        actorId,
      });
    }),
  );

  events.on(
    "comment.liked",
    safe(async ({ commentId, actorId, authorId }) => {
      const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { displayName: true } });
      await createNotification({
        userId: authorId,
        type: "comment_liked",
        title: `${actor?.displayName ?? "Umuturanyi"} yakunze igitekerezo cyawe`,
        actorId,
      });
      void commentId;
    }),
  );

  events.on(
    "user.followed",
    safe(async ({ followerId, followingId }) => {
      const actor = await prisma.user.findUnique({ where: { id: followerId }, select: { displayName: true } });
      await createNotification({
        userId: followingId,
        type: "new_follower",
        title: `${actor?.displayName ?? "Umuturanyi"} aragukurikiye`,
        link: `/konti/${followerId}`,
        actorId: followerId,
      });
    }),
  );

  events.on(
    "review.created",
    safe(async ({ subjectId, authorId, rating }) => {
      const actor = await prisma.user.findUnique({ where: { id: authorId }, select: { displayName: true } });
      await recomputeAgaciro(subjectId);
      await createNotification({
        userId: subjectId,
        type: "review_received",
        title: `${actor?.displayName ?? "Umuturanyi"} yaguhaye inyenyeri ${rating}`,
        link: `/konti/${subjectId}`,
        actorId: authorId,
      });
    }),
  );

  logger.debug("domain event subscribers registered");
}
