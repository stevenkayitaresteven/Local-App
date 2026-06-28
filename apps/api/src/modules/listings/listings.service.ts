import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { encodeCursor, decodeCursor } from "../../lib/cursor.js";
import { toListingDto } from "../../mappers/index.js";
import { attachImages } from "../uploads/uploads.service.js";
import {
  neighborhoodBySlug,
  distanceKm,
  type CreateListingInput,
  type ListingQuery,
  type ListingDto,
  type Paginated,
} from "@umuturanyi/shared";
import type { Prisma } from "@prisma/client";

const withRelations = {
  seller: true,
  images: { orderBy: { position: "asc" } },
} satisfies Prisma.ListingInclude;

function buildWhere(query: ListingQuery): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "active", deletedAt: null };
  if (query.category) where.categorySlug = query.category;
  if (query.neighborhood) where.neighborhoodSlug = query.neighborhood;
  if (query.freeOnly) where.isFree = true;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }
  if (query.q) {
    where.OR = [
      { title: { contains: query.q } },
      { description: { contains: query.q } },
    ];
  }
  return where;
}

async function decorate(
  listings: (Prisma.ListingGetPayload<{ include: typeof withRelations }>)[],
  viewerId: string | undefined,
  reference: { lat: number; lng: number } | null,
): Promise<ListingDto[]> {
  let favoritedIds = new Set<string>();
  if (viewerId && listings.length) {
    const favs = await prisma.favorite.findMany({
      where: { userId: viewerId, listingId: { in: listings.map((l) => l.id) } },
      select: { listingId: true },
    });
    favoritedIds = new Set(favs.map((f) => f.listingId));
  }
  return listings.map((l) => {
    let dist: number | null = null;
    if (reference && l.lat != null && l.lng != null) {
      dist = Math.round(distanceKm(reference, { lat: l.lat, lng: l.lng }) * 10) / 10;
    }
    return toListingDto(l, { isFavorited: favoritedIds.has(l.id), distanceKm: dist });
  });
}

export async function listListings(
  query: ListingQuery,
  viewerId?: string,
): Promise<Paginated<ListingDto>> {
  const where = buildWhere(query);
  const reference =
    query.neighborhood ? pointOf(query.neighborhood) : null;

  // Distance ranking can't be expressed in SQL portably, so rank in memory over a
  // bounded candidate window. Other sorts use efficient keyset pagination.
  if (query.sort === "nearby") {
    if (!reference) throw errors.badRequest("Ikarita isaba aho uherereye (neighborhood)");
    const offset = Number(decodeCursor(query.cursor)?.key ?? 0);
    const candidates = await prisma.listing.findMany({
      where,
      include: withRelations,
      orderBy: { bumpedAt: "desc" },
      take: 500,
    });
    const ranked = candidates
      .map((l) => ({
        l,
        d: l.lat != null && l.lng != null ? distanceKm(reference, { lat: l.lat, lng: l.lng }) : Number.POSITIVE_INFINITY,
      }))
      .filter((x) => (query.maxDistanceKm ? x.d <= query.maxDistanceKm : true))
      .sort((a, b) => a.d - b.d);
    const page = ranked.slice(offset, offset + query.limit);
    const items = await decorate(page.map((x) => x.l), viewerId, reference);
    const nextCursor =
      offset + query.limit < ranked.length ? encodeCursor({ key: offset + query.limit, id: "nearby" }) : null;
    return { items, nextCursor };
  }

  const orderBy = orderForSort(query.sort);
  const cursor = decodeCursor(query.cursor);
  const keysetWhere = cursor ? keysetCondition(query.sort, cursor) : {};

  const rows = await prisma.listing.findMany({
    where: { AND: [where, keysetWhere] },
    include: withRelations,
    orderBy,
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
  const items = await decorate(pageRows, viewerId, reference);
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ key: sortKey(query.sort, last), id: last.id }) : null;
  return { items, nextCursor };
}

function pointOf(slug: string): { lat: number; lng: number } | null {
  const n = neighborhoodBySlug(slug);
  return n ? { lat: n.lat, lng: n.lng } : null;
}

function orderForSort(sort: ListingQuery["sort"]): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "popular":
      return [{ favoriteCount: "desc" }, { id: "desc" }];
    case "recent":
    default:
      return [{ bumpedAt: "desc" }, { id: "desc" }];
  }
}

function sortKey(sort: ListingQuery["sort"], row: { price: number; favoriteCount: number; bumpedAt: Date }): string | number {
  switch (sort) {
    case "price_asc":
    case "price_desc":
      return row.price;
    case "popular":
      return row.favoriteCount;
    default:
      return row.bumpedAt.toISOString();
  }
}

function keysetCondition(
  sort: ListingQuery["sort"],
  cursor: { key: string | number; id: string },
): Prisma.ListingWhereInput {
  const { key, id } = cursor;
  switch (sort) {
    case "price_asc":
      return { OR: [{ price: { gt: Number(key) } }, { price: Number(key), id: { gt: id } }] };
    case "price_desc":
      return { OR: [{ price: { lt: Number(key) } }, { price: Number(key), id: { lt: id } }] };
    case "popular":
      return { OR: [{ favoriteCount: { lt: Number(key) } }, { favoriteCount: Number(key), id: { lt: id } }] };
    case "recent":
    default:
      return { OR: [{ bumpedAt: { lt: new Date(key) } }, { bumpedAt: new Date(key), id: { lt: id } }] };
  }
}

export async function getListing(id: string, viewerId?: string): Promise<ListingDto> {
  const listing = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    include: withRelations,
  });
  if (!listing) throw errors.notFound("Igicuruzwa ntikibaho");

  // Count a view and record "recently viewed" (best-effort, never blocks the read).
  void prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  if (viewerId && viewerId !== listing.sellerId) {
    void prisma.recentlyViewed
      .upsert({
        where: { userId_listingId: { userId: viewerId, listingId: id } },
        create: { userId: viewerId, listingId: id },
        update: { viewedAt: new Date() },
      })
      .catch(() => {});
  }

  const ref = pointOf(listing.neighborhoodSlug);
  const [dto] = await decorate([listing], viewerId, ref);
  return dto!;
}

export async function createListing(sellerId: string, input: CreateListingInput): Promise<ListingDto> {
  const n = neighborhoodBySlug(input.neighborhoodSlug);
  const listing = await prisma.listing.create({
    data: {
      sellerId,
      title: input.title,
      description: input.description,
      price: input.isFree ? 0 : input.price,
      isFree: input.isFree,
      isNegotiable: input.isNegotiable,
      condition: input.condition,
      categorySlug: input.categorySlug,
      neighborhoodSlug: input.neighborhoodSlug,
      lat: n?.lat,
      lng: n?.lng,
    },
    include: withRelations,
  });
  if (input.imageIds.length) await attachImages(input.imageIds, sellerId, { listingId: listing.id });
  return getListing(listing.id, sellerId);
}

export async function updateListing(
  id: string,
  sellerId: string,
  input: Partial<CreateListingInput> & { status?: string },
): Promise<ListingDto> {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw errors.notFound("Igicuruzwa ntikibaho");
  if (existing.sellerId !== sellerId) throw errors.forbidden("Ntushobora guhindura igicuruzwa atari icyawe");

  const n = input.neighborhoodSlug ? neighborhoodBySlug(input.neighborhoodSlug) : null;
  await prisma.listing.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: input.isFree ? 0 : input.price } : {}),
      ...(input.isFree !== undefined ? { isFree: input.isFree } : {}),
      ...(input.isNegotiable !== undefined ? { isNegotiable: input.isNegotiable } : {}),
      ...(input.condition !== undefined ? { condition: input.condition } : {}),
      ...(input.categorySlug !== undefined ? { categorySlug: input.categorySlug } : {}),
      ...(input.neighborhoodSlug !== undefined ? { neighborhoodSlug: input.neighborhoodSlug, lat: n?.lat, lng: n?.lng } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
  if (input.imageIds) await attachImages(input.imageIds, sellerId, { listingId: id });
  return getListing(id, sellerId);
}

export async function setStatus(id: string, sellerId: string, status: string): Promise<ListingDto> {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw errors.notFound("Igicuruzwa ntikibaho");
  if (existing.sellerId !== sellerId) throw errors.forbidden();

  await prisma.listing.update({
    where: { id },
    data: { status, soldAt: status === "sold" ? new Date() : existing.soldAt },
  });
  if (status === "sold" && existing.status !== "sold") {
    await prisma.user.update({ where: { id: sellerId }, data: { completedSales: { increment: 1 } } });
  }
  return getListing(id, sellerId);
}

export async function bumpListing(id: string, sellerId: string): Promise<ListingDto> {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw errors.notFound("Igicuruzwa ntikibaho");
  if (existing.sellerId !== sellerId) throw errors.forbidden();
  await prisma.listing.update({ where: { id }, data: { bumpedAt: new Date() } });
  return getListing(id, sellerId);
}

export async function deleteListing(id: string, requesterId: string, isStaff: boolean): Promise<void> {
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw errors.notFound("Igicuruzwa ntikibaho");
  if (existing.sellerId !== requesterId && !isStaff) throw errors.forbidden();
  await prisma.listing.update({ where: { id }, data: { deletedAt: new Date(), status: "removed" } });
}

export async function listingsBySeller(sellerId: string, viewerId?: string): Promise<ListingDto[]> {
  const rows = await prisma.listing.findMany({
    where: { sellerId, deletedAt: null },
    include: withRelations,
    orderBy: { bumpedAt: "desc" },
    take: 100,
  });
  return decorate(rows, viewerId, null);
}
