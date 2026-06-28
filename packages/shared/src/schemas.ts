import { z } from "zod";
import { CATEGORY_SLUGS } from "./categories.js";
import { NEIGHBORHOOD_SLUGS } from "./locations.js";
import {
  COMMUNITY_TOPIC_SLUGS,
} from "./categories.js";
import {
  LISTING_CONDITION,
  LISTING_STATUS,
  REPORT_TARGET,
  SORT_OPTIONS,
  PAYMENT_PROVIDERS,
} from "./enums.js";

/** Rwandan phone numbers: +2507XXXXXXXX or 07XXXXXXXX. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?25)?0?7[2389]\d{7}$/, "Nimero ya telefoni ntiyemewe");

export const passwordSchema = z
  .string()
  .min(8, "Ijambobanga rigomba kuba nibura inyuguti 8")
  .max(128);

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: phoneSchema,
  password: passwordSchema,
  neighborhoodSlug: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(3), // phone or email
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  neighborhoodSlug: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const priceSchema = z
  .number({ invalid_type_error: "Igiciro kigomba kuba umubare" })
  .int()
  .min(0)
  .max(1_000_000_000);

export const createListingSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(4000).default(""),
  price: priceSchema,
  isFree: z.boolean().default(false),
  isNegotiable: z.boolean().default(true),
  categorySlug: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  condition: z.enum(LISTING_CONDITION).default("good"),
  neighborhoodSlug: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]),
  imageIds: z.array(z.string().cuid()).max(10).default([]),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(LISTING_STATUS).optional(),
});

export const listingQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]).optional(),
  neighborhood: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  maxDistanceKm: z.coerce.number().min(0).max(500).optional(),
  freeOnly: z.coerce.boolean().optional(),
  sort: z.enum(SORT_OPTIONS).default("recent"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const createPostSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  topicSlug: z.enum(COMMUNITY_TOPIC_SLUGS as [string, ...string[]]),
  neighborhoodSlug: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]),
  imageIds: z.array(z.string().cuid()).max(6).default([]),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  parentId: z.string().cuid().optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().max(2000).default(""),
  imageId: z.string().cuid().optional(),
});

export const startConversationSchema = z.object({
  listingId: z.string().cuid().optional(),
  recipientId: z.string().cuid(),
  body: z.string().trim().min(1).max(2000),
});

export const createReviewSchema = z.object({
  subjectId: z.string().cuid(),
  listingId: z.string().cuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).default(""),
});

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET),
  targetId: z.string().cuid(),
  reason: z.string().trim().min(3).max(80),
  detail: z.string().trim().max(1000).default(""),
});

export const createIbiminaSchema = z.object({
  name: z.string().trim().min(3).max(60),
  contributionAmount: priceSchema.refine((n) => n > 0, "Umusanzu ugomba kurenga 0"),
  cycleDays: z.number().int().min(1).max(90).default(7),
  memberLimit: z.number().int().min(2).max(60).default(10),
  neighborhoodSlug: z.enum(NEIGHBORHOOD_SLUGS as [string, ...string[]]),
});

export const paymentIntentSchema = z.object({
  amount: priceSchema.refine((n) => n > 0),
  provider: z.enum(PAYMENT_PROVIDERS),
  phone: phoneSchema.optional(),
  purpose: z.string().trim().max(120).default("purchase"),
  listingId: z.string().cuid().optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
