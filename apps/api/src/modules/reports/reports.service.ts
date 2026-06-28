import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import type { z } from "zod";
import type { createReportSchema } from "@umuturanyi/shared";

export async function createReport(reporterId: string, input: z.infer<typeof createReportSchema>) {
  // Validate the target actually exists so moderators don't chase ghosts.
  const exists = await targetExists(input.targetType, input.targetId);
  if (!exists) throw errors.notFound("Ikiri gutangwaho raporo ntikibaho");

  const report = await prisma.report.create({
    data: {
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      detail: input.detail,
    },
  });
  events.emit("report.created", { reportId: report.id, targetType: input.targetType, targetId: input.targetId });
  return report;
}

async function targetExists(type: string, id: string): Promise<boolean> {
  switch (type) {
    case "listing":
      return Boolean(await prisma.listing.findUnique({ where: { id }, select: { id: true } }));
    case "post":
      return Boolean(await prisma.post.findUnique({ where: { id }, select: { id: true } }));
    case "comment":
      return Boolean(await prisma.comment.findUnique({ where: { id }, select: { id: true } }));
    case "message":
      return Boolean(await prisma.message.findUnique({ where: { id }, select: { id: true } }));
    case "user":
      return Boolean(await prisma.user.findUnique({ where: { id }, select: { id: true } }));
    default:
      return false;
  }
}
