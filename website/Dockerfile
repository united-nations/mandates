# Dockerfile for Next.js

# 1. Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. Install dependencies
FROM base AS deps
COPY website/package.json website/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3. Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY website/ .
RUN pnpm build

# 4. Production image
FROM base AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

CMD ["node", "server.js"]
