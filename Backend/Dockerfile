# --- build stage: install all deps, generate Prisma client, compile TS ---
FROM node:20-alpine AS build
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
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
