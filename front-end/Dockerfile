# ==============================================================================
# Etapa 1: build de Angular con Node 24
# ==============================================================================
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ==============================================================================
# Etapa 2: nginx sirve el SPA y reenvía /api al backend
# ==============================================================================
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/front-end/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
