# --- builder: compiles TypeScript and the native SQLite addon ---
FROM node:20-slim AS builder

# better-sqlite3 needs a toolchain to build its native addon from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Drop devDependencies now that tsc has run, so the runtime stage only
# copies what's actually needed (axios, cheerio, better-sqlite3's
# already-compiled native addon).
RUN npm prune --omit=dev

# --- runtime: same base image (avoids native addon ABI mismatches) ---
FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Persisted usage.sqlite lives here; mount a volume in docker-compose.yml
# so history survives across container restarts.
VOLUME ["/app/data"]

ENTRYPOINT ["node", "dist/src/infrastructure/adapter/in/cli/cli.js"]
CMD []
