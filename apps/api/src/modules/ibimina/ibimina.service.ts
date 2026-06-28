import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { createNotification } from "../notifications/notifications.service.js";
import { neighborhoodBySlug } from "@umuturanyi/shared";
import type { createIbiminaSchema } from "@umuturanyi/shared";
import type { z } from "zod";

type CreateInput = z.infer<typeof createIbiminaSchema>;

const include = {
  owner: true,
  members: { include: { user: true }, orderBy: { joinPosition: "asc" } },
} as const;

function mapIbimina(ib: Awaited<ReturnType<typeof getRaw>>) {
  const n = neighborhoodBySlug(ib.neighborhoodSlug);
  return {
    id: ib.id,
    name: ib.name,
    contributionAmount: ib.contributionAmount,
    cycleDays: ib.cycleDays,
    memberLimit: ib.memberLimit,
    status: ib.status,
    currentCycle: ib.currentCycle,
    neighborhood: n ? { slug: n.slug, name: n.name } : { slug: ib.neighborhoodSlug, name: ib.neighborhoodSlug },
    potSize: ib.contributionAmount * ib.members.length,
    owner: { id: ib.owner.id, displayName: ib.owner.displayName, avatarUrl: ib.owner.avatarUrl },
    members: ib.members.map((m) => ({
      id: m.user.id,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      joinPosition: m.joinPosition,
      hasPaidCycle: m.hasPaidCycle,
    })),
    createdAt: ib.createdAt.toISOString(),
  };
}

async function getRaw(id: string) {
  const ib = await prisma.ibimina.findUnique({ where: { id }, include });
  if (!ib) throw errors.notFound("Ikimina ntikibaho");
  return ib;
}

export async function createIbimina(ownerId: string, input: CreateInput) {
  const ib = await prisma.ibimina.create({
    data: {
      ownerId,
      name: input.name,
      contributionAmount: input.contributionAmount,
      cycleDays: input.cycleDays,
      memberLimit: input.memberLimit,
      neighborhoodSlug: input.neighborhoodSlug,
      members: { create: { userId: ownerId, joinPosition: 1 } },
    },
    include,
  });
  return mapIbimina(ib);
}

export async function listIbimina(neighborhood?: string) {
  const rows = await prisma.ibimina.findMany({
    where: { ...(neighborhood ? { neighborhoodSlug: neighborhood } : {}), status: { in: ["forming", "active"] } },
    include,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(mapIbimina);
}

export async function getIbimina(id: string) {
  return mapIbimina(await getRaw(id));
}

export async function joinIbimina(id: string, userId: string) {
  const ib = await getRaw(id);
  if (ib.members.length >= ib.memberLimit) throw errors.conflict("Ikimina cyujuje umubare w'abanyamuryango");
  if (ib.members.some((m) => m.userId === userId)) return mapIbimina(ib);

  const nextPosition = Math.max(0, ...ib.members.map((m) => m.joinPosition)) + 1;
  await prisma.ibiminaMember.create({ data: { ibiminaId: id, userId, joinPosition: nextPosition } });

  if (nextPosition >= ib.memberLimit) {
    await prisma.ibimina.update({ where: { id }, data: { status: "active" } });
  }
  await createNotification({
    userId: ib.ownerId,
    type: "system",
    title: "Umunyamuryango mushya yinjiye mu kimina",
    body: ib.name,
    link: `/ibimina/${id}`,
    actorId: userId,
  });
  return getIbimina(id);
}

export async function leaveIbimina(id: string, userId: string) {
  const ib = await getRaw(id);
  if (ib.ownerId === userId) throw errors.badRequest("Nyir'ikimina ntashobora kuva mu kimina");
  await prisma.ibiminaMember.deleteMany({ where: { ibiminaId: id, userId } });
  return getIbimina(id);
}
