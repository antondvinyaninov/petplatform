# Deployment Guide - Admin Panel

## Переменные окружения

### Development

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
NEXT_PUBLIC_ENVIRONMENT=development
```

**Frontend (.env):**
```env
ADMIN_API_URL=http://localhost:9000
```

**Backend (.env):**
```env
GATEWAY_URL=https://api.zooplatforma.ru
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:4000,http://localhost:3000,https://api.zooplatforma.ru
```

### Production

**Frontend (.env.production):**
```env
ADMIN_API_URL=http://admin-backend:9000
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
NEXT_PUBLIC_ENVIRONMENT=production
```

**Backend (.env.production):**
```env
GATEWAY_URL=https://api.zooplatforma.ru
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
ENVIRONMENT=production
CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru
```

## Архитектура

### Development
```
Browser → Frontend (localhost:4000)
           ↓ /api/admin/*
         Next.js API Routes
           ↓ ADMIN_API_URL
         Admin Backend (localhost:9000)
           ↓ GATEWAY_URL
         Gateway (api.zooplatforma.ru)
```

### Production
```
Browser → Frontend (admin.zooplatforma.ru)
           ↓ /api/admin/*
         Next.js API Routes
           ↓ ADMIN_API_URL (internal)
         Admin Backend (admin-backend:9000)
           ↓ GATEWAY_URL
         Gateway (api.zooplatforma.ru)
```

## Ключевые моменты

### ✅ Нет жестко прописанных URL

Все URL берутся из переменных окружения:

- `ADMIN_API_URL` - для Next.js API routes (server-side)
- `NEXT_PUBLIC_GATEWAY_URL` - для прямых запросов к Gateway (client-side)
- `NEXT_PUBLIC_API_URL` - для прямых запросов к Admin Backend (client-side, только dev)

### ✅ Относительные пути

Frontend делает запросы на `/api/admin/*`, которые проксируются через Next.js API routes.

### ✅ Безопасность

- Cookies автоматически передаются через API routes
- CORS настроен только для разрешенных origins
- JWT токены проверяются на каждом запросе

## Деплой

### 1. Backend

```bash
cd backend
go build -o admin-api
./admin-api
```

Или с Docker:
```dockerfile
FROM golang:1.23-alpine
WORKDIR /app
COPY . .
RUN go build -o admin-api
CMD ["./admin-api"]
```

### 2. Frontend

```bash
cd frontend
npm run build
npm start
```

Или с Docker:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  admin-backend:
    build: ./backend
    environment:
      - GATEWAY_URL=https://api.zooplatforma.ru
      - JWT_SECRET=${JWT_SECRET}
      - PORT=9000
      - ENVIRONMENT=production
      - CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru
    networks:
      - admin-network

  admin-frontend:
    build: ./frontend
    environment:
      - ADMIN_API_URL=http://admin-backend:9000
      - NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
      - NEXT_PUBLIC_ENVIRONMENT=production
    ports:
      - "4000:3000"
    depends_on:
      - admin-backend
    networks:
      - admin-network

networks:
  admin-network:
    driver: bridge
```

## Проверка

### Development

```bash
# Backend
curl http://localhost:9000/api/admin/health

# Frontend
curl http://localhost:4000
```

### Production

```bash
# Backend (internal)
curl http://admin-backend:9000/api/admin/health

# Frontend (external)
curl https://admin.zooplatforma.ru
```

## Troubleshooting

### Ошибка "Failed to fetch"

Проверьте:
1. `ADMIN_API_URL` правильно настроен
2. Admin Backend запущен и доступен
3. CORS настроен правильно

### Ошибка "Unauthorized"

Проверьте:
1. `JWT_SECRET` совпадает с Gateway
2. Cookie `auth_token` передается
3. Пользователь имеет роль `superadmin`

### Аватары не загружаются

Проверьте:
1. `NEXT_PUBLIC_GATEWAY_URL` правильно настроен
2. Gateway возвращает правильные URL для аватаров
