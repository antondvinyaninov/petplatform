# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies (no @pet/shared dependency)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache git

WORKDIR /app

# Copy go mod files
COPY backend/go.mod backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build backend
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 3: Final image
FROM alpine:latest

# Install ca-certificates and nodejs for Next.js
RUN apk --no-cache add ca-certificates nodejs npm

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/main ./

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/next.config.ts ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules

# Create startup script
# Backend на порту 8000, Frontend на порту 80
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'export PORT=8000' >> /app/start.sh && \
    echo 'cd /app && ./main &' >> /app/start.sh && \
    echo 'sleep 2' >> /app/start.sh && \
    echo 'cd /app/frontend && PORT=80 npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports
EXPOSE 80 8000

# Start both services
CMD ["/bin/sh", "/app/start.sh"]
