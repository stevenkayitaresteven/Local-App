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

export const REPORT_TARGET = ["listing", "post", "comment", "user", "message", "akazi"] as const;
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
  "akazi_applied",
  "akazi_application_update",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const IBIMINA_STATUS = ["forming", "active", "completed", "paused"] as const;
export type IbiminaStatus = (typeof IBIMINA_STATUS)[number];

export const PAYMENT_PROVIDERS = ["mtn_momo", "airtel_money", "cash"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const SORT_OPTIONS = ["recent", "price_asc", "price_desc", "nearby", "popular"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// ── Akazi (local jobs & services board) ──────────────────────────────────────
/** A post is either a job opening (someone hiring) or a service offering (someone working). */
export const AKAZI_KIND = ["job", "service"] as const;
export type AkaziKind = (typeof AKAZI_KIND)[number];

/** Employment arrangement. "flexible" is the natural default for service offerings. */
export const AKAZI_EMPLOYMENT = [
  "full_time",
  "part_time",
  "temporary",
  "contract",
  "gig",
  "flexible",
] as const;
export type AkaziEmployment = (typeof AKAZI_EMPLOYMENT)[number];

/** How the advertised pay is expressed. "negotiable" hides a fixed figure. */
export const AKAZI_PAY_PERIOD = ["hour", "day", "week", "month", "fixed", "negotiable"] as const;
export type AkaziPayPeriod = (typeof AKAZI_PAY_PERIOD)[number];

export const AKAZI_STATUS = ["open", "filled", "closed", "removed"] as const;
export type AkaziStatus = (typeof AKAZI_STATUS)[number];

export const AKAZI_APPLICATION_STATUS = [
  "submitted",
  "shortlisted",
  "accepted",
  "declined",
  "withdrawn",
] as const;
export type AkaziApplicationStatus = (typeof AKAZI_APPLICATION_STATUS)[number];

/** Sort options for the Akazi board (no price_asc/desc — pay is a range, not a point). */
export const AKAZI_SORT = ["recent", "nearby", "pay_high", "popular"] as const;
export type AkaziSort = (typeof AKAZI_SORT)[number];
