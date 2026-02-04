# 🛠️ Локальная разработка с Gateway

> Настройка локального окружения идентичного продакшену

---

## 📋 Архитектура

**Продакшен:**
```
Frontend (my-projects-zooplatforma) → Gateway (my-projects-gateway-zp) → Backend → PostgreSQL
```

**Локально:**
```
Frontend (localhost:3000) → Gateway (localhost:80) → Backend (localhost:8000) → PostgreSQL (удаленный)
```

---

## 🚀 Быстрый старт

### 1. Клонируй Gateway репозиторий

```bash
# В отдельной папке (не в этом проекте)
cd ..
git clone https://github.com/YOUR_USERNAME/gateway.git
cd gateway
```

### 2. Настрой Gateway `.env`

Создай файл `gateway/.env`:

```bash
# JWT Secret (ОБЯЗАТЕЛЬНО одинаковый с backend!)
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=

# Gateway
GATEWAY_PORT=80

# PostgreSQL (production database)
ENVIRONMENT=production
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable

# Backend Services (локальные)
MAIN_SERVICE_URL=http://localhost:8000
PETBASE_SERVICE_URL=http://localhost:8100
CLINIC_SERVICE_URL=http://localhost:8600
OWNER_SERVICE_URL=http://localhost:8400
SHELTER_SERVICE_URL=http://localhost:8200
VOLUNTEER_SERVICE_URL=http://localhost:8500
ADMIN_SERVICE_URL=http://localhost:9000
```

### 3. Запусти Gateway

```bash
cd gateway
go run .
```

Gateway запустится на `http://localhost:80`

### 4. Настрой Backend `.env`

В `backend/.env` убедись что:

```bash
PORT=8000
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
ENVIRONMENT=production

# Gateway URL
AUTH_SERVICE_URL=http://localhost:80

# PostgreSQL (production database)
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable

# S3 (production)
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=L3BKDZK45R5VHEZ106FG
S3_SECRET_KEY=kqk5rjkLqOUwIPMSt6eb0iRJTo7Y8Z6pCVivQXHZ
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru

# CORS (для локальной разработки)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

### 5. Запусти Backend

```bash
cd backend
go run .
```

Backend запустится на `http://localhost:8000`

### 6. Настрой Frontend `.env.local`

В `frontend/.env.local`:

```bash
# Gateway URL (локальный)
NEXT_PUBLIC_API_URL=http://localhost:80
```

### 7. Запусти Frontend

```bash
cd frontend
npm run dev
```

Frontend запустится на `http://localhost:3000`

---

## ✅ Проверка

### 1. Gateway работает:
```bash
curl http://localhost:80/
```

Должен вернуть JSON с информацией о Gateway.

### 2. Backend работает:
```bash
curl http://localhost:8000/api/health
```

Должен вернуть `{"status":"ok"}`.

### 3. Frontend → Gateway → Backend:

Открой `http://localhost:3000` в браузере:
- Залогинься
- Проверь что посты загружаются
- Проверь что WebSocket подключается

---

## 🔧 Порядок запуска

**Всегда запускай в таком порядке:**

1. **Gateway** (первым, т.к. Backend и Frontend обращаются к нему)
2. **Backend** (вторым)
3. **Frontend** (последним)

**Команды в отдельных терминалах:**

```bash
# Терминал 1: Gateway
cd gateway
go run .

# Терминал 2: Backend
cd backend
go run .

# Терминал 3: Frontend
cd frontend
npm run dev
```

---

## 🐛 Решение проблем

### Gateway не запускается на порту 80

**Проблема:** Порт 80 требует sudo на macOS/Linux.

**Решение 1:** Запусти с sudo:
```bash
sudo go run .
```

**Решение 2:** Измени порт в `.env`:
```bash
GATEWAY_PORT=8080
```

И в `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### CORS ошибки

**Проблема:** Gateway не разрешает запросы от `localhost:3000`.

**Решение:** В Gateway добавь в `middleware.go`:
```go
allowedOrigins := map[string]bool{
    "http://localhost:3000": true,
    "http://localhost:4000": true,
}
```

### WebSocket не подключается

**Проблема:** WebSocket пытается подключиться к неправильному URL.

**Решение:** Проверь в браузере DevTools → Console:
```
🔌 Connecting to WebSocket: ws://localhost:80/ws?token=...
```

Должен быть `ws://localhost:80/ws` (или `ws://localhost:8080/ws` если изменил порт).

### Backend не подключается к PostgreSQL

**Проблема:** Firewall блокирует подключение к удаленной БД.

**Решение:** Проверь что можешь подключиться:
```bash
psql postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db
```

Если не работает - используй локальную PostgreSQL или SSH туннель.

---

## 📊 Сравнение: Локально vs Продакшен

| Компонент | Локально | Продакшен |
|-----------|----------|-----------|
| Frontend | `localhost:3000` | `my-projects-zooplatforma.crv1ic.easypanel.host` |
| Gateway | `localhost:80` | `my-projects-gateway-zp.crv1ic.easypanel.host` |
| Backend | `localhost:8000` | `my-projects-zooplatforma:80` (внутри контейнера) |
| PostgreSQL | `88.218.121.213:5432` | `88.218.121.213:5432` (одна и та же!) |
| S3 | `s3.firstvds.ru` | `s3.firstvds.ru` (одно и то же!) |

**Важно:** Локально и на продакшене используется **одна и та же база данных** и **одно и то же S3 хранилище**!

---

## 🎯 Workflow разработки

### 1. Разработка новой фичи

```bash
# 1. Запусти все сервисы локально
cd gateway && go run . &
cd backend && go run . &
cd frontend && npm run dev

# 2. Открой http://localhost:3000
# 3. Разрабатывай и тестируй
# 4. Коммить изменения
git add .
git commit -m "feat: new feature"
git push
```

### 2. Деплой на продакшен

```bash
# Easypanel автоматически задеплоит после push
# Или вручную в Easypanel: Projects → Rebuild
```

### 3. Тестирование на продакшене

```bash
# Открой https://my-projects-zooplatforma.crv1ic.easypanel.host
# Проверь что все работает
```

---

## 🔐 Безопасность

### ⚠️ Важно:

1. **Не коммить `.env` файлы** - они в `.gitignore`
2. **Не коммить секреты** - используй переменные окружения
3. **Локально используй production БД** - будь осторожен с изменениями!
4. **Тестируй на локальных данных** - создай тестовых пользователей

### Рекомендации:

- Создай отдельного тестового пользователя для локальной разработки
- Не удаляй production данные локально
- Используй транзакции для тестирования SQL запросов

---

## 📚 Полезные команды

### Проверка статуса сервисов:

```bash
# Gateway
curl http://localhost:80/

# Backend
curl http://localhost:8000/api/health

# PostgreSQL
psql postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db -c "SELECT COUNT(*) FROM users;"
```

### Логи:

```bash
# Gateway логи в терминале где запущен
# Backend логи в терминале где запущен
# Frontend логи в терминале где запущен
```

### Остановка всех сервисов:

```bash
# Ctrl+C в каждом терминале
# Или:
pkill -f "go run"
pkill -f "npm run dev"
```

---

## 🎉 Готово!

Теперь ты можешь разрабатывать локально с той же архитектурой что и на продакшене!

**Преимущества:**
- ✅ Одинаковая архитектура локально и на продакшене
- ✅ Тестируешь Gateway локально
- ✅ WebSocket работает так же как на продакшене
- ✅ Используешь production данные (осторожно!)
- ✅ Быстрая разработка без деплоя

**Следующие шаги:**
1. Запусти все сервисы
2. Открой `http://localhost:3000`
3. Разрабатывай и тестируй
4. Коммить и пушить
5. Easypanel автоматически задеплоит

---

**Вопросы?** Проверь раздел "Решение проблем" выше.
