# 🚀 Руководство по деплою PetPlatform

## Быстрый старт

### Production URLs
- **Frontend:** https://my-projects-zooplatforma.crv1ic.easypanel.host
- **Gateway:** https://my-projects-gateway-zp.crv1ic.easypanel.host
- **Backend:** http://my-projects-backend-zp.crv1ic.easypanel.host:8000 (внутренний)

### Архитектура
```
Frontend (Next.js) → Gateway (Go) → Backend (Go) → PostgreSQL
                                  ↓
                                 S3 Storage
```

---

## 📦 Деплой через Git Push

Все сервисы автоматически деплоятся при push в main:

```bash
# 1. Внеси изменения
git add .
git commit -m "Your changes"

# 2. Push в main
git push origin main

# 3. Easypanel автоматически:
#    - Соберет Docker образы
#    - Задеплоит все сервисы
#    - Применит новые переменные окружения
```

---

## 🔧 Локальная разработка

### Backend
```bash
cd backend
go run main.go
# Запустится на http://localhost:8000
```

### Frontend
```bash
cd frontend
npm run dev
# Запустится на http://localhost:3000
```

### Gateway (опционально для локальной разработки)
```bash
cd gateway
go run main.go
# Запустится на http://localhost:7200
```

**Примечание:** Для локальной разработки Gateway не обязателен - Frontend может работать напрямую с Backend.

---

## 🔐 Переменные окружения

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key

# S3 Storage
S3_ENDPOINT=https://s3.firstvds.ru
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=ru-1

# Environment
ENVIRONMENT=production
PORT=8000
```

### Frontend (.env.production)
```bash
NEXT_PUBLIC_API_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
```

### Gateway (.env)
```bash
# Services
MAIN_SERVICE_URL=http://my-projects-backend-zp.crv1ic.easypanel.host:8000

# Database (для авторизации)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key

# CORS
ALLOWED_ORIGINS=https://my-projects-zooplatforma.crv1ic.easypanel.host,http://localhost:3000

# Environment
ENVIRONMENT=production
PORT=7200
```

---

## ✅ Проверка деплоя

### 1. Проверка Gateway роутов
```bash
./test-gateway-routes.sh "YOUR_AUTH_TOKEN"
```

### 2. Проверка здоровья сервисов
```bash
# Gateway
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/ping

# Backend через Gateway
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/health
```

### 3. Проверка критичных endpoints
```bash
# Опросы
curl "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/polls/post/12" \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Мессенджер
curl "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/chats" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

---

## 🐛 Troubleshooting

### Frontend не подключается к API
1. Проверь `NEXT_PUBLIC_API_URL` в `.env.production`
2. Проверь что Gateway доступен: `curl https://my-projects-gateway-zp.crv1ic.easypanel.host/ping`
3. Проверь CORS настройки в Gateway

### 401 Unauthorized ошибки
1. Проверь что `JWT_SECRET` одинаковый в Gateway и Backend
2. Проверь что cookie `auth_token` передается
3. Проверь логи Gateway

### 404 Not Found на API endpoints
1. Проверь что роут зарегистрирован в Gateway (`docs/GATEWAY_ROUTES_COMPLETE.md`)
2. Проверь что Backend запущен и доступен
3. Проверь логи Gateway

### S3 ошибки загрузки файлов
1. Проверь S3 credentials в Backend `.env`
2. Проверь что bucket существует
3. Проверь права доступа к bucket

---

## 📚 Дополнительная документация

- `docs/GATEWAY_ROUTES_COMPLETE.md` - Полный список Gateway роутов
- `docs/HOW_TO_TEST_GATEWAY.md` - Как тестировать Gateway
- `ARCHITECTURE.md` - Архитектура проекта
- `README_API.md` - API документация

---

**Последнее обновление:** 05.02.2026
