# ══════════════════════════════════════════
# SmartTask Pro — Frontend (Dockerfile for Railway)
# ══════════════════════════════════════════
# Stage 1: Build the React app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_URL is baked at build time — Railway passes env vars as build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Serve with Nginx (Railway-compatible)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /tmp/nginx.template

# Remove default template dir to prevent nginx from running envsubst on all vars
RUN rm -rf /etc/nginx/templates && rm -f /etc/nginx/conf.d/default.conf

ENV PORT=80
EXPOSE 80

# Only substitute $PORT, leave nginx variables ($host, $uri, etc.) untouched
CMD /bin/sh -c "envsubst '\$PORT' < /tmp/nginx.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
