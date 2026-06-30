# syntax=docker/dockerfile:1
# Build context is the repository root: `docker build -f apps/api/Dockerfile .`

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies (cached on lockfile changes).
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --ignore-scripts

# Build the shared package, generate the Prisma client, compile the API.
# The workspace tsconfigs extend the repo-root tsconfig.base.json, so it must be
# present for `tsc` to resolve compiler options.
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w @umuturanyi/shared \
    && npm run build -w @umuturanyi/api

# Drop dev dependencies to slim the runtime image.
RUN npm prune --omit=dev -w @umuturanyi/api -w @umuturanyi/shared || true

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /app/apps/api/uploads /app/apps/api/data \
    && chown -R node:node /app/apps/api

USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/healthz || exit 1
ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/server.js"]
