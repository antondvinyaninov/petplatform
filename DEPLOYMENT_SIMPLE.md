# Простой Deployment - Admin Panel

## 🎯 Что нужно для деплоя

### Обязательно:
1. ✅ **Gateway доступен** - https://api.zooplatforma.ru
2. ✅ **JWT_SECRET** - должен совпадать с Gateway
3. ✅ **Домены настроены** (для production)

### НЕ нужно:
- ❌ Прямое подключение к базе данных (всё через Gateway!)
- ❌ Auth Service (его нет, всё через Gateway)
- ❌ Дополнительные сервисы

## 📦 Что деплоим

```
Admin Backend (Go) → Gateway → Main Backend → Database
Admin Frontend (Next.js) → Admin Backend
```

**Важно:** Admin Backend НЕ подключается к БД напрямую, только через Gateway!

---

## 🚀 Deployment на Easypanel

### Шаг 1: Deploy Backend

1. Создайте новый App: **admin-backend**
2. Выберите "Build from Source"
3. Настройте:
   - **Repository:** ваш git репозиторий
   - **Branch:** main
   - **Build Path:** /backend
   - **Port:** 9000
   - **Build Command:** `go build -o admin-api`
   - **Start Command:** `./admin-api`

4. **Environment Variables:**
   ```
   GATEWAY_URL=https://api.zooplatforma.ru
   JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
   PORT=9000
   ENVIRONMENT=production
   CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru,https://zooplatforma.ru
   ```

5. **Domain:** admin-api.zooplatforma.ru

6. **Deploy!**

### Шаг 2: Deploy Frontend

1. Создайте новый App: **admin-frontend**
2. Выберите "Build from Source"
3. Настройте:
   - **Repository:** ваш git репозиторий
   - **Branch:** main
   - **Build Path:** /frontend
   - **Port:** 4000
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`

4. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=
   NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
   NEXT_PUBLIC_ENVIRONMENT=production
   NODE_ENV=production
   ```

5. **Domain:** admin.zooplatforma.ru

6. **Deploy!**

### Шаг 3: Проверка

```bash
# Backend
curl https://admin-api.zooplatforma.ru/api/admin/health
# Ответ: {"status": "ok", "service": "admin-api"}

# Frontend
curl -I https://admin.zooplatforma.ru
# Ответ: HTTP/2 200

# Gateway
curl https://api.zooplatforma.ru/health
# Ответ: {"status":"healthy","success":true,...}
```

---

## 🐳 Deployment с Docker

### docker-compose.yml

```yaml
version: '3.8'

services:
  admin-backend:
    build:
      context: ./backend
    ports:
      - "9000:9000"
    environment:
      - GATEWAY_URL=https://api.zooplatforma.ru
      - JWT_SECRET=${JWT_SECRET}
      - PORT=9000
      - ENVIRONMENT=production
      - CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru
    restart: unless-stopped

  admin-frontend:
    build:
      context: ./frontend
    ports:
      - "4000:4000"
    environment:
      - NEXT_PUBLIC_API_URL=
      - NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
      - NEXT_PUBLIC_ENVIRONMENT=production
      - NODE_ENV=production
    depends_on:
      - admin-backend
    restart: unless-stopped
```

### Запуск

```bash
# Создайте .env с секретами
echo "JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=" > .env

# Запустите
docker-compose up -d

# Проверьте
docker-compose ps
docker-compose logs -f
```

---

## 🔧 Переменные окружения

### Backend

| Переменная | Описание | Пример |
|------------|----------|--------|
| `GATEWAY_URL` | URL Gateway API | `https://api.zooplatforma.ru` |
| `JWT_SECRET` | Секрет для JWT (должен совпадать с Gateway!) | `jyjy4VlgOP...` |
| `PORT` | Порт backend | `9000` |
| `ENVIRONMENT` | Окружение | `production` |
| `CORS_ORIGINS` | Разрешенные origins | `https://admin.zooplatforma.ru,...` |

### Frontend

| Переменная | Описание | Пример |
|------------|----------|--------|
| `NEXT_PUBLIC_API_URL` | URL Admin Backend (пусто для rewrites) | `` |
| `NEXT_PUBLIC_GATEWAY_URL` | URL Gateway | `https://api.zooplatforma.ru` |
| `NEXT_PUBLIC_ENVIRONMENT` | Окружение | `production` |
| `NODE_ENV` | Node окружение | `production` |

---

## ⚠️ Важные моменты

### 1. JWT_SECRET

**КРИТИЧНО:** `JWT_SECRET` в Admin Backend ДОЛЖЕН совпадать с Gateway!

Проверьте:
```bash
# В Gateway
echo $JWT_SECRET

# В Admin Backend
echo $JWT_SECRET

# Должны быть одинаковые!
```

### 2. CORS

В production CORS должен разрешать только production domains:

```env
CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru,https://zooplatforma.ru
```

НЕ включайте localhost в production!

### 3. Gateway доступен

Admin Backend ДОЛЖЕН иметь доступ к Gateway:

```bash
# Проверьте с сервера где запущен Admin Backend
curl https://api.zooplatforma.ru/health
```

### 4. Нет прямого подключения к БД

Admin Backend НЕ подключается к базе данных напрямую!

Все запросы идут через Gateway → Main Backend → Database.

---

## 🔍 Проверка после деплоя

### 1. Backend работает?

```bash
curl https://admin-api.zooplatforma.ru/api/admin/health
```

Ожидаемый ответ:
```json
{"status": "ok", "service": "admin-api"}
```

### 2. Frontend работает?

```bash
curl -I https://admin.zooplatforma.ru
```

Ожидаемый ответ:
```
HTTP/2 200
```

### 3. Авторизация работает?

1. Откройте https://admin.zooplatforma.ru
2. Введите email и пароль
3. Должен быть редирект на дашборд

### 4. Gateway доступен?

```bash
curl https://api.zooplatforma.ru/health
```

Ожидаемый ответ:
```json
{"status":"healthy","success":true,...}
```

---

## 🐛 Troubleshooting

### Backend не запускается

**Проверьте логи:**
```bash
# Docker
docker-compose logs admin-backend

# Easypanel
# Смотрите логи в панели
```

**Частые проблемы:**
- JWT_SECRET не установлен
- Gateway недоступен
- Порт 9000 занят

### Frontend не запускается

**Проверьте логи:**
```bash
# Docker
docker-compose logs admin-frontend

# Easypanel
# Смотрите логи в панели
```

**Частые проблемы:**
- NODE_ENV не установлен
- Build failed
- Порт 4000 занят

### Ошибка "Не авторизован"

**Причины:**
- JWT_SECRET не совпадает с Gateway
- Cookie не установлен
- Токен истёк

**Решение:**
1. Проверьте JWT_SECRET
2. Войдите заново
3. Проверьте что cookie установлен

### Ошибка "Gateway недоступен"

**Причины:**
- Gateway не запущен
- Неправильный GATEWAY_URL
- Сетевые проблемы

**Решение:**
```bash
# Проверьте Gateway
curl https://api.zooplatforma.ru/health

# Проверьте GATEWAY_URL в .env
echo $GATEWAY_URL
```

---

## 📊 Мониторинг

### Что мониторить

- ✅ Backend доступен (health check)
- ✅ Frontend доступен (HTTP 200)
- ✅ Gateway доступен (health check)
- ✅ Response time < 500ms
- ✅ Error rate < 1%
- ✅ CPU < 80%
- ✅ Memory < 90%

### Алерты

Настройте алерты для:
- Сервис недоступен (downtime)
- Медленные ответы (latency > 1s)
- Много ошибок (error rate > 5%)
- Высокая нагрузка (CPU > 90%)

---

## 🔄 Обновление

### Backend

```bash
# Docker
docker-compose pull admin-backend
docker-compose up -d admin-backend

# Easypanel
# Нажмите "Redeploy" в панели
```

### Frontend

```bash
# Docker
docker-compose pull admin-frontend
docker-compose up -d admin-frontend

# Easypanel
# Нажмите "Redeploy" в панели
```

---

## 📚 Дополнительно

- [README.md](README.md) - общая документация
- [DEPLOYMENT.md](DEPLOYMENT.md) - детальный deployment
- [ARCHITECTURE.md](ARCHITECTURE.md) - архитектура
- [backend/README.md](backend/README.md) - backend API

---

**Дата:** 6 февраля 2026
