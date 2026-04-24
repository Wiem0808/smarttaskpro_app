# ══════════════════════════════════════════
# SmartTask Pro — Frontend (Dockerfile for Railway)
# ══════════════════════════════════════════
# Stage 1: Build the React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (Railway-compatible)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf.template
ENV PORT=80
EXPOSE 80
# Only substitute $PORT, leave nginx variables ($host, $uri, etc.) untouched
CMD envsubst '$$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
