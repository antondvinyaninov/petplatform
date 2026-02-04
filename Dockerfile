# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Invalidate cache on every build
ARG GIT_SHA
RUN echo "Building from commit: ${GIT_SHA}"
RUN echo "Build ID: d20c4c5-fix-auth-response"

# Accept NEXT_PUBLIC_API_URL as build argument
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy frontend package files (only package.json, not lock file)
COPY frontend/package.json ./

# Install dependencies using npm install (ignores corrupted lock file)
RUN npm install --production=false

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

# Install ca-certificates and nginx
RUN apk --no-cache add ca-certificates nginx

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/main ./backend/main

# Copy frontend build
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json ./frontend/
COPY --from=frontend-builder /app/frontend/next.config.ts ./frontend/

# Create nginx config
RUN mkdir -p /run/nginx && \
    echo 'server {' > /etc/nginx/http.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/http.d/default.conf && \
    echo '    server_name _;' >> /etc/nginx/http.d/default.conf && \
    echo '    client_max_body_size 100M;' >> /etc/nginx/http.d/default.conf && \
    echo '' >> /etc/nginx/http.d/default.conf && \
    echo '    # Backend API' >> /etc/nginx/http.d/default.conf && \
    echo '    location /api/ {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:8000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Connection "upgrade";' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_read_timeout 300s;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_connect_timeout 75s;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '' >> /etc/nginx/http.d/default.conf && \
    echo '    # WebSocket' >> /etc/nginx/http.d/default.conf && \
    echo '    location /ws {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:8000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Connection "upgrade";' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_read_timeout 86400;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '' >> /etc/nginx/http.d/default.conf && \
    echo '    # Frontend (Next.js standalone)' >> /etc/nginx/http.d/default.conf && \
    echo '    location / {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:3000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Connection "upgrade";' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '}' >> /etc/nginx/http.d/default.conf

# Install nodejs and npm for Next.js
RUN apk --no-cache add nodejs npm

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "Starting backend..."' >> /app/start.sh && \
    echo 'export PORT=8000' >> /app/start.sh && \
    echo 'export ENVIRONMENT=production' >> /app/start.sh && \
    echo 'cd /app/backend && ./main &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo 'echo "Backend started with PID $BACKEND_PID"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "Starting frontend..."' >> /app/start.sh && \
    echo 'cd /app/frontend && PORT=3000 npm start &' >> /app/start.sh && \
    echo 'FRONTEND_PID=$!' >> /app/start.sh && \
    echo 'echo "Frontend started with PID $FRONTEND_PID"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "Waiting for services to start..."' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "Starting nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose only port 80 (nginx)
EXPOSE 80

# Start all services
CMD ["/bin/sh", "/app/start.sh"]
