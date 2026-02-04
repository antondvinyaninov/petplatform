# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Устанавливаем зависимости для сборки
RUN apk add --no-cache gcc musl-dev

# Копируем go.mod и go.sum
COPY go.mod go.sum ./
RUN go mod download

# Копируем исходный код
COPY . .

# Собираем приложение
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o gateway .

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Устанавливаем runtime зависимости
RUN apk --no-cache add ca-certificates

# Копируем скомпилированное приложение
COPY --from=builder /app/gateway .

# Открываем порт
EXPOSE 80

# Запускаем приложение
CMD ["./gateway"]
