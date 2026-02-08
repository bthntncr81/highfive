# HighFive Suite - POS Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY apps/pos ./apps/pos
COPY packages ./packages

# Build
RUN npx nx build pos --configuration=production

# Production image with nginx
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/dist/apps/pos /usr/share/nginx/html

# Copy nginx config
COPY apps/pos/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

