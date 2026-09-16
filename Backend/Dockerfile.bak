# --- build stage: install all deps, generate Prisma client, compile TS ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Strip devDependencies down to production size, keeping the generated
# @prisma/client output (npm prune doesn't touch already-installed files).
RUN npm prune --omit=dev

# --- runtime stage: minimal image, non-root user ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma's engine-selection at startup shells out to `openssl version` to
# pick the right query engine binary; without the CLI present it can't
# detect OpenSSL 3 on Alpine and silently falls back to the wrong (1.1.x)
# engine, which then fails to load libssl.so.3.
RUN apk add --no-cache openssl

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# winston's DailyRotateFile transport (src/utils/logger.ts) writes to
# LOG_DIR (default ./logs) at runtime — needs to exist and be writable
# by the non-root user before we drop root.
RUN mkdir -p logs && chown -R app:app logs

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/api/health/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
