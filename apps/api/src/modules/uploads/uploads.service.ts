import { imageSize } from "image-size";
import { prisma } from "../../lib/prisma.js";
import { storage, isAllowedImage, MAX_IMAGE_BYTES } from "../../lib/storage.js";
import { errors } from "../../lib/errors.js";
import { toImageDto } from "../../mappers/index.js";
import type { ImageDto } from "@umuturanyi/shared";

export async function uploadImage(ownerId: string, file: { buffer: Buffer; mimetype: string; size: number }): Promise<ImageDto> {
  if (!isAllowedImage(file.mimetype)) {
    throw errors.badRequest("Ubwoko bw'ifoto ntibwemewe (JPEG, PNG, WebP, GIF gusa)");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw errors.badRequest("Ifoto irenze ingano yemewe (8MB)");
  }

  let width: number | null = null;
  let height: number | null = null;
  try {
    const dim = imageSize(file.buffer);
    width = dim.width ?? null;
    height = dim.height ?? null;
  } catch {
    // non-fatal — dimensions are a nicety, not a requirement
  }

  const stored = await storage.put(file.buffer, file.mimetype);
  const image = await prisma.image.create({
    data: {
      ownerId,
      key: stored.key,
      url: stored.url,
      mime: file.mimetype,
      size: file.size,
      width,
      height,
    },
  });
  return toImageDto(image);
}

/**
 * Attach previously-uploaded images to a listing or post. Verifies ownership and
 * that each image is unattached, then sets order by the array index. Idempotent.
 */
export async function attachImages(
  imageIds: string[],
  ownerId: string,
  target: { listingId?: string; postId?: string },
): Promise<void> {
  if (!imageIds.length) return;
  const images = await prisma.image.findMany({ where: { id: { in: imageIds }, ownerId } });
  const valid = new Map(images.map((i) => [i.id, i]));
  await prisma.$transaction(
    imageIds
      .filter((id) => valid.has(id))
      .map((id, index) =>
        prisma.image.update({
          where: { id },
          data: { listingId: target.listingId ?? null, postId: target.postId ?? null, position: index },
        }),
      ),
  );
}
