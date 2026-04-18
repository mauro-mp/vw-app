FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXTAUTH_SECRET="build-secret-placeholder-32-chars-min"
ENV NEXTAUTH_URL="http://localhost:3001"
ENV ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
ENV OAUTH_JWT_SECRET="build-oauth-secret-placeholder-32-chars"
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.prod.ts ./prisma.config.ts

EXPOSE 3000

CMD ["node", "server.js"]
