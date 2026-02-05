# API Gateway для ZooPlatforma

Единая точка входа для всех запросов с встроенной авторизацией и SSO.

## Архитектура

```
User/Browser
    ↓
Gateway (https://my-projects-gateway-zp.crv1ic.easypanel.host)
    ↓
    ├─ /api/auth/* → Gateway (встроенная авторизация)
    ├─ /api/* → Main Service → Backend (localhost:8000)
    ├─ /ws → Main Service → Backend WebSocket (localhost:8000)
    └─ /* → Main Service → Frontend (localhost:3000)
```

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и настройте переменные:
```bash
cp .env.example .env
```

2. Установите зависимости:
```bash
go mod download
```

3. Запустите gateway:
```bash
go run .
```

Gateway будет доступен на `http://localhost:80`

## Основные возможности

- ✅ Регистрация и авторизация пользователей
- ✅ JWT токены (срок жизни 7 дней)
- ✅ SSO для всех сервисов
- ✅ Проксирование запросов к Main Service
- ✅ WebSocket поддержка
- ✅ Frontend routing (проксирование всех маршрутов)
- ✅ CORS управление (единственное место)
- ✅ Rate limiting (100 req/sec)
- ✅ Health checks
- ✅ Логирование всех запросов
- ✅ PostgreSQL база данных

## API Endpoints

### Авторизация (обрабатывает Gateway)
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Текущий пользователь (всегда свежие данные из БД)
- `PUT /api/auth/profile` - Обновление профиля (name, last_name, bio, phone, location, настройки приватности)

### API (проксируется на Main Service)
- `/api/posts/*` → Main Backend
- `/api/profile/*` → Main Backend
- `/api/users/*` → Main Backend
- `/api/pets/*` → Main Backend
- `/api/organizations/*` → Main Backend
- `/api/comments/*` → Main Backend
- `/api/likes/*` → Main Backend
- `/api/favorites/*` → Main Backend
- `/api/friends/*` → Main Backend
- `/api/notifications/*` → Main Backend
- `/api/messages/*` → Main Backend
- `/api/announcements/*` → Main Backend
- `/api/polls/*` → Main Backend
- `/api/reports/*` → Main Backend
- `/api/admin/*` → Main Backend (требует роль admin)

### WebSocket
- `/ws` → Main Backend WebSocket (защищенный)

### Frontend
- `/*` → Main Service Frontend (все остальные маршруты)

### Служебные
- `GET /health` - Проверка здоровья всех сервисов

## Переменные окружения

```bash
# JWT Secret (ОБЯЗАТЕЛЬНО!)
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=

# Gateway
GATEWAY_PORT=80

# База данных
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable

# Main Service
MAIN_SERVICE_URL=http://my-projects-zooplatforma:80
```

## Docker

```bash
docker build -t gateway .
docker run -p 80:80 --env-file .env gateway
```

## Middleware Stack

Порядок middleware для защищенных API запросов:

```
Request
  ↓
1. LoggingMiddleware (логирование)
  ↓
2. CORSMiddleware (CORS заголовки)
  ↓
3. RateLimitMiddleware (защита от DDoS)
  ↓
4. AuthMiddleware (проверка JWT, добавление X-User-*)
  ↓
5. AdminMiddleware (только для /api/admin/*)
  ↓
6. ProxyHandler (проксирование на Main Service)
  ↓
Response (с CORS заголовками от Gateway)
```

## Что Gateway делает

✅ **Авторизация** - регистрация, логин, logout (встроенная)
✅ **Проверка JWT токенов** - валидация и парсинг
✅ **Добавляет заголовки** `X-User-*` для backend
✅ **Rate limiting** - 100 req/sec с одного IP
✅ **CORS** - единственное место для CORS заголовков
✅ **Логирование** - всех запросов
✅ **Health checks** - Main Service
✅ **WebSocket proxy** - с авторизацией
✅ **Frontend routing** - проксирование всех маршрутов

## Что Gateway НЕ делает

❌ НЕ хранит сессии (stateless, только JWT)
❌ НЕ изменяет данные запросов/ответов
❌ НЕ обрабатывает бизнес-логику
❌ НЕ дублирует CORS заголовки от backend

## Документация

См. `gateway.md` для подробной документации.
