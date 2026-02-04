# PetPlatform - Социальная сеть для владельцев домашних животных

Полнофункциональная социальная платформа для владельцев домашних животных с поддержкой постов, мессенджера, организаций, объявлений и многого другого.

## 🚀 Быстрый старт

### Запуск проекта

Используйте один из скриптов запуска:

**Полный запуск с проверками:**
```bash
./run
```

Скрипт автоматически:
- Проверит подключение к PostgreSQL
- Проверит подключение к S3 хранилищу
- Проверит доступность API Gateway
- Запустит Backend с hot reload (через air)
- Запустит Frontend (Next.js)

**Простой запуск:**
```bash
./run-simple
```

**Ручной запуск:**
```bash
# 1. Запустить Backend
cd backend && go run main.go &

# 2. Запустить Frontend
cd frontend && npm run dev &
```

### Остановка проекта

Нажмите `Ctrl+C` в терминале где запущен скрипт, или:

```bash
# Остановить все процессы на портах
lsof -ti:8000,3000 | xargs kill -9
```

## 📍 Сервисы и порты

| Сервис | Порт | URL | Описание |
|--------|------|-----|----------|
| Frontend | 3000 | http://localhost:3000 | Next.js приложение |
| Backend | 8000 | http://localhost:8000 | Go API сервер |
| API Gateway | - | https://my-projects-gateway-zp.crv1ic.easypanel.host | Удаленный Gateway (production) |
| PostgreSQL | 5432 | 88.218.121.213:5432 | Удаленная база данных |
| S3 Storage | - | https://zooplatforma.s3.firstvds.ru | FirstVDS S3 хранилище |

## 🏗️ Структура проекта

```
petplatform/
├── frontend/           # Next.js приложение
│   ├── app/           # Страницы и роуты (App Router)
│   │   ├── (main)/   # Основные страницы
│   │   ├── auth/     # Страница авторизации
│   │   └── components/ # React компоненты
│   ├── lib/           # API клиенты и утилиты
│   ├── contexts/      # React контексты (Auth, Toast)
│   └── types/         # TypeScript типы
├── backend/           # Go API сервер
│   ├── handlers/      # HTTP обработчики
│   ├── middleware/    # Middleware (auth, CORS)
│   ├── models/        # Модели данных
│   ├── db/           # Подключение к PostgreSQL
│   ├── storage/      # S3 интеграция
│   ├── logger/       # Система логирования
│   └── main.go       # Точка входа
├── docs/             # Документация
├── run               # Скрипт запуска (полный)
├── run-simple        # Скрипт запуска (простой)
└── README.md         # Эта документация
```

## 🔧 Разработка

### Frontend (Next.js)

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Запуск production сборки
npm start
```

### Backend (Go)

```bash
cd backend

# Установка зависимостей
go mod download

# Запуск сервера
go run main.go

# Сборка бинарника
go build -o main

# Запуск бинарника
./main
```

## 📦 Основные возможности

- 📝 **Посты и лента** - создание постов с фото, видео, опросами
- 💬 **Мессенджер** - личные сообщения в реальном времени (WebSocket)
- 👥 **Друзья** - система дружбы и подписок
- 🐾 **Питомцы** - профили питомцев с фото и событиями
- 🏢 **Организации** - приюты, клиники, зоомагазины
- 📢 **Объявления** - поиск питомцев, помощь приютам
- ⭐ **Избранное** - сохранение понравившихся питомцев
- 🔔 **Уведомления** - в реальном времени
- 🗺️ **Геолокация** - интеграция с Яндекс.Картами
- 📊 **Аналитика** - статистика активности пользователей

## 📦 Зависимости

### Backend (Go)

- **Фреймворк**: net/http (стандартная библиотека)
- **База данных**: PostgreSQL (github.com/lib/pq)
- **JWT**: github.com/golang-jwt/jwt/v5
- **WebSocket**: github.com/gorilla/websocket
- **S3**: github.com/aws/aws-sdk-go
- **UUID**: github.com/google/uuid
- **Env**: github.com/joho/godotenv

### Frontend (Next.js)

- **Фреймворк**: Next.js 16 (App Router)
- **React**: 19
- **TypeScript**: 5
- **Стили**: Tailwind CSS
- **Карты**: Яндекс.Карты API
- **Автокомплит**: DaData API

## 🔐 Переменные окружения

### Backend (.env)

```env
# Server
PORT=8000

# JWT Secret
JWT_SECRET=your-super-secret-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000

# Environment
ENVIRONMENT=production

# Service URLs
AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
PETBASE_SERVICE_URL=http://localhost:8100

# PostgreSQL Database
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=disable

# S3 Storage (FirstVDS)
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_CDN_URL=https://your-bucket.s3.firstvds.ru
```

### Frontend (.env.local)

```env
# Backend API URL (для локальной разработки)
NEXT_PUBLIC_API_URL=http://localhost:8000

# S3 CDN URL
NEXT_PUBLIC_S3_CDN_URL=https://your-bucket.s3.firstvds.ru

# DaData API Key (для автокомплита городов)
NEXT_PUBLIC_DADATA_API_KEY=your-dadata-key
```

## 📝 API Endpoints

Подробная документация API доступна в [README_API.md](./README_API.md)

### Авторизация
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `POST /api/auth/logout` - выход
- `GET /api/auth/me` - текущий пользователь

### Посты
- `GET /api/posts` - лента постов
- `POST /api/posts` - создать пост
- `GET /api/posts/:id` - получить пост
- `PUT /api/posts/:id` - обновить пост
- `DELETE /api/posts/:id` - удалить пост
- `POST /api/posts/:id/like` - лайкнуть пост

### Пользователи
- `GET /api/users/:id` - профиль пользователя
- `PUT /api/profile` - обновить профиль
- `POST /api/profile/avatar` - загрузить аватар

### Питомцы
- `GET /api/pets` - список питомцев
- `POST /api/pets` - создать питомца
- `GET /api/pets/:id` - получить питомца
- `PUT /api/pets/:id` - обновить питомца
- `DELETE /api/pets/:id` - удалить питомца

### Мессенджер
- `GET /api/chats` - список чатов
- `GET /api/chats/:id` - сообщения чата
- `POST /api/messages/send` - отправить сообщение
- `GET /api/messages/unread` - количество непрочитанных
- `WS /ws` - WebSocket подключение

### Организации
- `GET /api/organizations` - список организаций
- `POST /api/organizations` - создать организацию
- `GET /api/organizations/:id` - получить организацию
- `PUT /api/organizations/:id` - обновить организацию

### Друзья
- `GET /api/friends` - список друзей
- `GET /api/friends/requests` - заявки в друзья
- `POST /api/friends/send` - отправить заявку
- `POST /api/friends/accept` - принять заявку
- `POST /api/friends/reject` - отклонить заявку
- `DELETE /api/friends/remove` - удалить из друзей

## 🐛 Отладка

### Проверка логов

```bash
# Backend
tail -f /tmp/main-backend.log

# Frontend
tail -f /tmp/main-frontend.log
```

### Проверка портов

```bash
# Проверить какие порты заняты
lsof -i :3000
lsof -i :8000
```

### Проверка подключений

```bash
# Проверить Backend
curl http://localhost:8000/api/health

# Проверить Gateway
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health

# Проверить PostgreSQL
psql -h 88.218.121.213 -p 5432 -U your_user -d your_db
```

### Очистка кэша

```bash
# Очистить Next.js кэш
rm -rf frontend/.next

# Очистить node_modules
rm -rf frontend/node_modules
cd frontend && npm install
```

## 📚 Дополнительная документация

- [API Documentation](./README_API.md) - документация API
- [Architecture](./ARCHITECTURE.md) - архитектура проекта
- [Deployment Guide](./DEPLOYMENT.md) - руководство по деплою
- [S3 Storage](./S3_STORAGE.md) - настройка S3 хранилища
- [Gateway Documentation](./gateway.md) - документация API Gateway

## 🚀 Деплой

Проект использует:
- **Frontend**: Vercel
- **Backend**: Easypanel (Docker)
- **Database**: PostgreSQL на VPS
- **Storage**: FirstVDS S3
- **Gateway**: Easypanel (прокси для всех сервисов)

Подробнее в [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте ветку для фичи (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT
