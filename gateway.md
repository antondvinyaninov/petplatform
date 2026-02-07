# 🚀 API Gateway - Документация

> **Версия:** 1.4.0  
> **Дата:** 04.02.2026  
> **Статус:** Production Ready

---

## 📖 Что это?

API Gateway - единая точка входа для всех запросов к микросервисам ZooPlatforma.

**Основные функции:**
- ✅ Авторизация (регистрация, логин, JWT)
- ✅ Проксирование запросов к backend сервисам
- ✅ Проксирование frontend (Next.js)
- ✅ CORS управление
- ✅ Rate limiting (защита от DDoS)
- ✅ Централизованное логирование
- ✅ Health checks всех сервисов

**Архитектура:**
```
User → Gateway (https://my-projects-gateway-zp.crv1ic.easypanel.host)
         ↓
         ├─ /api/auth/* → Gateway (встроенная авторизация)
         ├─ /api/posts → Main Backend
         ├─ /api/petbase/* → PetBase Backend
         ├─ /api/clinic/* → Clinic Backend
         ├─ /api/owner/* → Owner Backend
         ├─ /api/shelter/* → Shelter Backend
         ├─ /api/volunteer/* → Volunteer Backend
         ├─ /api/admin/* → Admin Backend
         ├─ /uploads/* → Статические файлы
         └─ /* → Main Service → Nginx → Frontend (Next.js)
```

---

## 🔗 Адреса и подключения

### Production URLs

**Gateway (главный домен):**
```
https://my-projects-gateway-zp.crv1ic.easypanel.host
```

**Frontend приложения:**
```
Main:      https://my-projects-zooplatforma.crv1ic.easypanel.host
Admin:     https://my-projects-admin.crv1ic.easypanel.host
PetBase:   https://my-projects-petbase.crv1ic.easypanel.host
Shelter:   https://my-projects-shelter.crv1ic.easypanel.host
Owner:     https://my-projects-owner.crv1ic.easypanel.host
Volunteer: https://my-projects-volunteer.crv1ic.easypanel.host
Clinic:    https://my-projects-clinic.crv1ic.easypanel.host
```

**Backend сервисы (внутри Docker сети):**
```
Main:      http://my-projects-zooplatforma:80
PetBase:   http://petbase-backend:8100
Clinic:    http://clinic-backend:8600
Owner:     http://owner-backend:8400
Shelter:   http://shelter-backend:8200
Volunteer: http://volunteer-backend:8500
Admin:     http://admin-backend:9000
```

### База данных PostgreSQL

**Внутри Docker сети:**
```bash
Host: zooplatforma-db
Port: 5432
Database: zp-db
User: zp
Password: lmLG7k2ed4vas19
```

**Внешнее подключение:**
```bash
Host: 88.218.121.213
Port: 5432
Database: zp-db
User: zp
Password: lmLG7k2ed4vas19

# Подключение через psql:
psql -h 88.218.121.213 -p 5432 -U zp -d zp-db
```

### Easypanel

```
URL: http://88.218.121.213:3000
Проект: my-projects
Сервис: Gateway
```

---

## ⚙️ Настройка

### Переменные окружения (.env)

```bash
# JWT Secret (ОБЯЗАТЕЛЬНО!)
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=

# Gateway
GATEWAY_PORT=80

# Environment
ENVIRONMENT=production

# PostgreSQL Database
DATABASE_HOST=zooplatforma-db
DATABASE_PORT=5432
DATABASE_USER=zp
DATABASE_PASSWORD=lmLG7k2ed4vas19
DATABASE_NAME=zp-db

# Backend Services (внутри Docker сети)
MAIN_SERVICE_URL=http://my-projects-zooplatforma:80
PETBASE_SERVICE_URL=http://petbase-backend:8100
CLINIC_SERVICE_URL=http://clinic-backend:8600
OWNER_SERVICE_URL=http://owner-backend:8400
SHELTER_SERVICE_URL=http://shelter-backend:8200
VOLUNTEER_SERVICE_URL=http://volunteer-backend:8500
ADMIN_SERVICE_URL=http://admin-backend:9000

# Uploads
UPLOAD_PATH=/app/uploads
```

---

## 🏃 Запуск

### Локально (development)

```bash
# 1. Установить зависимости
go mod download

# 2. Создать .env файл
cp .env.example .env
# Отредактировать .env для локальной разработки

# 3. Запустить
go run .

# 4. Проверить
curl http://localhost/health
```

### Production (Easypanel)

```bash
# 1. Закоммитить изменения
git add .
git commit -m "Update Gateway"
git push origin gateway

# 2. Easypanel автоматически задеплоит
# 3. Проверить логи в Easypanel
```

---

## ✅ Проверка работы

```bash
# Health check
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health

# Регистрация
curl -X POST https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test","last_name":"User"}'

# Логин
curl -X POST https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# API запрос
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/posts

# Frontend (должен вернуть HTML)
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/
```

---

## 📁 Структура файлов

```
gateway/
├── main.go           # Роутинг, запуск сервера
├── auth.go           # JWT авторизация, подключение к БД
├── auth_handlers.go  # Регистрация, логин, logout, /me
├── middleware.go     # CORS, rate limiting, логирование
├── proxy.go          # Проксирование к backend сервисам
├── services.go       # Конфигурация backend сервисов
├── go.mod            # Зависимости Go
├── go.sum            # Checksums зависимостей
├── Dockerfile        # Docker образ
├── gateway.md        # Документация (этот файл)
├── DEPLOY.md         # Инструкция по деплою
└── .env.example      # Пример переменных окружения
```

---

## 👨‍💻 Инструкция для работы с AI

### Контекст проекта

```
Проект: ZooPlatforma
Архитектура: Микросервисы + API Gateway
Технологии: Go 1.25, PostgreSQL, Next.js
Деплой: Easypanel (Docker)
Репозиторий: github.com/antondvinyaninov/zooplatforma
Ветка: gateway
```

### Важные правила

✅ **ВСЕГДА:**
- Работать в ветке `gateway`
- Тестировать локально: `go build -o gateway-test .`
- Коммитить с понятным сообщением
- Пушить: `git push origin gateway`
- Проверять деплой в Easypanel

❌ **НИКОГДА:**
- Не менять порядок middleware (CORS → Logging → RateLimit)
- Не использовать `CGO_ENABLED=0` (нужен для sqlite3 в dev)
- Не забывать про CORS для новых доменов
- Не удалять Auth Service из структуры (совместимость)

### Типичные задачи

**1. Добавить новый backend сервис:**

```go
// services.go
NewService: &Service{
    Name: "New Service",
    URL: getEnv("NEW_SERVICE_URL", "http://localhost:9100"),
    Timeout: 10,
}

// main.go
newRouter := r.PathPrefix("/api/new").Subrouter()
newRouter.Use(AuthMiddleware) // если нужна авторизация
newRouter.PathPrefix("").HandlerFunc(ProxyHandler(services.NewService))

// .env.example
NEW_SERVICE_URL=http://new-service:9100
```

**2. Добавить домен в CORS:**

```go
// middleware.go
"https://new-frontend.crv1ic.easypanel.host": true,
```

**3. Изменить rate limiting:**

```go
// middleware.go
rate: rate.Limit(200), // запросов в секунду
burst: 400,            // максимальный burst
```

### Команды

```bash
# Переключиться на ветку
git checkout gateway

# Локальная сборка
go build -o gateway-test .

# Запустить локально
./gateway-test

# Закоммитить
git add .
git commit -m "Описание изменений"
git push origin gateway
```

### Проверка после деплоя

```bash
# Health check
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health

# API
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/posts

# Frontend
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/
```

### Частые проблемы

| Проблема | Решение |
|----------|---------|
| CORS ошибка | Добавить домен в `middleware.go` |
| 502 Bad Gateway | Проверить что backend запущен |
| 401 Unauthorized | Проверить `JWT_SECRET` |
| Деплой не работает | Проверить логи в Easypanel |
| БД недоступна | Проверить `DATABASE_HOST` |

### Пример хорошего запроса к AI

```
"Добавь новый backend сервис 'notifications' на порт 9200.
Маршрут: /api/notifications/*
Требуется авторизация.
Обнови services.go, main.go и .env.example"
```

---

## 🔧 Как это работает

### 1. Авторизация (JWT)

```
User → POST /api/auth/login
     → Gateway проверяет email/password в БД
     → Создает JWT токен (срок: 7 дней)
     → Устанавливает cookie
     → Возвращает токен и user
```

### 2. Защищенный запрос

```
User → GET /api/profile (Authorization: Bearer TOKEN)
     → Gateway → AuthMiddleware
     → Парсит JWT, проверяет подпись и срок
     → Добавляет заголовки: X-User-ID, X-User-Email, X-User-Role
     → Проксирует на Main Backend
     → Backend читает X-User-ID (НЕ проверяет JWT!)
```

### 3. Frontend проксирование

```
User → GET / (главная страница)
     → Gateway проксирует на Main Service (port 80)
     → Nginx внутри Main Service:
        - /api/* → Backend (localhost:8000)
        - /* → Frontend (localhost:3000)
     → Next.js отдает HTML
```

### 4. Middleware цепочка

```
Request → CORSMiddleware (проверка Origin, добавление заголовков)
       → LoggingMiddleware (логирование запроса)
       → RateLimitMiddleware (проверка лимита с IP)
       → Router (определение маршрута)
       → AuthMiddleware (если нужна авторизация)
       → ProxyHandler (проксирование на backend)
```

---

## 📊 Мониторинг

### Health Check

```bash
GET /health

Response:
{
  "success": true,
  "status": "healthy",
  "gateway": "API Gateway",
  "version": "1.0.0",
  "services": {
    "main_backend": { "url": "...", "healthy": true },
    "petbase_backend": { "url": "...", "healthy": true },
    ...
  }
}
```

### Логи

Gateway логирует все запросы:

```
🚀 API Gateway started on port 80
📋 GET /api/posts 200 15ms 127.0.0.1
✅ Authenticated: user_id=1, email=user@example.com, role=user
✅ Proxied to Main Backend: GET /api/posts → 200 (took 15ms)
⚠️ Rate limit exceeded: POST /api/posts from 192.168.1.1
```

---

## 🔐 Безопасность

- ✅ JWT токены (срок: 7 дней)
- ✅ Пароли хешируются (bcrypt)
- ✅ Rate limiting (100 req/sec с IP)
- ✅ CORS настроен для всех frontend
- ✅ Backend сервисы доверяют только Gateway
- ✅ PostgreSQL внутри Docker сети

---

## 📝 История версий

| Версия | Дата | Изменения |
|--------|------|-----------|
| 1.4.0 | 04.02.2026 | Добавлено проксирование frontend |
| 1.3.0 | 03.02.2026 | Исправлен порядок middleware |
| 1.2.2 | 03.02.2026 | Улучшен CORS |
| 1.2.1 | 03.02.2026 | Исправлен роутинг |
| 1.2.0 | 03.02.2026 | Gateway управляет CORS |
| 1.1.0 | 03.02.2026 | Убран Auth Service |
| 1.0.0 | - | Первая версия |

---

## 📞 Поддержка

**При проблемах:**
1. Проверить логи в Easypanel
2. Проверить `/health`
3. Проверить переменные окружения
4. Проверить что backend сервисы запущены
5. Проверить подключение к БД

**Полезные ссылки:**
- GitHub: https://github.com/antondvinyaninov/zooplatforma
- Easypanel: http://88.218.121.213:3000
- Gateway: https://my-projects-gateway-zp.crv1ic.easypanel.host

---

**Версия документации:** 1.4.0  
**Последнее обновление:** 04.02.2026
