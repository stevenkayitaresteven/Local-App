import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import { toListingDto } from "../../mappers/index.js";
import type { ListingDto } from "@umuturanyi/shared";
import type { Prisma } from "@prisma/client";

const include = { seller: true, images: { orderBy: { position: "asc" } } } satisfies Prisma.ListingInclude;

export async function addFavorite(userId: string, listingId: string): Promise<{ favorited: true; favoriteCount: number }> {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } });
  if (!listing) throw errors.notFound("Igicuruzwa ntikibaho");

  try {
    await prisma.$transaction([
      prisma.favorite.create({ data: { userId, listingId } }),
      prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { increment: 1 } } }),
    ]);
    if (listing.sellerId !== userId) {
      events.emit("listing.favorited", { listingId, actorId: userId, sellerId: listing.sellerId });
    }
  } catch (err) {
    // Unique violation → already favorited; treat as idempotent success.
    if ((err as Prisma.PrismaClientKnownRequestError)?.code !== "P2002") throw err;
  }
  const fresh = await prisma.listing.findUnique({ where: { id: listingId } });
  return { favorited: true, favoriteCount: fresh?.favoriteCount ?? listing.favoriteCount };
}

export async function removeFavorite(userId: string, listingId: string): Promise<{ favorited: false; favoriteCount: number }> {
  const deleted = await prisma.favorite.deleteMany({ where: { userId, listingId } });
  if (deleted.count > 0) {
    await prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { decrement: 1 } } });
  }
  const fresh = await prisma.listing.findUnique({ where: { id: listingId } });
  return { favorited: false, favoriteCount: Math.max(0, fresh?.favoriteCount ?? 0) };
}

export async function listFavorites(userId: string): Promise<ListingDto[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId, listing: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: { listing: { include } },
    take: 100,
  });
  return favorites.map((f) => toListingDto(f.listing, { isFavorited: true }));
}

export async function listRecentlyViewed(userId: string): Promise<ListingDto[]> {
  const rows = await prisma.recentlyViewed.findMany({
    where: { userId, listing: { deletedAt: null } },
    orderBy: { viewedAt: "desc" },
    include: { listing: { include } },
    take: 30,
  });
  const favIds = new Set(
    (
      await prisma.favorite.findMany({
        where: { userId, listingId: { in: rows.map((r) => r.listingId) } },
        select: { listingId: true },
      })
    ).map((f) => f.listingId),
  );
  return rows.map((r) => toListingDto(r.listing, { isFavorited: favIds.has(r.listingId) }));
}
