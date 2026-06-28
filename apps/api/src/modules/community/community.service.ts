import { prisma } from "../../lib/prisma.js";
import { errors } from "../../lib/errors.js";
import { events } from "../../lib/events.js";
import { encodeCursor, decodeCursor } from "../../lib/cursor.js";
import { toPostDto, toCommentDto } from "../../mappers/index.js";
import { attachImages } from "../uploads/uploads.service.js";
import type {
  CreatePostInput,
  PostDto,
  CommentDto,
  Paginated,
} from "@umuturanyi/shared";
import type { Prisma } from "@prisma/client";

const postInclude = { author: true, images: { orderBy: { position: "asc" } } } satisfies Prisma.PostInclude;

export interface FeedQuery {
  neighborhood?: string;
  topic?: string;
  sort?: "recent" | "popular";
  cursor?: string;
  limit: number;
}

export async function listPosts(query: FeedQuery, viewerId?: string): Promise<Paginated<PostDto>> {
  const where: Prisma.PostWhereInput = { deletedAt: null };
  if (query.neighborhood) where.neighborhoodSlug = query.neighborhood;
  if (query.topic) where.topicSlug = query.topic;

  const cursor = decodeCursor(query.cursor);
  const popular = query.sort === "popular";
  const orderBy: Prisma.PostOrderByWithRelationInput[] = popular
    ? [{ likeCount: "desc" }, { id: "desc" }]
    : [{ createdAt: "desc" }, { id: "desc" }];

  const keyset = cursor
    ? popular
      ? { OR: [{ likeCount: { lt: Number(cursor.key) } }, { likeCount: Number(cursor.key), id: { lt: cursor.id } }] }
      : { OR: [{ createdAt: { lt: new Date(cursor.key) } }, { createdAt: new Date(cursor.key), id: { lt: cursor.id } }] }
    : {};

  const rows = await prisma.post.findMany({
    where: { AND: [where, keyset] },
    include: postInclude,
    orderBy,
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const likedIds = await likedPostIds(viewerId, page.map((p) => p.id));
  const last = page[page.length - 1];
  return {
    items: page.map((p) => toPostDto(p, { isLiked: likedIds.has(p.id) })),
    nextCursor:
      hasMore && last
        ? encodeCursor({ key: popular ? last.likeCount : last.createdAt.toISOString(), id: last.id })
        : null,
  };
}

async function likedPostIds(viewerId: string | undefined, postIds: string[]): Promise<Set<string>> {
  if (!viewerId || !postIds.length) return new Set();
  const likes = await prisma.postLike.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(likes.map((l) => l.postId));
}

export async function getPost(id: string, viewerId?: string): Promise<PostDto> {
  const post = await prisma.post.findFirst({ where: { id, deletedAt: null }, include: postInclude });
  if (!post) throw errors.notFound("Inkuru ntibaho");
  void prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  const liked = await likedPostIds(viewerId, [id]);
  return toPostDto(post, { isLiked: liked.has(id) });
}

export async function createPost(authorId: string, input: CreatePostInput): Promise<PostDto> {
  const post = await prisma.post.create({
    data: {
      authorId,
      body: input.body,
      topicSlug: input.topicSlug,
      neighborhoodSlug: input.neighborhoodSlug,
    },
    include: postInclude,
  });
  if (input.imageIds.length) await attachImages(input.imageIds, authorId, { postId: post.id });
  return getPost(post.id, authorId);
}

export async function deletePost(id: string, requesterId: string, isStaff: boolean): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.deletedAt) throw errors.notFound("Inkuru ntibaho");
  if (post.authorId !== requesterId && !isStaff) throw errors.forbidden();
  await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) throw errors.notFound("Inkuru ntibaho");

  const existing = await prisma.postLike.findUnique({ where: { postId_userId: { postId, userId } } });
  if (existing) {
    await prisma.$transaction([
      prisma.postLike.delete({ where: { id: existing.id } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    const fresh = await prisma.post.findUnique({ where: { id: postId } });
    return { liked: false, likeCount: Math.max(0, fresh?.likeCount ?? 0) };
  }
  await prisma.$transaction([
    prisma.postLike.create({ data: { postId, userId } }),
    prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
  ]);
  events.emit("post.liked", { postId, actorId: userId, authorId: post.authorId });
  const fresh = await prisma.post.findUnique({ where: { id: postId } });
  return { liked: true, likeCount: fresh?.likeCount ?? 1 };
}

// ── Comments ────────────────────────────────────────────────────────────────
export async function listComments(postId: string, viewerId?: string): Promise<CommentDto[]> {
  const comments = await prisma.comment.findMany({
    where: { postId, deletedAt: null },
    include: { author: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  let liked = new Set<string>();
  if (viewerId && comments.length) {
    const likes = await prisma.commentLike.findMany({
      where: { userId: viewerId, commentId: { in: comments.map((c) => c.id) } },
      select: { commentId: true },
    });
    liked = new Set(likes.map((l) => l.commentId));
  }
  return comments.map((c) => toCommentDto(c, { isLiked: liked.has(c.id) }));
}

export async function addComment(
  postId: string,
  authorId: string,
  input: { body: string; parentId?: string },
): Promise<CommentDto> {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) throw errors.notFound("Inkuru ntibaho");
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: input.parentId, postId, deletedAt: null } });
    if (!parent) throw errors.badRequest("Igitekerezo cyo gusubiza ntikibaho");
  }

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { postId, authorId, body: input.body, parentId: input.parentId ?? null },
      include: { author: true },
    }),
    prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
  ]);
  events.emit("post.commented", { postId, actorId: authorId, authorId: post.authorId, commentId: comment.id });
  return toCommentDto(comment, { isLiked: false });
}

export async function deleteComment(id: string, requesterId: string, isStaff: boolean): Promise<void> {
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment || comment.deletedAt) throw errors.notFound("Igitekerezo ntikibaho");
  if (comment.authorId !== requesterId && !isStaff) throw errors.forbidden();
  await prisma.$transaction([
    prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
  ]);
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } });
  if (!comment) throw errors.notFound("Igitekerezo ntikibaho");
  const existing = await prisma.commentLike.findUnique({ where: { commentId_userId: { commentId, userId } } });
  if (existing) {
    await prisma.$transaction([
      prisma.commentLike.delete({ where: { id: existing.id } }),
      prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    const fresh = await prisma.comment.findUnique({ where: { id: commentId } });
    return { liked: false, likeCount: Math.max(0, fresh?.likeCount ?? 0) };
  }
  await prisma.$transaction([
    prisma.commentLike.create({ data: { commentId, userId } }),
    prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
  ]);
  events.emit("comment.liked", { commentId, actorId: userId, authorId: comment.authorId });
  const fresh = await prisma.comment.findUnique({ where: { id: commentId } });
  return { liked: true, likeCount: fresh?.likeCount ?? 1 };
}
