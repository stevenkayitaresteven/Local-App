import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { recomputeAgaciro } from "../users/reputation.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import type { Prisma } from "@prisma/client";

export async function dashboardStats() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [
    users,
    activeListings,
    soldListings,
    posts,
    openReports,
    messages,
    openAkaziJobs,
    openAkaziServices,
    newUsers,
    newListings,
    newAkazi,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.listing.count({ where: { status: "active", deletedAt: null } }),
    prisma.listing.count({ where: { status: "sold" } }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
    prisma.message.count(),
    prisma.akaziListing.count({ where: { status: "open", kind: "job", deletedAt: null } }),
    prisma.akaziListing.count({ where: { status: "open", kind: "service", deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.listing.count({ where: { createdAt: { gte: since } } }),
    prisma.akaziListing.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
  ]);
  return {
    users,
    activeListings,
    soldListings,
    posts,
    openReports,
    messages,
    akaziJobs: openAkaziJobs,
    akaziServices: openAkaziServices,
    last7Days: { newUsers, newListings, newAkazi },
  };
}

export async function listReports(status?: string) {
  const where: Prisma.ReportWhereInput = status ? { status } : { status: { in: ["open", "reviewing"] } };
  const reports = await prisma.report.findMany({
    where,
    include: { reporter: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return reports.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    reporter: r.reporter,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function resolveReport(
  reportId: string,
  handlerId: string,
  action: "actioned" | "dismissed",
  options: { note?: string; removeTarget?: boolean },
) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw errors.notFound("Raporo ntibaho");

  await prisma.report.update({
    where: { id: reportId },
    data: { status: action, handledById: handlerId, resolutionNote: options.note ?? null },
  });

  await writeAudit(handlerId, `report.${action}`, report.targetType, report.targetId, { reportId });

  if (action === "actioned") {
    if (options.removeTarget) await takedownTarget(report.targetType, report.targetId, handlerId);
    if (report.targetType === "user") await recomputeAgaciro(report.targetId);
  }
  return { id: reportId, status: action };
}

async function takedownTarget(type: string, id: string, handlerId: string): Promise<void> {
  switch (type) {
    case "listing":
      await prisma.listing.updateMany({ where: { id }, data: { status: "removed", deletedAt: new Date() } });
      break;
    case "post":
      await prisma.post.updateMany({ where: { id }, data: { deletedAt: new Date() } });
      break;
    case "akazi":
      await prisma.akaziListing.updateMany({ where: { id }, data: { status: "removed", deletedAt: new Date() } });
      break;
    case "comment":
      await prisma.comment.updateMany({ where: { id }, data: { deletedAt: new Date() } });
      break;
    case "user":
      await prisma.user.updateMany({ where: { id }, data: { deletedAt: new Date() } });
      await prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      break;
  }
  await writeAudit(handlerId, "moderation.takedown", type, id, {});
}

export async function listUsers(q?: string) {
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ displayName: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      displayName: true,
      phone: true,
      email: true,
      role: true,
      agaciro: true,
      phoneVerified: true,
      deletedAt: true,
      createdAt: true,
    },
  });
  return users.map((u) => ({ ...u, suspended: Boolean(u.deletedAt), createdAt: u.createdAt.toISOString(), deletedAt: undefined }));
}

export async function setRole(actorId: string, userId: string, role: "member" | "moderator" | "admin") {
  if (actorId === userId) throw errors.badRequest("Ntushobora guhindura uruhare rwawe ubwawe");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAudit(actorId, "user.role_changed", "user", userId, { role });
  await createNotification({ userId, type: "system", title: `Uruhare rwawe rwahinduwe rumeze nka ${role}` });
  return { id: userId, role };
}

export async function setSuspended(actorId: string, userId: string, suspended: boolean) {
  if (actorId === userId) throw errors.badRequest("Ntushobora kwihagarika ubwawe");
  await prisma.user.update({ where: { id: userId }, data: { deletedAt: suspended ? new Date() : null } });
  if (suspended) {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  await writeAudit(actorId, suspended ? "user.suspended" : "user.reinstated", "user", userId, {});
  return { id: userId, suspended };
}

export async function listAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { id: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    actor: l.actor,
    targetType: l.targetType,
    targetId: l.targetId,
    metadata: safeJson(l.metadata),
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function writeAudit(
  actorId: string | null,
  action: string,
  targetType: string | null,
  targetId: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog
    .create({ data: { actorId, action, targetType, targetId, metadata: JSON.stringify(metadata) } })
    .catch(() => {});
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
