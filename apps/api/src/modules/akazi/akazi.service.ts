import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import { encodeCursor, decodeCursor } from "../../lib/cursor.js";
import { toAkaziDto, toAkaziApplicationDto } from "../../mappers/index.js";
import { attachImages } from "../uploads/uploads.service.js";
import {
  neighborhoodBySlug,
  distanceKm,
  type CreateAkaziInput,
  type UpdateAkaziInput,
  type AkaziQuery,
  type AkaziDto,
  type AkaziApplicationDto,
  type AkaziApplicationStatus,
  type Paginated,
} from "@umuturanyi/shared";
import type { Prisma } from "@prisma/client";

const withRelations = {
  poster: true,
  images: { orderBy: { position: "asc" } },
} satisfies Prisma.AkaziListingInclude;

type AkaziRow = Prisma.AkaziListingGetPayload<{ include: typeof withRelations }>;

function pointOf(slug: string): { lat: number; lng: number } | null {
  const n = neighborhoodBySlug(slug);
  return n ? { lat: n.lat, lng: n.lng } : null;
}

function buildWhere(query: AkaziQuery): Prisma.AkaziListingWhereInput {
  const where: Prisma.AkaziListingWhereInput = { status: "open", deletedAt: null };
  if (query.kind) where.kind = query.kind;
  if (query.category) where.categorySlug = query.category;
  if (query.employment) where.employment = query.employment;
  if (query.neighborhood) where.neighborhoodSlug = query.neighborhood;
  if (query.remoteOnly) where.isRemote = true;
  if (query.q) {
    where.OR = [{ title: { contains: query.q } }, { description: { contains: query.q } }];
  }
  return where;
}

/** Attach the viewer's per-row state (bookmarked, their own application, distance). */
async function decorate(
  rows: AkaziRow[],
  viewerId: string | undefined,
  reference: { lat: number; lng: number } | null,
): Promise<AkaziDto[]> {
  let bookmarkedIds = new Set<string>();
  const appStatusByAkazi = new Map<string, AkaziApplicationStatus>();
  if (viewerId && rows.length) {
    const ids = rows.map((r) => r.id);
    const [bookmarks, applications] = await Promise.all([
      prisma.akaziBookmark.findMany({ where: { userId: viewerId, akaziId: { in: ids } }, select: { akaziId: true } }),
      prisma.akaziApplication.findMany({
        where: { applicantId: viewerId, akaziId: { in: ids } },
        select: { akaziId: true, status: true },
      }),
    ]);
    bookmarkedIds = new Set(bookmarks.map((b) => b.akaziId));
    for (const a of applications) appStatusByAkazi.set(a.akaziId, a.status as AkaziApplicationStatus);
  }
  return rows.map((r) => {
    let dist: number | null = null;
    if (reference && r.lat != null && r.lng != null) {
      dist = Math.round(distanceKm(reference, { lat: r.lat, lng: r.lng }) * 10) / 10;
    }
    return toAkaziDto(r, {
      isBookmarked: bookmarkedIds.has(r.id),
      myApplicationStatus: appStatusByAkazi.get(r.id) ?? null,
      distanceKm: dist,
    });
  });
}

// ── Browse ───────────────────────────────────────────────────────────────────
export async function listAkazi(query: AkaziQuery, viewerId?: string): Promise<Paginated<AkaziDto>> {
  const where = buildWhere(query);
  const reference = query.neighborhood ? pointOf(query.neighborhood) : null;

  // "nearby" and "pay_high" can't be expressed as portable keyset SQL, so we rank a
  // bounded candidate window in memory (offset cursor). Other sorts use keyset.
  if (query.sort === "nearby" || query.sort === "pay_high") {
    if (query.sort === "nearby" && !reference) {
      throw errors.badRequest("Gushaka 'hafi yawe' bisaba aho uherereye (neighborhood)");
    }
    const offset = Number(decodeCursor(query.cursor)?.key ?? 0);
    const candidates = await prisma.akaziListing.findMany({
      where,
      include: withRelations,
      orderBy: { bumpedAt: "desc" },
      take: 500,
    });
    const ranked = candidates
      .map((r) => ({
        r,
        d: reference && r.lat != null && r.lng != null ? distanceKm(reference, { lat: r.lat, lng: r.lng }) : Number.POSITIVE_INFINITY,
        pay: r.payMax ?? r.payMin ?? Number.NEGATIVE_INFINITY,
      }))
      .filter((x) => (query.sort === "nearby" && query.maxDistanceKm ? x.d <= query.maxDistanceKm : true))
      .sort((a, b) => (query.sort === "nearby" ? a.d - b.d : b.pay - a.pay));
    const page = ranked.slice(offset, offset + query.limit);
    const items = await decorate(page.map((x) => x.r), viewerId, reference);
    const nextCursor =
      offset + query.limit < ranked.length ? encodeCursor({ key: offset + query.limit, id: query.sort }) : null;
    return { items, nextCursor };
  }

  const orderBy = orderForSort(query.sort);
  const cursor = decodeCursor(query.cursor);
  const keysetWhere = cursor ? keysetCondition(query.sort, cursor) : {};
  const rows = await prisma.akaziListing.findMany({
    where: { AND: [where, keysetWhere] },
    include: withRelations,
    orderBy,
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
  const items = await decorate(pageRows, viewerId, reference);
  const last = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ key: sortKey(query.sort, last), id: last.id }) : null;
  return { items, nextCursor };
}

function orderForSort(sort: AkaziQuery["sort"]): Prisma.AkaziListingOrderByWithRelationInput[] {
  switch (sort) {
    case "popular":
      return [{ applicationCount: "desc" }, { id: "desc" }];
    case "recent":
    default:
      return [{ bumpedAt: "desc" }, { id: "desc" }];
  }
}

function sortKey(sort: AkaziQuery["sort"], row: { applicationCount: number; bumpedAt: Date }): string | number {
  return sort === "popular" ? row.applicationCount : row.bumpedAt.toISOString();
}

function keysetCondition(
  sort: AkaziQuery["sort"],
  cursor: { key: string | number; id: string },
): Prisma.AkaziListingWhereInput {
  const { key, id } = cursor;
  if (sort === "popular") {
    return { OR: [{ applicationCount: { lt: Number(key) } }, { applicationCount: Number(key), id: { lt: id } }] };
  }
  return { OR: [{ bumpedAt: { lt: new Date(key) } }, { bumpedAt: new Date(key), id: { lt: id } }] };
}

export async function getAkazi(id: string, viewerId?: string): Promise<AkaziDto> {
  const akazi = await prisma.akaziListing.findFirst({ where: { id, deletedAt: null }, include: withRelations });
  if (!akazi) throw errors.notFound("Iri tangazo ntiribaho");
  // Count a view (best-effort; never blocks the read, never self-inflates).
  if (viewerId !== akazi.posterId) {
    void prisma.akaziListing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }
  const ref = pointOf(akazi.neighborhoodSlug);
  const [dto] = await decorate([akazi], viewerId, ref);
  return dto!;
}

export async function akaziByPoster(posterId: string, viewerId?: string): Promise<AkaziDto[]> {
  const rows = await prisma.akaziListing.findMany({
    where: { posterId, deletedAt: null },
    include: withRelations,
    orderBy: { bumpedAt: "desc" },
    take: 100,
  });
  return decorate(rows, viewerId, null);
}

// ── Mutations ────────────────────────────────────────────────────────────────
export async function createAkazi(posterId: string, input: CreateAkaziInput): Promise<AkaziDto> {
  const n = neighborhoodBySlug(input.neighborhoodSlug);
  const negotiable = input.payPeriod === "negotiable";
  const akazi = await prisma.akaziListing.create({
    data: {
      posterId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      categorySlug: input.categorySlug,
      employment: input.employment,
      isRemote: input.isRemote,
      payPeriod: input.payPeriod,
      payMin: negotiable ? null : input.payMin ?? null,
      payMax: negotiable ? null : input.payMax ?? null,
      neighborhoodSlug: input.neighborhoodSlug,
      lat: n?.lat,
      lng: n?.lng,
    },
  });
  if (input.imageIds.length) await attachImages(input.imageIds, posterId, { akaziId: akazi.id });
  return getAkazi(akazi.id, posterId);
}

async function ownedOrThrow(id: string, posterId: string) {
  const existing = await prisma.akaziListing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw errors.notFound("Iri tangazo ntiribaho");
  if (existing.posterId !== posterId) throw errors.forbidden("Ntushobora guhindura itangazo atari iryawe");
  return existing;
}

export async function updateAkazi(id: string, posterId: string, input: UpdateAkaziInput): Promise<AkaziDto> {
  const existing = await ownedOrThrow(id, posterId);
  const n = input.neighborhoodSlug ? neighborhoodBySlug(input.neighborhoodSlug) : null;
  const nextPeriod = input.payPeriod ?? existing.payPeriod;
  const negotiable = nextPeriod === "negotiable";
  await prisma.akaziListing.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categorySlug !== undefined ? { categorySlug: input.categorySlug } : {}),
      ...(input.employment !== undefined ? { employment: input.employment } : {}),
      ...(input.isRemote !== undefined ? { isRemote: input.isRemote } : {}),
      ...(input.payPeriod !== undefined ? { payPeriod: input.payPeriod } : {}),
      ...(negotiable
        ? { payMin: null, payMax: null }
        : {
            ...(input.payMin !== undefined ? { payMin: input.payMin } : {}),
            ...(input.payMax !== undefined ? { payMax: input.payMax } : {}),
          }),
      ...(input.neighborhoodSlug !== undefined ? { neighborhoodSlug: input.neighborhoodSlug, lat: n?.lat, lng: n?.lng } : {}),
      ...(input.status !== undefined
        ? { status: input.status, closedAt: input.status === "open" ? null : new Date() }
        : {}),
    },
  });
  if (input.imageIds) await attachImages(input.imageIds, posterId, { akaziId: id });
  return getAkazi(id, posterId);
}

export async function setStatus(id: string, posterId: string, status: string): Promise<AkaziDto> {
  await ownedOrThrow(id, posterId);
  await prisma.akaziListing.update({
    where: { id },
    data: { status, closedAt: status === "open" ? null : new Date() },
  });
  return getAkazi(id, posterId);
}

export async function bumpAkazi(id: string, posterId: string): Promise<AkaziDto> {
  await ownedOrThrow(id, posterId);
  await prisma.akaziListing.update({ where: { id }, data: { bumpedAt: new Date() } });
  return getAkazi(id, posterId);
}

export async function deleteAkazi(id: string, requesterId: string, isStaff: boolean): Promise<void> {
  const existing = await prisma.akaziListing.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw errors.notFound("Iri tangazo ntiribaho");
  if (existing.posterId !== requesterId && !isStaff) throw errors.forbidden();
  await prisma.akaziListing.update({ where: { id }, data: { deletedAt: new Date(), status: "removed" } });
}

// ── Bookmarks ────────────────────────────────────────────────────────────────
export async function addBookmark(userId: string, akaziId: string): Promise<{ bookmarked: true; bookmarkCount: number }> {
  const akazi = await prisma.akaziListing.findFirst({ where: { id: akaziId, deletedAt: null } });
  if (!akazi) throw errors.notFound("Iri tangazo ntiribaho");
  try {
    await prisma.$transaction([
      prisma.akaziBookmark.create({ data: { userId, akaziId } }),
      prisma.akaziListing.update({ where: { id: akaziId }, data: { bookmarkCount: { increment: 1 } } }),
    ]);
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError)?.code !== "P2002") throw err;
  }
  const fresh = await prisma.akaziListing.findUnique({ where: { id: akaziId } });
  return { bookmarked: true, bookmarkCount: fresh?.bookmarkCount ?? akazi.bookmarkCount };
}

export async function removeBookmark(userId: string, akaziId: string): Promise<{ bookmarked: false; bookmarkCount: number }> {
  const deleted = await prisma.akaziBookmark.deleteMany({ where: { userId, akaziId } });
  if (deleted.count > 0) {
    await prisma.akaziListing.update({ where: { id: akaziId }, data: { bookmarkCount: { decrement: 1 } } });
  }
  const fresh = await prisma.akaziListing.findUnique({ where: { id: akaziId } });
  return { bookmarked: false, bookmarkCount: Math.max(0, fresh?.bookmarkCount ?? 0) };
}

export async function listBookmarks(userId: string): Promise<AkaziDto[]> {
  const rows = await prisma.akaziBookmark.findMany({
    where: { userId, akazi: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: { akazi: { include: withRelations } },
    take: 100,
  });
  return decorate(rows.map((b) => b.akazi), userId, null);
}

// ── Applications ─────────────────────────────────────────────────────────────
export async function applyToAkazi(applicantId: string, akaziId: string, message: string): Promise<AkaziApplicationDto> {
  const akazi = await prisma.akaziListing.findFirst({ where: { id: akaziId, deletedAt: null } });
  if (!akazi) throw errors.notFound("Iri tangazo ntiribaho");
  if (akazi.posterId === applicantId) throw errors.badRequest("Ntushobora kwiyandikisha ku itangazo ryawe");
  if (akazi.status !== "open") throw errors.badRequest("Iri tangazo ntirikiri rifunguye");

  let application;
  try {
    [application] = await prisma.$transaction([
      prisma.akaziApplication.create({
        data: { akaziId, applicantId, message },
        include: { applicant: true },
      }),
      prisma.akaziListing.update({ where: { id: akaziId }, data: { applicationCount: { increment: 1 } } }),
    ]);
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      throw errors.conflict("Wamaze kwiyandikisha kuri iri tangazo");
    }
    throw err;
  }

  events.emit("akazi.applied", { akaziId, applicationId: application.id, applicantId, posterId: akazi.posterId });
  return toAkaziApplicationDto(application);
}

export async function listApplications(akaziId: string, requesterId: string, isStaff: boolean): Promise<AkaziApplicationDto[]> {
  const akazi = await prisma.akaziListing.findFirst({ where: { id: akaziId, deletedAt: null } });
  if (!akazi) throw errors.notFound("Iri tangazo ntiribaho");
  if (akazi.posterId !== requesterId && !isStaff) throw errors.forbidden();
  const rows = await prisma.akaziApplication.findMany({
    where: { akaziId },
    orderBy: { createdAt: "desc" },
    include: { applicant: true },
    take: 200,
  });
  return rows.map((a) => toAkaziApplicationDto(a));
}

export async function listMyApplications(applicantId: string): Promise<AkaziApplicationDto[]> {
  const rows = await prisma.akaziApplication.findMany({
    where: { applicantId, akazi: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: { applicant: true, akazi: true },
    take: 100,
  });
  return rows.map((a) => toAkaziApplicationDto(a));
}

/**
 * Update an application's status. The poster may shortlist / accept / decline;
 * the applicant may withdraw their own application. Notifies the other party.
 */
export async function setApplicationStatus(
  applicationId: string,
  requesterId: string,
  status: AkaziApplicationStatus,
): Promise<AkaziApplicationDto> {
  const application = await prisma.akaziApplication.findUnique({
    where: { id: applicationId },
    include: { applicant: true, akazi: true },
  });
  if (!application || application.akazi.deletedAt) throw errors.notFound("Iyi nyandiko ntibaho");

  const isApplicant = application.applicantId === requesterId;
  const isPoster = application.akazi.posterId === requesterId;
  if (status === "withdrawn") {
    if (!isApplicant) throw errors.forbidden("Usaba gusa ni we ushobora kwikuramo");
  } else if (status === "submitted") {
    throw errors.badRequest("Ntushobora gusubiza inyandiko mu ntangiriro");
  } else if (!isPoster) {
    throw errors.forbidden("Uwatanze itangazo gusa ni we ushobora guhindura uko bigenda");
  }

  const updated = await prisma.akaziApplication.update({
    where: { id: applicationId },
    data: { status },
    include: { applicant: true, akazi: true },
  });

  events.emit("akazi.application_updated", {
    akaziId: application.akaziId,
    applicationId,
    applicantId: application.applicantId,
    posterId: application.akazi.posterId,
    status,
  });
  return toAkaziApplicationDto(updated);
}
