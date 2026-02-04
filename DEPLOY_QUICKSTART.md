# 🚀 Быстрый старт деплоя

## Easypanel - Backend

### 1. Создайте новый App

```
Name: petplatform-backend
Type: App
Source: GitHub
Repository: antondvinyaninov/petplatform
Branch: main
Build Path: /backend
```

### 2. Настройте Environment Variables

Скопируйте из `backend/.env.example` и заполните реальными значениями:

```env
PORT=8000
JWT_SECRET=<генерируйте сильный ключ>
ALLOWED_ORIGINS=https://your-frontend.vercel.app
ENVIRONMENT=production
AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=disable
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=<ваш ключ>
S3_SECRET_KEY=<ваш секрет>
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
```

### 3. Настройте Health Check

```
Path: /api/health
Port: 8000
```

### 4. Deploy!

Нажмите "Deploy" и ждите сборки.

## Vercel - Frontend

### 1. Импортируйте проект

```
Repository: antondvinyaninov/petplatform
Framework: Next.js
Root Directory: frontend
```

### 2. Environment Variables

```env
NEXT_PUBLIC_API_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
NEXT_PUBLIC_S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
NEXT_PUBLIC_DADATA_API_KEY=<ваш ключ>
```

### 3. Deploy!

Vercel автоматически соберет и задеплоит.

## Проверка

```bash
# Backend
curl https://your-backend.easypanel.host/api/health

# Frontend
open https://your-frontend.vercel.app
```

## Готово! 🎉

Подробная документация: [EASYPANEL_DEPLOY.md](./EASYPANEL_DEPLOY.md)
