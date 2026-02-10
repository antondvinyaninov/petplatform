# Multi-stage Dockerfile for PetID
# Builds both backend (Go) and frontend (Next.js)

# Stage 1: Build Backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app/backend

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source
COPY backend/ ./

# Build backend
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/admin-api main.go

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Final Runtime Image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy backend binary
COPY --from=backend-builder /app/admin-api /app/backend/admin-api

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package*.json /app/frontend/
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/backend && ./admin-api &' >> /app/start.sh && \
    echo 'cd /app/frontend && npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports
EXPOSE 3000 9000

# Start both services
CMD ["/app/start.sh"]
