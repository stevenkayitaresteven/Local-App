import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import { toPublicUser, toAuthUser } from "../../mappers/index.js";
import { computeAgaciro, type PublicUser, type AuthUser } from "@umuturanyi/shared";
import type { z } from "zod";
import type { updateProfileSchema } from "@umuturanyi/shared";

export interface ProfileView extends PublicUser {
  bio: string;
  completedSales: number;
  listingCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isBlocked: boolean;
  agaciroBreakdown: { label: string; points: number }[];
}

export async function getProfile(userId: string, viewerId?: string): Promise<ProfileView> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw errors.notFound("Umukoresha ntabaho");

  const [listingCount, followerCount, followingCount, ratingAgg, upheldReports, conv, replied, follow, block] =
    await Promise.all([
      prisma.listing.count({ where: { sellerId: userId, deletedAt: null, status: "active" } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.review.aggregate({ where: { subjectId: userId }, _avg: { rating: true }, _count: { rating: true } }),
      prisma.report.count({ where: { targetType: "user", targetId: userId, status: "actioned" } }),
      prisma.conversationParticipant.count({ where: { userId } }),
      prisma.conversationParticipant.count({ where: { userId, lastReadAt: { not: null } } }),
      viewerId
        ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: userId } } })
        : Promise.resolve(null),
      viewerId
        ? prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: userId } } })
        : Promise.resolve(null),
    ]);

  const { breakdown } = computeAgaciro({
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    ratingAverage: ratingAgg._avg.rating ?? null,
    ratingCount: ratingAgg._count.rating,
    completedSales: user.completedSales,
    responseRate: conv > 0 ? replied / conv : null,
    upheldReports,
    accountAgeDays: (Date.now() - user.createdAt.getTime()) / 86_400_000,
  });

  return {
    ...toPublicUser(user),
    bio: user.bio,
    completedSales: user.completedSales,
    listingCount,
    followerCount,
    followingCount,
    isFollowing: Boolean(follow),
    isBlocked: Boolean(block),
    agaciroBreakdown: breakdown,
  };
}

export async function updateProfile(userId: string, input: z.infer<typeof updateProfileSchema>): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.neighborhoodSlug !== undefined ? { neighborhoodSlug: input.neighborhoodSlug } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
  });
  return toAuthUser(user);
}

export async function follow(followerId: string, followingId: string): Promise<{ following: boolean }> {
  if (followerId === followingId) throw errors.badRequest("Ntushobora kwikurikira");
  const target = await prisma.user.findFirst({ where: { id: followingId, deletedAt: null } });
  if (!target) throw errors.notFound("Umukoresha ntabaho");
  try {
    await prisma.follow.create({ data: { followerId, followingId } });
    events.emit("user.followed", { followerId, followingId });
  } catch {
    // already following — idempotent
  }
  return { following: true };
}

export async function unfollow(followerId: string, followingId: string): Promise<{ following: boolean }> {
  await prisma.follow.deleteMany({ where: { followerId, followingId } });
  return { following: false };
}

export async function block(blockerId: string, blockedId: string): Promise<{ blocked: boolean }> {
  if (blockerId === blockedId) throw errors.badRequest("Ntushobora kwihagarika");
  try {
    await prisma.$transaction([
      prisma.block.create({ data: { blockerId, blockedId } }),
      // blocking also unfollows in both directions
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
    ]);
  } catch {
    // already blocked
  }
  return { blocked: true };
}

export async function unblock(blockerId: string, blockedId: string): Promise<{ blocked: boolean }> {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
  return { blocked: false };
}
