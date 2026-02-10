# ЗооПлатформа - Кабинет владельца животных

Веб-приложение для владельцев домашних животных, позволяющее хранить всю информацию о питомцах в одном месте: медицинские записи, фотографии, документы и историю жизни.

## 🎯 Основные возможности

- **Цифровой паспорт животного** - подробная карточка каждого питомца с фото, породой, возрастом
- **Медицинские записи** - история прививок, обработок, посещений ветеринара
- **Загрузка фото** - фотографии питомцев до 15MB с автоматическим сохранением в S3
- **Хронология жизни** - полная история изменений и важных событий
- **SSO авторизация** - единая авторизация через Gateway API
- **Удобный поиск** - фильтры по виду животного, поиск по имени

## 🏗️ Архитектура

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│   Next.js    │─────▶│  Backend    │
│  (Frontend) │      │  (Port 4000) │      │  (Port 9000)│
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │  Gateway    │
                                            │     API     │
                                            └──────┬──────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │PostgreSQL│  │    S3    │  │   Auth   │
                              └──────────┘  └──────────┘  └──────────┘
```

## 🛠️ Технологии

### Backend
- **Go 1.21+** - основной язык
- **Gorilla Mux** - HTTP роутер
- **JWT** - аутентификация через Gateway

### Frontend
- **Next.js 16** (App Router) - React фреймворк
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация
- **Heroicons** - иконки

### Инфраструктура
- **PostgreSQL** - база данных (через Gateway)
- **S3** - хранилище фото (через Gateway)
- **Gateway API** - единая точка доступа к данным

## 📦 Установка и запуск

### Требования
- Go 1.21+
- Node.js 18+
- Доступ к Gateway API

### Backend

```bash
cd backend

# Создайте .env файл
cp .env.example .env

# Отредактируйте .env:
# PORT=9000
# GATEWAY_URL=https://api.zooplatforma.ru
# JWT_SECRET=your-secret-key
# CORS_ORIGINS=http://localhost:4000

# Установите зависимости
go mod download

# Запустите сервер
go run main.go
```

Backend запустится на `http://localhost:9000`

**Production URL:** `https://owner.zooplatforma.ru`

### Frontend

```bash
cd frontend

# Установите зависимости
npm install

# Создайте .env.local файл
cp .env.example .env.local

# Отредактируйте .env.local:
# ADMIN_API_URL=http://localhost:9000

# Запустите dev сервер
npm run dev
```

Frontend запустится на `http://localhost:4000`

**Production URL:** `https://owner.zooplatforma.ru`

## 🔧 Разработка

### Hot Reload для Backend

```bash
cd backend

# Установите Air
go install github.com/cosmtrek/air@latest

# Запустите с hot reload
air
```

### Frontend Development

```bash
cd frontend

# Development mode
npm run dev

# Build для production
npm run build

# Запуск production сборки
npm start
```

## 📁 Структура проекта

```
.
├── backend/
│   ├── handlers/           # HTTP обработчики
│   │   ├── auth.go        # Аутентификация
│   │   ├── pets.go        # Управление питомцами
│   │   ├── media.go       # Загрузка фото
│   │   └── breeds.go      # Породы животных
│   ├── middleware/        # Middleware
│   │   ├── auth.go        # JWT проверка
│   │   └── gateway.go     # Gateway клиент
│   └── main.go            # Точка входа
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/   # Защищенные страницы
│   │   │   ├── pets/      # Список и карточки питомцев
│   │   │   └── layout.tsx # Layout с навигацией
│   │   ├── api/           # Next.js API routes (прокси)
│   │   ├── auth/          # Страница авторизации
│   │   └── page.tsx       # Главная страница
│   └── lib/
│       └── api.ts         # API клиент
│
└── README.md
```

## 🔐 Аутентификация

Приложение использует SSO через Gateway API:

1. Пользователь вводит email/пароль на `/auth`
2. Данные отправляются на Gateway `/api/auth/login`
3. Gateway возвращает JWT токен в cookie `auth_token`
4. Токен используется для всех последующих запросов
5. Backend проверяет токен через Gateway `/api/auth/verify`

## 📡 API Endpoints

### Аутентификация
- `GET /api/admin/auth/me` - Получить текущего пользователя
- `POST /api/admin/auth/logout` - Выход из системы

### Питомцы
- `GET /api/admin/pets` - Список питомцев текущего пользователя
- `POST /api/admin/pets` - Создать питомца
- `GET /api/admin/pets/:id` - Получить питомца
- `PUT /api/admin/pets/:id` - Обновить питомца
- `POST /api/admin/pets/:id/photo` - Загрузить фото питомца

### Породы
- `GET /api/admin/breeds` - Список пород животных

## 🔒 Безопасность

- Все запросы требуют авторизации через JWT
- Пользователи видят только своих питомцев
- Запрещено изменение `owner_id` и `curator_id`
- CORS настроен только для разрешенных доменов
- Фото загружаются через защищенный Gateway API

## 🚀 Деплой

### Backend

```bash
cd backend

# Build
go build -o owner-cabinet main.go

# Run
./owner-cabinet
```

### Frontend

```bash
cd frontend

# Build
npm run build

# Start
npm start
```

### Docker (опционально)

```bash
# Backend
docker build -t owner-cabinet-backend ./backend
docker run -p 9000:9000 --env-file backend/.env owner-cabinet-backend

# Frontend
docker build -t owner-cabinet-frontend ./frontend
docker run -p 4000:4000 owner-cabinet-frontend
```

## 📝 Переменные окружения

### Backend (.env)

```env
PORT=9000                                    # Порт backend сервера
GATEWAY_URL=https://api.zooplatforma.ru     # URL Gateway API
JWT_SECRET=your-secret-key                   # Секрет для JWT (должен совпадать с Gateway)
CORS_ORIGINS=https://owner.zooplatforma.ru  # Разрешенные домены для CORS
```

### Frontend (.env.local)

```env
ADMIN_API_URL=http://localhost:9000         # URL backend API
```

## 🐛 Отладка

### Логирование Backend

Backend выводит подробные логи всех операций:
- 🔐 Аутентификация
- 📝 Запросы к Gateway
- 📸 Загрузка фото
- ✅ Успешные операции
- ❌ Ошибки

### Логирование Frontend

Откройте консоль браузера (F12) для просмотра:
- API запросов
- Ошибок загрузки
- Состояния компонентов

## 📄 Лицензия

Proprietary - ЗооПлатформа © 2026

## 👥 Контакты

Для вопросов и поддержки: https://zooplatforma.ru

**Production:** https://owner.zooplatforma.ru
