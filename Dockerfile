# Multi-stage build для оптимизации размера образа

# Stage 1: Build Backend
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
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o owner-cabinet .

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Копируем package.json и package-lock.json
COPY frontend/package*.json ./
RUN npm ci --only=production

# Копируем исходный код
COPY frontend/ ./

# Собираем Next.js приложение
RUN npm run build

# Stage 3: Runtime Backend
FROM alpine:latest AS backend-runtime

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Копируем бинарник из builder
COPY --from=backend-builder /app/backend/owner-cabinet .
COPY --from=backend-builder /app/backend/.env.example .env.example

EXPOSE 9000

CMD ["./owner-cabinet"]

# Stage 4: Runtime Frontend
FROM node:20-alpine AS frontend-runtime

WORKDIR /app

# Копируем собранное приложение
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules
COPY --from=frontend-builder /app/frontend/package.json ./package.json
COPY --from=frontend-builder /app/frontend/public ./public

EXPOSE 4000

CMD ["npm", "start"]
