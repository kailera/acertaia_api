# syntax=docker/dockerfile:1.7-labs

############################
# 1) Builder: só compilar TS
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Manifests e prisma para o build TS
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./
COPY prisma ./prisma

# Instala dev+prod para conseguir compilar
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
    else npm ci; fi

# Código fonte
COPY . .

# Compila TypeScript -> dist
RUN npm run build


################################
# 2) Produção: deps prod + prisma
################################
FROM node:22-alpine

RUN apk add --no-cache dumb-init

# Usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copia SÓ manifestos e prisma (necessário para instalar deps e gerar o client)
COPY package*.json ./
COPY yarn.lock* ./
COPY pnpm-lock.yaml* ./
COPY prisma ./prisma

# Instala SOMENTE dependências de produção (com cache do npm)
RUN --mount=type=cache,target=/root/.npm \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile --prod; \
    else npm ci --omit=dev; fi

# Gera o Prisma Client no stage final (sem precisar ter prisma no package.json prod)
# (o npx baixa o CLI efêmero e roda o generate)
RUN npx --yes prisma@latest generate

# Copia o build do stage builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Diretório persistente para arquivos
RUN mkdir -p /data && chown -R nodejs:nodejs /data
ENV FILES_DIR=/data

USER nodejs
EXPOSE 3141

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
