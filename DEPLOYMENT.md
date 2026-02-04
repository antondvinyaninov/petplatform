# 🚀 Инструкция по деплою Main Project

> **Дата:** 03.02.2026  
> **Версия:** 1.0.0

---

## 📋 Архитектура

### Development (локальная разработка)

```
Frontend (localhost:3000)
    ↓
Backend (localhost:8000)
    ↓ DevAuthMiddleware (проверяет JWT локально)
    ↓
PostgreSQL (88.218.121.213:5432)
```

**Особенности:**
- Frontend обращается напрямую к Backend
- Backend проверяет JWT токен самостоятельно через `DevAuthMiddleware`
- CORS настроен для `localhost:3000`
- Токен передается через `Authorization: Bearer TOKEN`

### Production (после деплоя)

```
Frontend (Easypanel)
    ↓ (относительные пути /api/...)
Gateway (Easypanel)
    ↓ (проверяет JWT, добавляет X-User-* заголовки)
Backend (Easypanel)
    ↓ (читает X-User-ID из заголовков)
PostgreSQL (88.218.121.213:5432)
```

**Особенности:**
- Frontend использует относительные пути
- Gateway проверяет JWT и добавляет заголовки
- Backend читает `X-User-ID` из заголовков (не проверяет JWT)
- CORS управляется Gateway

---

## 🔧 Подготовка к деплою

### 1. Frontend

#### Файл: `frontend/.env.production`

```env
# API Configuration для Production
# Используем относительные пути - Next.js проксирует через rewrites

# Backend API URL
# Production: пустая строка = относительные пути (/api/...)
NEXT_PUBLIC_API_URL=

# Auth Service URL
# Production: пустая строка
NEXT_PUBLIC_AUTH_URL=

# Base URL для медиа файлов
# Production: используем Gateway или CDN
NEXT_PUBLIC_MEDIA_URL=

# S3 CDN URL
NEXT_PUBLIC_S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
```

#### Проверка перед деплоем:

```bash
cd frontend

# Проверь что .env.production существует
cat .env.production

# Проверь что NEXT_PUBLIC_API_URL пустой
grep NEXT_PUBLIC_API_URL .env.production
# Должно быть: NEXT_PUBLIC_API_URL=

# Собери production build
npm run build

# Проверь что сборка прошла успешно
ls -la .next/
```

---

### 2. Backend

#### Файл: `backend/.env` (для production)

```env
# Server
PORT=8000
ENVIRONMENT=production

# JWT Secret (ДОЛЖЕН совпадать с Gateway!)
JWT_SECRET=your-production-secret-key

# Database
DATABASE_URL=postgres://user:pass@88.218.121.213:5432/zp-db?sslmode=disable

# S3 Storage
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru

# Auth Service (не используется в production, Gateway обрабатывает)
AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
```

#### Проверка перед деплоем:

```bash
cd backend

# Проверь что JWT_SECRET совпадает с Gateway
echo $JWT_SECRET

# Проверь что ENVIRONMENT=production
grep ENVIRONMENT .env

# Собери бинарник
go build -o main

# Проверь что сборка прошла успешно
./main --version 2>/dev/null || echo "Build OK"
```

---

### 3. Gateway

#### Проверка Gateway:

```bash
# Запусти скрипт проверки
./check-gateway.sh
```

Должны пройти все проверки:
- ✅ Gateway доступен
- ✅ CORS preflight работает
- ✅ CORS для GET работает
- ✅ Авторизация работает

#### Настройки Gateway (должны быть):

**Файл:** `gateway/.env`

```env
JWT_SECRET=your-production-secret-key  # ДОЛЖЕН совпадать с Backend!
GATEWAY_PORT=80
ENVIRONMENT=production

# Database
DATABASE_URL=postgres://user:pass@88.218.121.213:5432/zp-db?sslmode=disable

# Backend Services
MAIN_SERVICE_URL=http://your-backend-on-easypanel:8000
PETBASE_SERVICE_URL=http://localhost:8100
CLINIC_SERVICE_URL=http://localhost:8600
# ... другие сервисы
```

**CORS настройки** (в `gateway/middleware/cors.go`):

```go
allowedOrigins := map[string]bool{
    "http://localhost:3000": true,  // Development
    "https://your-production-frontend.com": true,  // Production Frontend URL
}
```

---

## 🚀 Процесс деплоя

### Шаг 1: Подготовка

```bash
# 1. Убедись что все изменения закоммичены
git status

# 2. Создай production branch (опционально)
git checkout -b production

# 3. Обнови .env файлы для production
```

### Шаг 2: Деплой Backend

```bash
# На Easypanel:
# 1. Создай новый сервис "Main Backend"
# 2. Подключи Git репозиторий
# 3. Установи переменные окружения из backend/.env
# 4. Build command: cd backend && go build -o main
# 5. Start command: ./backend/main
# 6. Port: 8000
```

### Шаг 3: Обновление Gateway

```bash
# На Easypanel:
# 1. Открой Gateway сервис
# 2. Обнови переменную MAIN_SERVICE_URL:
#    MAIN_SERVICE_URL=http://main-backend:8000
# 3. Перезапусти Gateway
```

### Шаг 4: Деплой Frontend

```bash
# На Easypanel:
# 1. Создай новый сервис "Main Frontend"
# 2. Подключи Git репозиторий
# 3. Установи переменные окружения из frontend/.env.production
# 4. Build command: cd frontend && npm run build
# 5. Start command: npm start
# 6. Port: 3000
```

### Шаг 5: Настройка Nginx/Proxy

```nginx
# Настрой reverse proxy чтобы Frontend был доступен через Gateway
# Или используй Next.js rewrites в next.config.ts
```

---

## ✅ Проверка после деплоя

### 1. Проверь Gateway

```bash
curl https://your-gateway.com/health
# Должен вернуть: {"success":true, "status":"healthy"}
```

### 2. Проверь Backend через Gateway

```bash
curl https://your-gateway.com/api/health
# Должен вернуть: {"status":"ok"}
```

### 3. Проверь авторизацию

```bash
# Зарегистрируй тестового пользователя
curl -X POST https://your-gateway.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test"}'

# Войди
curl -X POST https://your-gateway.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  -c cookies.txt

# Проверь защищенный endpoint
curl https://your-gateway.com/api/profile \
  -b cookies.txt
```

### 4. Проверь Frontend

```bash
# Открой в браузере
open https://your-frontend.com

# Проверь что:
# - Страница загружается
# - Можно войти
# - Нет ошибок в консоли
# - API запросы работают
```

---

## 🔍 Отладка проблем

### Проблема: Frontend не может подключиться к Gateway

**Симптом:** CORS ошибки в консоли браузера

**Решение:**
1. Проверь что production Frontend URL добавлен в `allowedOrigins` в Gateway
2. Перезапусти Gateway
3. Очисти кэш браузера

### Проблема: Backend возвращает 401

**Симптом:** Все запросы возвращают Unauthorized

**Решение:**
1. Проверь что `JWT_SECRET` одинаковый в Gateway и Backend
2. Проверь что Gateway добавляет заголовки `X-User-ID`
3. Проверь логи Gateway - видит ли он токен

### Проблема: Backend не может подключиться к PostgreSQL

**Симптом:** Database connection errors

**Решение:**
1. Проверь `DATABASE_URL` в Backend `.env`
2. Проверь что PostgreSQL доступен с Easypanel
3. Проверь firewall правила

---

## 📝 Checklist перед деплоем

### Frontend:
- [ ] `.env.production` создан
- [ ] `NEXT_PUBLIC_API_URL=` (пустая строка)
- [ ] `npm run build` проходит успешно
- [ ] Нет ошибок в консоли при сборке

### Backend:
- [ ] `.env` настроен для production
- [ ] `JWT_SECRET` совпадает с Gateway
- [ ] `ENVIRONMENT=production`
- [ ] `DATABASE_URL` указывает на PostgreSQL
- [ ] `go build` проходит успешно

### Gateway:
- [ ] `JWT_SECRET` совпадает с Backend
- [ ] `MAIN_SERVICE_URL` указывает на Backend на Easypanel
- [ ] Production Frontend URL добавлен в `allowedOrigins`
- [ ] `./check-gateway.sh` проходит все проверки

### Database:
- [ ] PostgreSQL доступен с Easypanel
- [ ] Все таблицы созданы
- [ ] Миграции применены

---

## 🎯 Важные моменты

### 1. JWT_SECRET

**КРИТИЧНО:** `JWT_SECRET` должен быть одинаковым в Gateway и Backend!

```bash
# Проверь Gateway
echo $JWT_SECRET  # в Gateway

# Проверь Backend
cat backend/.env | grep JWT_SECRET

# Должны совпадать!
```

### 2. CORS

**Development:**
- Backend устанавливает CORS для `localhost:3000`
- Gateway не используется

**Production:**
- Gateway устанавливает CORS для production Frontend
- Backend НЕ устанавливает CORS (Gateway управляет)

### 3. Авторизация

**Development:**
- Backend проверяет JWT через `DevAuthMiddleware`
- Токен из `Authorization: Bearer TOKEN` или cookie

**Production:**
- Gateway проверяет JWT
- Gateway добавляет `X-User-ID`, `X-User-Email`, `X-User-Role`
- Backend читает заголовки (не проверяет JWT)

### 4. Относительные пути

**Development:**
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Frontend делает запросы к `http://localhost:8000/api/...`

**Production:**
- `NEXT_PUBLIC_API_URL=` (пустая строка)
- Frontend делает запросы к `/api/...` (относительные пути)
- Next.js или Nginx проксирует к Gateway

---

## 🔄 Переключение между Development и Production

### Переключение на Development:

```bash
# Frontend
cd frontend
cp .env.local .env  # Используй .env.local

# Backend
cd backend
# Убедись что CORS включен в main.go

# Запусти
./run
```

### Переключение на Production:

```bash
# Frontend
cd frontend
cp .env.production .env  # Используй .env.production
npm run build

# Backend
cd backend
# CORS будет отключен автоматически (Gateway управляет)
go build -o main

# Деплой на Easypanel
```

---

## 📚 Дополнительные файлы

- `STARTUP.md` - инструкция по запуску для разработки
- `gateway.md` - документация Gateway
- `check-gateway.sh` - скрипт проверки Gateway
- `README_API.md` - документация API

---

**Дата обновления:** 03.02.2026
