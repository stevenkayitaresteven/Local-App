# Database

The schema lives in [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).
It is **provider-agnostic**: it runs on SQLite for local dev and PostgreSQL in production
without changes to the models. To keep that portability we avoid native enums and array
columns — status fields are strings validated at the application edge (see
`packages/shared/enums.ts`), and money is stored as whole **Rwandan Francs** (`Int`).

## Entities

| Group | Models |
|-------|--------|
| Identity | `User`, `Session` (refresh/device sessions), `VerificationToken` (OTP/reset) |
| Marketplace | `Listing`, `Image`, `Favorite`, `RecentlyViewed` |
| Akazi (jobs & services) | `AkaziListing`, `AkaziBookmark`, `AkaziApplication` |
| Community | `Post`, `Comment`, `PostLike`, `CommentLike` |
| Messaging | `Conversation`, `ConversationParticipant`, `Message` |
| Social graph | `Follow`, `Block` |
| Trust & safety | `Review`, `Report`, `AuditLog` |
| Engagement | `Notification`, `SearchQuery` |
| Money | `Wallet`, `WalletTransaction`, `Payment`, `Ibimina`, `IbiminaMember` |

## Key design choices

- **Denormalized counters** (`favoriteCount`, `likeCount`, `commentCount`, `viewCount`,
  per-participant `unreadCount`) are maintained transactionally so list/feed reads stay
  cheap and never aggregate on the hot path.
- **Soft deletes** (`deletedAt`) on `User`, `Listing`, `AkaziListing`, `Post`, `Comment`
  preserve history and keep moderation reversible; queries filter them out.
- **Akazi** reuses the marketplace's shape: an `AkaziListing` (job/service, with an optional
  `payMin..payMax` range over a `payPeriod`) carries denormalized `bookmarkCount` /
  `applicationCount`; `AkaziBookmark` mirrors `Favorite`, and `AkaziApplication` is unique per
  `(akazi, applicant)` with a status workflow (`submitted → shortlisted → accepted/declined`,
  or applicant `withdrawn`). `Image` gained an optional `akaziId` target alongside listing/post.
- **Cascading rules** are explicit on every relation (`onDelete: Cascade` / `SetNull`) so
  deleting a user or listing leaves no orphans.
- **Indexes** target the real access patterns: `Listing(status, categorySlug)`,
  `Listing(neighborhoodSlug)`, `Listing(bumpedAt)`, `Post(neighborhoodSlug, createdAt)`,
  `Message(conversationId, createdAt)`, `Notification(userId, readAt)`, `User(agaciro)`, etc.
- **Uniqueness** enforces correctness: one favorite per `(user, listing)`, one membership per
  `(conversation, user)`, one review per `(author, subject, listing)`, unique refresh-token
  hashes, unique payment refs.
- **Reputation** is cached on `User.agaciro` (+ `ratingAverage`, `ratingCount`,
  `responseRate`) and recomputed by `modules/users/reputation.service.ts` on relevant events.

## Migrations

A baseline migration is committed under `apps/api/prisma/migrations`. Apply with:

```bash
npm run db:migrate -w @umuturanyi/api    # prisma migrate deploy
npm run db:seed                           # demo data
```

To evolve the schema during development: edit `schema.prisma`, then
`npx prisma migrate dev --name <change>` (from `apps/api`).
