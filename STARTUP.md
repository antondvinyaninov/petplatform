# Main Project - Startup Guide

## 🚀 Быстрый старт

```bash
./run
```

Скрипт автоматически:
- ✅ Проверит подключение к API Gateway
- ✅ Проверит подключение к PostgreSQL
- ✅ Проверит наличие критических таблиц (users, chats, messages)
- ✅ Запустит Backend (порт 8000)
- ✅ Запустит Frontend (порт 3000)

## 📋 Требования

### Обязательные внешние сервисы:

1. **PostgreSQL Database**
   - Хост: `88.218.121.213:5432`
   - База: `zp-db`
   - Настраивается в `backend/.env` через `DATABASE_URL`

2. **API Gateway** (опционально)
   - URL: `https://my-projects-gateway-zp.crv1ic.easypanel.host/`
   - Используется для production

### Локальные зависимости:

- Go 1.25+
- Node.js 18+
- npm или yarn

## 🔧 Конфигурация

### Backend (.env)

```env
PORT=8000
ENVIRONMENT=production
JWT_SECRET=your-secret-key
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=disable
```

**Важно:** `ENVIRONMENT=production` нужен для правильной конвертации SQL плейсхолдеров (`?` → `$1, $2, $3`)

## 📊 Проверка подключений

Скрипт `./run` автоматически проверяет:

### 1. API Gateway
```bash
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health
```

### 2. PostgreSQL
```bash
cd backend/scripts/check_db
go run main.go
```

Проверяет:
- Подключение к БД
- Наличие таблиц: users, chats, messages

## 🛑 Остановка

Нажмите `Ctrl+C` в терминале где запущен `./run`

Или вручную:
```bash
lsof -ti:8000,3000 | xargs kill -9
```

## 📝 Логи

```bash
# Backend
tail -f /tmp/main-backend.log

# Frontend
tail -f /tmp/main-frontend.log
```

## 🔍 Проверка работы

### Backend API
```bash
curl http://localhost:8000/api/health
# Ответ: {"status": "ok"}
```

### Frontend
Открой в браузере: http://localhost:3000

### Мессенджер
http://localhost:3000/messenger

## ⚠️ Troubleshooting

### Ошибка: "Cannot connect to PostgreSQL"

1. Проверь `DATABASE_URL` в `backend/.env`
2. Проверь что PostgreSQL доступен:
   ```bash
   nc -zv 88.218.121.213 5432
   ```
3. Проверь что таблицы существуют

### Ошибка: "Port already in use"

```bash
# Освободи порты
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Ошибка: "main redeclared"

Это значит что в папке `backend/` есть несколько файлов с `package main` и функцией `main()`.

Решение: утилиты должны быть в `backend/scripts/`

## 📦 Структура

```
main/
├── backend/
│   ├── handlers/       # HTTP handlers
│   ├── models/         # Data models
│   ├── scripts/        # Utility scripts
│   │   └── check_db.go # Database check
│   ├── main.go         # Main entry point
│   └── .env            # Configuration
├── frontend/
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   └── lib/            # Utilities
└── run                 # Startup script
```

## 🎯 Что проверяется при запуске

1. ✅ Очистка кэша Next.js
2. ✅ Освобождение портов 8000, 3000
3. ✅ Проверка API Gateway (опционально)
4. ✅ Проверка PostgreSQL (обязательно)
5. ✅ Проверка таблиц БД (обязательно)
6. ✅ Запуск Backend с hot reload (air)
7. ✅ Запуск Frontend (Next.js dev)
8. ✅ Health check Backend API

Если любая из критических проверок не проходит - запуск останавливается с ошибкой.

---

**Дата обновления:** 3 февраля 2026
