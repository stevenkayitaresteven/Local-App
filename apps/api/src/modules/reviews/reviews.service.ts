import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import { toPublicUser } from "../../mappers/index.js";
import type { z } from "zod";
import type { createReviewSchema } from "@umuturanyi/shared";
import type { Prisma } from "@prisma/client";

type ReviewWithAuthor = Prisma.ReviewGetPayload<{ include: { author: true } }>;

export async function createReview(authorId: string, input: z.infer<typeof createReviewSchema>) {
  if (authorId === input.subjectId) throw errors.badRequest("Ntushobora kwiha amanota");
  const subject = await prisma.user.findFirst({ where: { id: input.subjectId, deletedAt: null } });
  if (!subject) throw errors.notFound("Umukoresha ntabaho");

  if (input.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
    if (!listing || listing.sellerId !== input.subjectId) {
      throw errors.badRequest("Igicuruzwa ntigihuye n'uwo mukoresha");
    }
  }

  const review = await prisma.review
    .create({
      data: {
        authorId,
        subjectId: input.subjectId,
        listingId: input.listingId ?? null,
        rating: input.rating,
        comment: input.comment,
      },
      include: { author: true },
    })
    .catch((err) => {
      if ((err as { code?: string }).code === "P2002") {
        throw errors.conflict("Wamaze gutanga amanota kuri uyu mukoresha");
      }
      throw err;
    });

  events.emit("review.created", {
    reviewId: review.id,
    subjectId: input.subjectId,
    authorId,
    rating: input.rating,
  });

  return mapReview(review);
}

export async function listReviews(subjectId: string) {
  const reviews = await prisma.review.findMany({
    where: { subjectId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return reviews.map(mapReview);
}

function mapReview(review: ReviewWithAuthor) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    author: toPublicUser(review.author),
    listingId: review.listingId,
    createdAt: review.createdAt.toISOString(),
  };
}
