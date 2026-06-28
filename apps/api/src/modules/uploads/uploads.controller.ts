import { Router } from "express";
import multer from "multer";
import { uploadImage } from "./uploads.service.js";
import { asyncHandler, created } from "../../lib/http.js";
import { requireAuth } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";
import { MAX_IMAGE_BYTES } from "../../lib/storage.js";
import { errors } from "../../lib/errors.js";

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

uploadsRouter.post(
  "/images",
  requireAuth,
  writeLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw errors.badRequest("Nta foto yoherejwe");
    const image = await uploadImage(req.auth!.userId, req.file);
    created(res, { image });
  }),
);
