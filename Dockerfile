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
# Verify LFS files are actual content, not pointers
RUN ls -la data/ && \
    echo "Checking if JSON file is LFS pointer or actual content:" && \
    head -n 1 data/ppb2026_unique_mandates_with_metadata.json && \
    if head -n 1 data/ppb2026_unique_mandates_with_metadata.json | grep -q "version https://git-lfs.github.com"; then \
      echo "ERROR: LFS file not resolved - contains pointer instead of actual data" && exit 1; \
    else \
      echo "SUCCESS: LFS file resolved - contains actual JSON data"; \
    fi
# Create a public directory if it doesn't exist
RUN mkdir -p public
RUN npm run build

# 4. Production image
FROM base AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy the data directory explicitly
COPY --from=builder /app/data ./data

CMD ["node", "server.js"] 