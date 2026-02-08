# HighFive Suite - API Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY apps/api ./apps/api
COPY packages ./packages

# Build
RUN npx nx build api --configuration=production

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "main.js"]

