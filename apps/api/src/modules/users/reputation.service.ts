import { prisma } from "../../lib/prisma.js";
import { computeAgaciro } from "@umuturanyi/shared";

/**
 * Recompute and persist a user's Agaciro (trust score). Called whenever an input
 * changes: verification, a new review, a completed sale, an upheld report. Cheap
 * enough to run inline; emits no events to avoid feedback loops.
 */
export async function recomputeAgaciro(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const [ratingAgg, upheldReports, conversationCount, repliedCount] = await Promise.all([
    prisma.review.aggregate({
      where: { subjectId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.report.count({ where: { targetType: "user", targetId: userId, status: "actioned" } }),
    prisma.conversationParticipant.count({ where: { userId } }),
    prisma.conversationParticipant.count({ where: { userId, lastReadAt: { not: null } } }),
  ]);

  const ratingAverage = ratingAgg._avg.rating ?? null;
  const ratingCount = ratingAgg._count.rating;
  const responseRate = conversationCount > 0 ? repliedCount / conversationCount : null;

  const accountAgeDays = Math.max(0, (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const { score } = computeAgaciro({
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    ratingAverage,
    ratingCount,
    completedSales: user.completedSales,
    responseRate,
    upheldReports,
    accountAgeDays,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { agaciro: score, ratingAverage, ratingCount, responseRate },
  });
  return score;
}
