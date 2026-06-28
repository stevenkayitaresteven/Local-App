import type { ListingStatus, ListingCondition, UserRole, NotificationType } from "./enums.js";
import type { TrustTier } from "./trust.js";

/**
 * Wire DTOs — the shape the API returns and the web consumes. Kept free of any
 * server-only types (no Prisma) so the package stays dependency-light.
 */

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  neighborhood: { slug: string; name: string; district: string } | null;
  agaciro: number;
  trustTier: TrustTier;
  ratingAverage: number | null;
  ratingCount: number;
  phoneVerified: boolean;
  memberSince: string;
}

export interface AuthUser extends PublicUser {
  email: string | null;
  phone: string;
  role: UserRole;
  bio: string;
}

export interface ImageDto {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
}

export interface ListingDto {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  isNegotiable: boolean;
  status: ListingStatus;
  condition: ListingCondition;
  category: { slug: string; rw: string; en: string; icon: string };
  neighborhood: { slug: string; name: string; district: string };
  images: ImageDto[];
  seller: PublicUser;
  favoriteCount: number;
  viewCount: number;
  chatCount: number;
  isFavorited: boolean;
  distanceKm: number | null;
  createdAt: string;
  bumpedAt: string;
}

export interface PostDto {
  id: string;
  body: string;
  topic: { slug: string; rw: string; en: string };
  neighborhood: { slug: string; name: string };
  author: PublicUser;
  images: ImageDto[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  body: string;
  author: PublicUser;
  parentId: string | null;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  listing: Pick<ListingDto, "id" | "title" | "price" | "isFree" | "images" | "status"> | null;
  counterpart: PublicUser;
  lastMessage: MessageDto | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  image: ImageDto | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  actor: PublicUser | null;
  readAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
