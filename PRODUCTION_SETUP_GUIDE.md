# 🚀 Production Setup Guide - ZooPlatforma

## 📋 Оглавление
1. [Архитектура системы](#архитектура-системы)
2. [Адреса и порты](#адреса-и-порты)
3. [База данных](#база-данных)
4. [Переменные окружения](#переменные-окружения)
5. [Частые ошибки и решения](#частые-ошибки-и-решения)
6. [Чеклист деплоя](#чеклист-деплоя)

---

## 🏗️ Архитектура системы

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend (Next.js)                 │
│  Port: 3000 (internal)              │
│  URL: my-projects-zooplatforma      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Gateway (Go)                       │
│  Port: 8020                         │
│  URL: my-projects-gateway-zp        │
│  - JWT авторизация                  │
│  - Проксирование к Main Service     │
│  - CORS                             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Main Service (Go)                  │
│  Port: 8020 (internal)              │
│  URL: my-projects-zooplatforma      │
│  - Бизнес-логика                    │
│  - API endpoints                    │
│  - WebSocket                        │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  PostgreSQL                         │
│  Host: 88.218.121.213:5432          │
│  Database: zp-db                    │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  S3 Storage (FirstVDS)              │
│  Endpoint: s3.firstvds.ru           │
│  Bucket: zooplatforma               │
└─────────────────────────────────────┘
```

---

## 🌐 Адреса и порты

### Production URLs

| Сервис | URL | Порт | Назначение |
|--------|-----|------|------------|
| **Frontend** | `https://my-projects-zooplatforma.crv1ic.easypanel.host` | 80 (nginx) | Веб-интерфейс |
| **Gateway** | `https://my-projects-gateway-zp.crv1ic.easypanel.host` | 8020 | Auth + Proxy |
| **Main Service** | `http://my-projects-zooplatforma:8020` (internal) | 8020 | API Backend |
| **PostgreSQL** | `88.218.121.213:5432` | 5432 | База данных |
| **S3 CDN** | `https://zooplatforma.s3.firstvds.ru` | 443 | Медиа файлы |

### Local Development URLs

| Сервис | URL | Порт |
|--------|-----|------|
| Frontend | `http://localhost:3000` | 3000 |
| Backend | `http://localhost:8000` | 8000 |
| PostgreSQL | `88.218.121.213:5432` | 5432 |

---

## 🗄️ База данных

### PostgreSQL Connection

```bash
Host: 88.218.121.213
Port: 5432
Database: zp-db
User: zp
Password: lmLG7k2ed4vas19
```

### Connection String

```
postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable
```

### Важные таблицы

- `users` - пользователи (пароли хешированы bcrypt)
- `posts` - посты
- `comments` - комментарии
- `pets` - питомцы
- `organizations` - организации
- `user_activity` - активность пользователей
- `system_logs` - системные логи

### NULL поля в users

⚠️ **ВАЖНО:** Эти поля могут быть NULL в БД:
- `last_name`
- `bio`
- `phone`
- `location`
- `avatar`
- `cover_photo`

**Решение:** Использовать `sql.NullString` или `*string` в Go структурах.

---

## 🔑 Переменные окружения

### Gateway (my-projects-gateway-zp)

#### Environment Variables
```bash
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable
MAIN_SERVICE_URL=http://my-projects-zooplatforma:8020
ALLOWED_ORIGINS=https://my-projects-zooplatforma.crv1ic.easypanel.host,http://localhost:3000
ENVIRONMENT=production
PORT=8020
```

### Main Service (my-projects-zooplatforma)

#### Environment Variables
```bash
PORT=8000
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
ENVIRONMENT=production
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable

# Gateway URL (для production)
AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host

# S3 Storage
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=L3BKDZK45R5VHEZ106FG
S3_SECRET_KEY=kqk5rjkLqOUwIPMSt6eb0iRJTo7Y8Z6pCVivQXHZ
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://my-projects-zooplatforma.crv1ic.easypanel.host
```

#### Build Arguments (для Next.js)
```bash
NEXT_PUBLIC_API_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
NEXT_PUBLIC_DADATA_API_KEY=300ba9e25ef32f0d6ea7c41826b2255b138e19e2
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=8cf445c5-b490-40a5-96c4-dd72c041419f
```

### Local Development (.env)

#### Backend (.env)
```bash
PORT=8000
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
ENVIRONMENT=production
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable

# Закомментировать для локальной разработки
# AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host

# S3 Storage
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=L3BKDZK45R5VHEZ106FG
S3_SECRET_KEY=kqk5rjkLqOUwIPMSt6eb0iRJTo7Y8Z6pCVivQXHZ
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru

ALLOWED_ORIGINS=http://localhost:3000
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DADATA_API_KEY=300ba9e25ef32f0d6ea7c41826b2255b138e19e2
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=8cf445c5-b490-40a5-96c4-dd72c041419f
NEXT_PUBLIC_S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
```

---

## ⚠️ Частые ошибки и решения

### 1. "Database error" при входе

**Причина:** NULL поля в БД не обрабатываются правильно

**Решение:**
```go
// ❌ Неправильно
var user User
err := db.QueryRow("SELECT ... FROM users WHERE email = $1", email).Scan(
    &user.LastName, // string не может быть NULL
)

// ✅ Правильно
var lastName sql.NullString
err := db.QueryRow("SELECT ... FROM users WHERE email = $1", email).Scan(
    &lastName,
)
if lastName.Valid {
    user.LastName = lastName.String
}
```

### 2. "Invalid token" / "Unauthorized"

**Причина:** JWT_SECRET не совпадает между Gateway и Main Service

**Решение:** Убедитесь, что `JWT_SECRET` одинаковый везде:
```bash
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
```

### 3. "Неверный email или пароль" (bcrypt)

**Причина:** Пароль в БД не совпадает с введенным

**Решение:** Сбросить пароль через скрипт:
```bash
cd backend/scripts/reset_password
go run main.go anton@dvinyaninov.ru новый_пароль
```

**Проверить пароль:**
```bash
cd backend/scripts/test_password
go run main.go anton@dvinyaninov.ru пароль
```

### 4. CORS ошибки

**Причина:** Frontend URL не добавлен в ALLOWED_ORIGINS

**Решение:** Добавить в Gateway и Main Service:
```bash
ALLOWED_ORIGINS=https://my-projects-zooplatforma.crv1ic.easypanel.host,http://localhost:3000
```

### 5. "NEXT_PUBLIC_* is undefined" в браузере

**Причина:** Переменные не переданы как Build Arguments

**Решение:**
1. Добавить в Dockerfile:
```dockerfile
ARG NEXT_PUBLIC_DADATA_API_KEY
ENV NEXT_PUBLIC_DADATA_API_KEY=${NEXT_PUBLIC_DADATA_API_KEY}
```

2. Добавить в Easypanel → Build Arguments (не Environment Variables!)

### 6. "Failed to fetch" / "net::ERR_FAILED"

**Причина:** Неправильный NEXT_PUBLIC_API_URL

**Решение:**
- **Production:** `NEXT_PUBLIC_API_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host`
- **Local:** `NEXT_PUBLIC_API_URL=http://localhost:8000`

### 7. Аватар не отображается после загрузки

**Причина:** Браузер кэширует старое изображение

**Решение:** Добавить cache buster:
```typescript
const avatarUrl = user?.avatar 
  ? `${getMediaUrl(user.avatar)}?v=${encodeURIComponent(user.avatar)}` 
  : undefined;
```

### 8. "Auth service unavailable" локально

**Причина:** `AUTH_SERVICE_URL` установлен, но Gateway не запущен

**Решение:** Закомментировать в `backend/.env`:
```bash
# AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
```

### 9. Попадание на `/id0` или `/idundefined`

**Причина:** AuthContext неправильно парсит ответ от API

**Решение:** Проверить порядок парсинга:
```typescript
// Сначала data.user (Main Service)
if ((response as any).data?.user) {
  userData = (response as any).data.user;
}
// Затем прямо user (Gateway)
else if ((response as any).user) {
  userData = (response as any).user;
}
```

### 10. "main redeclared in this block" в Go

**Причина:** Несколько файлов с `package main` в одной папке

**Решение:** Переместить скрипты в отдельные подпапки:
```bash
backend/scripts/reset_password/main.go
backend/scripts/test_password/main.go
```

---

## ✅ Чеклист деплоя нового сервиса

### 1. Подготовка кода

- [ ] Все переменные окружения вынесены в `.env`
- [ ] Dockerfile создан и протестирован локально
- [ ] `.dockerignore` настроен (исключить `node_modules`, `.git`, `.env`)
- [ ] Порты не конфликтуют с другими сервисами
- [ ] CORS настроен для production URL

### 2. База данных

- [ ] Подключение к PostgreSQL работает
- [ ] Миграции применены
- [ ] NULL поля обрабатываются через `sql.NullString`
- [ ] Индексы созданы для часто используемых полей

### 3. Переменные окружения

- [ ] `JWT_SECRET` одинаковый везде
- [ ] `DATABASE_URL` правильный
- [ ] `ALLOWED_ORIGINS` содержит все нужные URL
- [ ] `NEXT_PUBLIC_*` переменные добавлены как Build Arguments
- [ ] API ключи (DaData, Yandex Maps, S3) добавлены

### 4. Easypanel настройки

- [ ] Проект создан
- [ ] GitHub репозиторий подключен
- [ ] Environment Variables добавлены
- [ ] Build Arguments добавлены (для Next.js)
- [ ] Порт правильно настроен
- [ ] Domain привязан

### 5. Тестирование

- [ ] Health check endpoint работает
- [ ] Авторизация работает (login/register)
- [ ] API endpoints отвечают
- [ ] CORS не блокирует запросы
- [ ] Медиа файлы загружаются
- [ ] WebSocket подключается (если используется)

### 6. Мониторинг

- [ ] Логи доступны в Easypanel
- [ ] Ошибки логируются с деталями
- [ ] Метрики собираются (опционально)

---

## 🔧 Полезные команды

### Проверка подключения к БД
```bash
psql "postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db" -c "SELECT version();"
```

### Проверка пользователя в БД
```bash
psql "postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db" -c "SELECT id, email, name FROM users WHERE email = 'anton@dvinyaninov.ru';"
```

### Сброс пароля
```bash
cd backend/scripts/reset_password
go run main.go anton@dvinyaninov.ru новый_пароль
```

### Проверка пароля
```bash
cd backend/scripts/test_password
go run main.go anton@dvinyaninov.ru пароль
```

### Тест API endpoint
```bash
# Login
curl -X POST https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"anton@dvinyaninov.ru","password":"dxG0BBG0"}'

# Get user profile
curl -X GET https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Локальный билд Docker
```bash
docker build -t zooplatforma:test .
docker run -p 80:80 --env-file .env zooplatforma:test
```

---

## 📚 Дополнительные документы

- `ARCHITECTURE.md` - Архитектура системы
- `DEPLOYMENT.md` - Процесс деплоя
- `API_KEYS.md` - Все API ключи
- `S3_STORAGE.md` - Настройка S3
- `LOCAL_DEVELOPMENT.md` - Локальная разработка
- `GATEWAY_LOCAL_DEV.md` - Gateway в dev режиме

---

## 🆘 Поддержка

Если что-то не работает:

1. **Проверьте логи** в Easypanel
2. **Проверьте переменные окружения** - они правильные?
3. **Проверьте CORS** - добавлен ли frontend URL?
4. **Проверьте JWT_SECRET** - одинаковый везде?
5. **Проверьте NULL поля** - используется ли `sql.NullString`?

---

**Последнее обновление:** 04.02.2026
