import {
  categoryBySlug,
  neighborhoodBySlug,
  tierForScore,
  CATEGORIES,
  type PublicUser,
  type ListingDto,
  type PostDto,
  type CommentDto,
  type ImageDto,
  type MessageDto,
  type NotificationDto,
  type ConversationDto,
  type AuthUser,
  type UserRole,
} from "@umuturanyi/shared";
import type {
  User,
  Listing,
  Image,
  Post,
  Comment,
  Message,
  Notification,
} from "@prisma/client";

const FALLBACK_CATEGORY = { slug: "ibindi", rw: "Ibindi", en: "Other", icon: "📦" };

export function toImageDto(image: Image): ImageDto {
  return { id: image.id, url: image.url, width: image.width, height: image.height };
}

export function toPublicUser(user: User): PublicUser {
  const n = user.neighborhoodSlug ? neighborhoodBySlug(user.neighborhoodSlug) : undefined;
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    neighborhood: n ? { slug: n.slug, name: n.name, district: n.district } : null,
    agaciro: user.agaciro,
    trustTier: tierForScore(user.agaciro),
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    phoneVerified: user.phoneVerified,
    memberSince: user.createdAt.toISOString(),
  };
}

export function toAuthUser(user: User): AuthUser {
  return {
    ...toPublicUser(user),
    email: user.email,
    phone: user.phone,
    role: user.role as UserRole,
    bio: user.bio,
  };
}

interface ListingRelations {
  seller: User;
  images: Image[];
}

export function toListingDto(
  listing: Listing & ListingRelations,
  opts: { isFavorited?: boolean; distanceKm?: number | null } = {},
): ListingDto {
  const cat = categoryBySlug(listing.categorySlug) ?? FALLBACK_CATEGORY;
  const n = neighborhoodBySlug(listing.neighborhoodSlug);
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    isFree: listing.isFree,
    isNegotiable: listing.isNegotiable,
    status: listing.status as ListingDto["status"],
    condition: listing.condition as ListingDto["condition"],
    category: { slug: cat.slug, rw: cat.rw, en: cat.en, icon: cat.icon },
    neighborhood: n
      ? { slug: n.slug, name: n.name, district: n.district }
      : { slug: listing.neighborhoodSlug, name: listing.neighborhoodSlug, district: "" },
    images: [...listing.images].sort((a, b) => a.position - b.position).map(toImageDto),
    seller: toPublicUser(listing.seller),
    favoriteCount: listing.favoriteCount,
    viewCount: listing.viewCount,
    chatCount: listing.chatCount,
    isFavorited: opts.isFavorited ?? false,
    distanceKm: opts.distanceKm ?? null,
    createdAt: listing.createdAt.toISOString(),
    bumpedAt: listing.bumpedAt.toISOString(),
  };
}

export function toPostDto(
  post: Post & { author: User; images: Image[] },
  opts: { isLiked?: boolean } = {},
): PostDto {
  const topic = TOPIC_LOOKUP[post.topicSlug] ?? { slug: post.topicSlug, rw: post.topicSlug, en: post.topicSlug };
  const n = neighborhoodBySlug(post.neighborhoodSlug);
  return {
    id: post.id,
    body: post.body,
    topic,
    neighborhood: n ? { slug: n.slug, name: n.name } : { slug: post.neighborhoodSlug, name: post.neighborhoodSlug },
    author: toPublicUser(post.author),
    images: [...post.images].sort((a, b) => a.position - b.position).map(toImageDto),
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    viewCount: post.viewCount,
    isLiked: opts.isLiked ?? false,
    createdAt: post.createdAt.toISOString(),
  };
}

export function toCommentDto(
  comment: Comment & { author: User },
  opts: { isLiked?: boolean } = {},
): CommentDto {
  return {
    id: comment.id,
    body: comment.body,
    author: toPublicUser(comment.author),
    parentId: comment.parentId,
    likeCount: comment.likeCount,
    isLiked: opts.isLiked ?? false,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function toMessageDto(message: Message & { image?: Image | null }): MessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    image: message.image ? toImageDto(message.image) : null,
    readAt: message.readAt ? message.readAt.toISOString() : null,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toNotificationDto(
  n: Notification & { actor?: User | null },
): NotificationDto {
  return {
    id: n.id,
    type: n.type as NotificationDto["type"],
    title: n.title,
    body: n.body,
    link: n.link,
    actor: n.actor ? toPublicUser(n.actor) : null,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toConversationDto(args: {
  id: string;
  listing: (Listing & { images: Image[] }) | null;
  counterpart: User;
  lastMessage: (Message & { image?: Image | null }) | null;
  unreadCount: number;
  updatedAt: Date;
}): ConversationDto {
  return {
    id: args.id,
    listing: args.listing
      ? {
          id: args.listing.id,
          title: args.listing.title,
          price: args.listing.price,
          isFree: args.listing.isFree,
          status: args.listing.status as ListingDto["status"],
          images: [...args.listing.images].sort((a, b) => a.position - b.position).map(toImageDto),
        }
      : null,
    counterpart: toPublicUser(args.counterpart),
    lastMessage: args.lastMessage ? toMessageDto(args.lastMessage) : null,
    unreadCount: args.unreadCount,
    updatedAt: args.updatedAt.toISOString(),
  };
}

const TOPIC_LOOKUP: Record<string, { slug: string; rw: string; en: string }> = Object.fromEntries(
  // Lazily import community topics to avoid a cycle; mirror the shared list.
  (
    [
      ["amakuru", "Amakuru", "News"],
      ["ibiribwa", "Ibiribwa", "Food"],
      ["umutekano", "Umutekano", "Safety"],
      ["ibibazo", "Ibibazo", "Questions"],
      ["umuganda", "Umuganda", "Community work"],
      ["ibyatakaye", "Ibyatakaye/Ibyabonetse", "Lost & found"],
    ] as const
  ).map(([slug, rw, en]) => [slug, { slug, rw, en }]),
);

void CATEGORIES;
