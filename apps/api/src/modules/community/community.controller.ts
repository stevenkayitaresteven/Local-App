import { Router } from "express";
import { z } from "zod";
import {
  createPostSchema,
  createCommentSchema,
  COMMUNITY_TOPIC_SLUGS,
  NEIGHBORHOOD_SLUGS,
} from "@umuturanyi/shared";
import * as community from "./community.service.js";
import { asyncHandler, ok, created, noContent } from "../../lib/http.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth, attachUser } from "../../middleware/auth.js";
import { writeLimiter } from "../../middleware/rateLimit.js";

export const communityRouter = Router();

const feedQuery = z.object({
  neighborhood: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]).optional(),
  topic: z.enum(COMMUNITY_TOPIC_SLUGS as [string, ...string[]]).optional(),
  sort: z.enum(["recent", "popular"]).default("recent"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

communityRouter.get(
  "/posts",
  attachUser,
  validate(feedQuery, "query"),
  asyncHandler(async (req, res) => {
    ok(res, await community.listPosts(req.query as never, req.auth?.userId));
  }),
);

communityRouter.post(
  "/posts",
  requireAuth,
  writeLimiter,
  validate(createPostSchema),
  asyncHandler(async (req, res) => {
    created(res, { post: await community.createPost(req.auth!.userId, req.body) });
  }),
);

communityRouter.get(
  "/posts/:id",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { post: await community.getPost(req.params.id, req.auth?.userId) });
  }),
);

communityRouter.delete(
  "/posts/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.auth!.role !== "member";
    await community.deletePost(req.params.id, req.auth!.userId, isStaff);
    noContent(res);
  }),
);

communityRouter.put(
  "/posts/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await community.togglePostLike(req.params.id, req.auth!.userId));
  }),
);

communityRouter.get(
  "/posts/:id/comments",
  attachUser,
  asyncHandler(async (req, res) => {
    ok(res, { comments: await community.listComments(req.params.id, req.auth?.userId) });
  }),
);

communityRouter.post(
  "/posts/:id/comments",
  requireAuth,
  writeLimiter,
  validate(createCommentSchema),
  asyncHandler(async (req, res) => {
    created(res, { comment: await community.addComment(req.params.id, req.auth!.userId, req.body) });
  }),
);

communityRouter.delete(
  "/comments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const isStaff = req.auth!.role !== "member";
    await community.deleteComment(req.params.id, req.auth!.userId, isStaff);
    noContent(res);
  }),
);

communityRouter.put(
  "/comments/:id/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    ok(res, await community.toggleCommentLike(req.params.id, req.auth!.userId));
  }),
);
