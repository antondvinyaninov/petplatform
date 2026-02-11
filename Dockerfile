# Multi-stage build для Volunteer Cabinet (Frontend + Backend)

# ============================================
# Stage 1: Build Frontend (Next.js)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Копируем package files
COPY frontend/package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходники frontend
COPY frontend/ ./

# Build аргументы для Next.js
ARG NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
ARG NEXT_PUBLIC_ENVIRONMENT=production

ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT

# Собираем Next.js приложение
RUN npm run build

# Удаляем devDependencies и устанавливаем только production
RUN npm prune --production

# ============================================
# Stage 2: Build Backend (Go)
# ============================================
FROM golang:1.23-alpine AS backend-builder

WORKDIR /app/backend

# Устанавливаем необходимые пакеты
RUN apk add --no-cache git

# Копируем go mod files
COPY backend/go.mod backend/go.sum ./

# Скачиваем зависимости
RUN go mod download

# Копируем исходники backend
COPY backend/ ./

# Собираем Go приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# ============================================
# Stage 3: Final Runtime Image
# ============================================
FROM node:20-alpine

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apk add --no-cache curl supervisor

# Создаем директории
RUN mkdir -p /app/frontend /app/backend /var/log/supervisor

# Копируем собранный frontend из builder
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package*.json /app/frontend/
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/frontend/next.config.ts /app/frontend/

# Копируем собранный backend из builder
COPY --from=backend-builder /app/backend/main /app/backend/main

# Создаем конфигурацию supervisor
RUN mkdir -p /etc/supervisor/conf.d && \
    echo '[supervisord]' > /etc/supervisor/conf.d/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'user=root' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'logfile=/var/log/supervisor/supervisord.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'pidfile=/var/run/supervisord.pid' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:backend]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=/app/backend/main' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app/backend' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/supervisor/backend.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/supervisor/backend.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'environment=GATEWAY_URL="%(ENV_GATEWAY_URL)s",JWT_SECRET="%(ENV_JWT_SECRET)s",PORT="%(ENV_PORT)s",ENVIRONMENT="%(ENV_ENVIRONMENT)s",CORS_ORIGINS="%(ENV_CORS_ORIGINS)s"' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo '[program:frontend]' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'command=/app/frontend/node_modules/.bin/next start -p 3000' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'directory=/app/frontend' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stderr_logfile=/var/log/supervisor/frontend.err.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'stdout_logfile=/var/log/supervisor/frontend.out.log' >> /etc/supervisor/conf.d/supervisord.conf && \
    echo 'environment=ADMIN_API_URL="%(ENV_ADMIN_API_URL)s",NEXT_PUBLIC_GATEWAY_URL="%(ENV_NEXT_PUBLIC_GATEWAY_URL)s",NEXT_PUBLIC_ENVIRONMENT="%(ENV_NEXT_PUBLIC_ENVIRONMENT)s"' >> /etc/supervisor/conf.d/supervisord.conf

# Expose порты
EXPOSE 3000 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Запускаем supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
