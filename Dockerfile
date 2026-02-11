# Multi-stage build для Volunteer Cabinet (Frontend + Backend)

# ============================================
# Stage 1: Build Backend (Go)
# ============================================
FROM golang:1.23-alpine AS backend-builder

WORKDIR /app/backend

# Установка зависимостей для сборки
RUN apk add --no-cache git

# Копируем go.mod и go.sum для кеширования зависимостей
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Копируем исходный код
COPY backend/ ./

# Собираем бинарник
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o volunteer-cabinet .

# ============================================
# Stage 2: Build Frontend (Next.js)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Копируем package.json и package-lock.json
COPY frontend/package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код
COPY frontend/ ./

# Собираем Next.js приложение
RUN npm run build

# ============================================
# Stage 3: Runtime - Backend + Frontend в одном контейнере
# ============================================
FROM node:20-alpine

# Установка необходимых пакетов
RUN apk --no-cache add ca-certificates tzdata supervisor

WORKDIR /app

# Копируем backend бинарник
COPY --from=backend-builder /app/backend/volunteer-cabinet /app/backend/
COPY --from=backend-builder /app/backend/.env.example /app/backend/.env.example

# Копируем frontend
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/public /app/frontend/public

# Создаем конфигурацию supervisord
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo 'user=root' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:backend]' >> /etc/supervisord.conf && \
    echo 'command=/app/backend/volunteer-cabinet' >> /etc/supervisord.conf && \
    echo 'directory=/app/backend' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:frontend]' >> /etc/supervisord.conf && \
    echo 'command=npm start' >> /etc/supervisord.conf && \
    echo 'directory=/app/frontend' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisord.conf

# Открываем порты
EXPOSE 9000 4000

# Запускаем supervisord для управления обоими процессами
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
