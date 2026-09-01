# --- ESTÁGIO 1: Build da Aplicação ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copia dependências do monorepo
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Instala dependências
RUN npm install

# Copia código fonte da API
COPY apps/api ./apps/api

# Compila TypeScript para JavaScript
WORKDIR /app/apps/api
RUN npm run build

# --- ESTÁGIO 2: Runner Leve de Produção ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Copia dependências apenas de produção
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --omit=dev

# Copia arquivos compilados
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src ./apps/api/src

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/server.js"]
