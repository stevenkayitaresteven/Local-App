# API reference

Base URL: `/api/v1`. All responses are JSON. Authenticated requests send
`Authorization: Bearer <accessToken>` (the mobile client also stores an httpOnly cookie).

Errors use a stable envelope:

```json
{ "error": { "code": "unprocessable", "message": "Amakuru yatanzwe ntiyemewe", "details": { } } }
```

Lists use **keyset pagination**: `{ "items": [...], "nextCursor": "…"|null }`. Pass the
cursor back as `?cursor=`.

Unversioned operational endpoints: `GET /healthz`, `GET /readyz`, `GET /metrics`.

## Auth — `/auth`

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| POST | `/register` | – | `{ displayName, phone, password, neighborhoodSlug, email? }` → user + tokens |
| POST | `/login` | – | `{ identifier, password }` (phone or email) |
| POST | `/refresh` | – | `{ refreshToken }` or cookie → rotates tokens |
| POST | `/logout` | – | revokes the refresh session |
| GET | `/me` | ✔ | current user |
| POST | `/phone/send-otp` | ✔ | issues an OTP (returned as `devCode` outside production) |
| POST | `/phone/verify` | ✔ | `{ code }` → verifies phone, raises Agaciro |
| POST | `/password/forgot` | – | `{ identifier }` |
| POST | `/password/reset` | – | `{ identifier, code, password }` |
| GET | `/sessions` | ✔ | list active device sessions |
| DELETE | `/sessions/:id` | ✔ | revoke a session |

## Listings — `/listings`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | optional | filters: `q, category, neighborhood, minPrice, maxPrice, freeOnly, maxDistanceKm`; `sort=recent\|price_asc\|price_desc\|popular\|nearby`; `cursor, limit` |
| POST | `/` | ✔ | create a listing |
| GET | `/:id` | optional | detail (records a view + recently-viewed) |
| PATCH | `/:id` | ✔ owner | update |
| POST | `/:id/status` | ✔ owner | `{ status }` (e.g. `sold` → increments completed sales) |
| POST | `/:id/bump` | ✔ owner | refresh `bumpedAt` |
| DELETE | `/:id` | ✔ owner/staff | soft delete |
| PUT/DELETE | `/:id/favorite` | ✔ | add / remove favorite |

## Akazi (local jobs & services) — `/akazi`

A neighborhood board where members post **jobs** (hiring) or **services** (offering work),
apply to each other's posts, and save posts they like.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | optional | filters: `q, kind=job\|service, category, employment, neighborhood, remoteOnly, maxDistanceKm`; `sort=recent\|nearby\|pay_high\|popular`; `cursor, limit` |
| POST | `/` | ✔ | create a post (`{ kind, title, description, categorySlug, employment?, isRemote?, payPeriod?, payMin?, payMax?, neighborhoodSlug, imageIds? }`) |
| GET | `/bookmarks` | ✔ | the caller's saved posts |
| GET | `/applications/mine` | ✔ | the caller's own applications (with post summaries) |
| POST | `/applications/:id/status` | ✔ | `{ status }` — poster: `shortlisted\|accepted\|declined` · applicant: `withdrawn` |
| GET | `/:id` | optional | detail (records a view) |
| PATCH | `/:id` | ✔ owner | update |
| POST | `/:id/status` | ✔ owner | `{ status: open\|filled\|closed }` |
| POST | `/:id/bump` | ✔ owner | refresh `bumpedAt` |
| DELETE | `/:id` | ✔ owner/staff | soft delete |
| PUT/DELETE | `/:id/bookmark` | ✔ | save / unsave |
| POST | `/:id/apply` | ✔ | `{ message }` (one per user; notifies the poster) |
| GET | `/:id/applications` | ✔ owner/staff | applicants for a post |

Pay is an optional range (`payMin`/`payMax`, whole Frw) over a `payPeriod`
(`hour\|day\|week\|month\|fixed\|negotiable`); a `negotiable` period clears the figures.

## Community — `/community`

`GET /posts` (feed: `neighborhood, topic, sort, cursor`), `POST /posts`, `GET /posts/:id`,
`DELETE /posts/:id`, `PUT /posts/:id/like`, `GET|POST /posts/:id/comments`,
`DELETE /comments/:id`, `PUT /comments/:id/like`.

## Messaging — `/messages` _(all auth)_

`GET /conversations`, `GET /unread-count`, `POST /conversations`
(`{ recipientId, listingId?, body }` → finds or creates), `GET /conversations/:id/messages`
(`before, limit`), `POST /conversations/:id/messages`, `POST /conversations/:id/read`.

Realtime (Socket.IO, path `/realtime`, auth via handshake token): emit
`conversation:join|leave`, `typing`, `message:read`; receive `message:new`, `typing`,
`message:read`, `notification:new`, `presence:online|offline`.

## Users — `/users`

`GET /me`, `PATCH /me`, `GET /:id` (profile + Agaciro breakdown), `GET /:id/listings`,
`GET /:id/akazi`, `GET /:id/reviews`, `PUT|DELETE /:id/follow`, `PUT|DELETE /:id/block`,
`POST /reviews` (`{ subjectId, rating, comment, listingId? }`),
`POST /reports` (`{ targetType, targetId, reason, detail? }`).

## Me — `/me` _(auth)_

`GET /favorites`, `GET /recently-viewed`.

## Wallet (Umuturanyi Pay) — `/wallet` _(auth)_

`GET /` (balance + transactions), `POST /topup` (`{ amount, provider }`),
`POST /pay` (`{ amount, provider, purpose, listingId? }`).

## Ibimina (savings circles) — `/ibimina`

`GET /` (`neighborhood?`), `POST /`, `GET /:id`, `PUT /:id/join`, `DELETE /:id/leave`.

## Notifications — `/notifications` _(auth)_

`GET /` (paginated), `GET /unread-count`, `POST /read` (`{ ids }`), `POST /read-all`.

## Search — `/search`

`GET /` (same filters as listings; records the term), `GET /suggest?q=`, `GET /popular`,
`GET /recent` (auth), `DELETE /recent` (auth).

## Catalog (reference data)

`GET /categories`, `GET /akazi-categories`, `GET /topics`, `GET /neighborhoods`, `GET /glossary`.

## Uploads — `/uploads` _(auth)_

`POST /images` — multipart `file` (JPEG/PNG/WebP/GIF, ≤ 8 MB) → `{ image }`.

## Admin — `/admin` _(moderator/admin)_

`GET /stats`, `GET /reports?status=`, `POST /reports/:id/resolve`
(`{ action: actioned|dismissed, removeTarget?, note? }`), `GET /users?q=`,
`POST /users/:id/role` (admin), `POST /users/:id/suspend`, `GET /audit-logs` (admin).
