# Dockerfile for Next.js

# 1. Base image
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# 2. Install dependencies
FROM base AS deps
COPY website/package.json website/pnpm-lock.yaml website/pnpm-workspace.yaml ./
# Frozen installs need both the patch configuration and its referenced files.
COPY website/patches/ ./patches/
# No git and no repository in this image, so the prepare script (which points
# git at the repo's shared hooks) cannot run; drop it from this stage's copy.
RUN pnpm pkg delete scripts.prepare && pnpm install --frozen-lockfile

# 3. Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY website/ .
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so the
# Sentry feedback-widget DSN must be present here — a runtime Azure app setting
# is too late. Passed as a build-arg from the CI workflow. Safe to expose: the
# DSN is public (it ships in the client bundle regardless). Unset builds still
# succeed; the widget just stays hidden.
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN pnpm build

# 4. Production image
FROM base AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

CMD ["node", "server.js"]
