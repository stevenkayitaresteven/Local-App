/**
 * Application-level enumerations. Stored as strings in the database so the schema
 * stays portable across SQLite (dev) and PostgreSQL (prod) without native enums.
 */

export const USER_ROLES = ["member", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LISTING_STATUS = ["active", "reserved", "sold", "hidden", "removed"] as const;
export type ListingStatus = (typeof LISTING_STATUS)[number];

export const LISTING_CONDITION = ["new", "like_new", "good", "fair", "for_parts"] as const;
export type ListingCondition = (typeof LISTING_CONDITION)[number];

export const REPORT_STATUS = ["open", "reviewing", "actioned", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

export const REPORT_TARGET = ["listing", "post", "comment", "user", "message"] as const;
export type ReportTarget = (typeof REPORT_TARGET)[number];

export const NOTIFICATION_TYPES = [
  "message",
  "listing_favorited",
  "listing_sold",
  "post_liked",
  "post_commented",
  "comment_liked",
  "new_follower",
  "review_received",
  "report_update",
  "ibimina_payout",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const IBIMINA_STATUS = ["forming", "active", "completed", "paused"] as const;
export type IbiminaStatus = (typeof IBIMINA_STATUS)[number];

export const PAYMENT_PROVIDERS = ["mtn_momo", "airtel_money", "cash"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const SORT_OPTIONS = ["recent", "price_asc", "price_desc", "nearby", "popular"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
