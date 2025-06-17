# Dockerfile for Next.js

# 1. Base image
FROM node:20-alpine AS base
WORKDIR /app

# 2. Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# 3. Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Create a public directory if it doesn't exist
RUN mkdir -p public
RUN npm run build

# 4. Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permissions for the files.
# This is important to prevent permission issues when running the container as a non-root user.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"] 