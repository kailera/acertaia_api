# syntax=docker/dockerfile:1.7-labs

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npx prisma generate

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build   # gera dist/index.js a partir de src/index.ts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3141

# só o necessário para rodar
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package*.json ./
COPY --from=builder /app/dist ./dist

# usuário não-root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

# garanta que seu server usa PORT e "0.0.0.0"
# Express: app.listen(PORT,"0.0.0.0", ...)
# Fastify: fastify.listen({ port: PORT, host: "0.0.0.0" })
CMD ["npm","start"]
