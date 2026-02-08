# HighFive Suite - Kitchen Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY apps/kitchen ./apps/kitchen
COPY packages ./packages

# Build
RUN npx nx build kitchen --configuration=production

# Production image with nginx
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/dist/apps/kitchen /usr/share/nginx/html

# Copy nginx config
COPY apps/kitchen/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

