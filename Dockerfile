# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
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

# Stage 3: Final image with both frontend and backend
FROM node:20-alpine

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/main ./backend/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/next.config.ts ./frontend/

# Install only production dependencies for frontend
WORKDIR /app/frontend
RUN npm ci --only=production

# Create startup script
WORKDIR /app
RUN echo '#!/bin/sh' > start.sh && \
    echo 'cd /app/backend && ./main &' >> start.sh && \
    echo 'cd /app/frontend && npm start' >> start.sh && \
    chmod +x start.sh

# Expose ports
EXPOSE 80 3000

# Start both services
CMD ["/bin/sh", "/app/start.sh"]
