# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ .
ENV DATABASE_URL="postgresql://user:password@localhost:5432/placeholder?schema=public"
RUN npx prisma generate
RUN npm run build

# ---- Stage 2: production runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 5000
CMD ["node", "dist/index.js"]