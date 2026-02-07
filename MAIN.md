# Main Service - Документация

## 🌐 Адреса и порты

### Development (локальная разработка)
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Auth Service:** http://localhost:7100
- **PetBase Service:** http://localhost:8100

### Production
- **Frontend:** https://zooplatforma.ru
- **Backend:** https://zooplatforma.ru/api
- **Gateway:** https://gateway.zooplatforma.ru

### Production (Easypanel - старые адреса)
- **Frontend:** https://my-projects-main-zp.crv1ic.easypanel.host
- **Backend:** https://my-projects-main-zp.crv1ic.easypanel.host/api
- **Gateway:** https://my-projects-gateway-zp.crv1ic.easypanel.host

---

## 🗄️ База данных

### Подключение к PostgreSQL

**Параметры подключения:**
```env
DB_HOST=88.218.121.213
DB_PORT=5432
DB_USER=zp
DB_PASSWORD=lmLG7k2ed4vas19
DB_NAME=zp-db
DB_SSLMODE=disable
```

**Connection String:**
```
postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable
```

**Файл конфигурации:** `backend/.env`

### Основные таблицы
- `users` - пользователи
- `posts` - посты
- `comments` - комментарии
- `likes` - лайки
- `friendships` - дружба
- `organizations` - организации
- `organization_members` - члены организаций
- `pets` - питомцы
- `polls`, `poll_options`, `poll_votes` - опросы
- `messages`, `chats` - мессенджер
- `notifications` - уведомления
- `media` - медиафайлы
- `user_activity` - активность пользователей

---

## 🔐 Авторизация

### Схема авторизации

Main Service использует **Auth Service (порт 7100)** для авторизации.

**Flow:**
1. Frontend → Main Backend → Auth Service (login)
2. Auth Service возвращает JWT токен
3. Main Backend устанавливает cookie `auth_token` с `Domain: localhost`
4. Все последующие запросы автоматически включают cookie
5. Main Backend проверяет токен через middleware

### Endpoints авторизации

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

**GET /api/auth/me**
- Проверяет текущую авторизацию
- Возвращает данные пользователя

**POST /api/auth/logout**
- Удаляет cookie авторизации

---

## 📡 API Endpoints

### Посты

**GET /api/posts**
- Получить список постов
- Query params: `?filter=all|friends|my`

**POST /api/posts**
```json
{
  "content": "Текст поста",
  "author_type": "user",
  "author_id": 1,
  "media_ids": [1, 2, 3],
  "pet_ids": [1],
  "poll": {
    "question": "Вопрос?",
    "options": ["Вариант 1", "Вариант 2"],
    "allow_multiple": false,
    "anonymous": false
  }
}
```

**GET /api/posts/:id**
- Получить конкретный пост

**PUT /api/posts/:id**
- Обновить пост

**DELETE /api/posts/:id**
- Удалить пост

### Комментарии

**GET /api/posts/:id/comments**
- Получить комментарии к посту

**POST /api/posts/:id/comments**
```json
{
  "content": "Текст комментария"
}
```

### Лайки

**POST /api/posts/:id/like**
- Поставить/убрать лайк

**GET /api/posts/:id/likes**
- Получить список лайкнувших

### Друзья

**GET /api/friends**
- Список друзей

**GET /api/friends/requests**
- Входящие заявки в друзья

**POST /api/friends/request**
```json
{
  "friend_id": 2
}
```

**POST /api/friends/accept**
```json
{
  "friend_id": 2
}
```

**POST /api/friends/reject**
```json
{
  "friend_id": 2
}
```

**DELETE /api/friends/:id**
- Удалить из друзей

### Профиль

**GET /api/profile**
- Получить свой профиль

**PUT /api/profile**
```json
{
  "name": "John Doe",
  "last_name": "Smith",
  "bio": "О себе",
  "location": "Москва",
  "phone": "+79991234567"
}
```

**GET /api/users/:id**
- Получить профиль пользователя

**GET /api/users/:id/posts**
- Посты пользователя

### Организации

**GET /api/organizations**
- Список организаций

**GET /api/organizations/:id**
- Информация об организации

**POST /api/organizations**
```json
{
  "name": "Название",
  "type": "shelter",
  "description": "Описание",
  "address": "Адрес",
  "phone": "+79991234567",
  "email": "org@example.com"
}
```

**GET /api/organizations/:id/members**
- Члены организации

**POST /api/organizations/:id/members**
```json
{
  "user_id": 2,
  "role": "member"
}
```

### Питомцы

**GET /api/pets/:id**
- Информация о питомце

**GET /api/pets/:id/posts**
- Посты питомца

### Мессенджер

**GET /api/chats**
- Список чатов

**GET /api/chats/:id/messages**
- Сообщения чата

**POST /api/messages**
```json
{
  "chat_id": 1,
  "content": "Текст сообщения"
}
```

**GET /api/messages/unread**
- Количество непрочитанных сообщений

### Уведомления

**GET /api/notifications**
- Список уведомлений

**PUT /api/notifications/:id/read**
- Отметить как прочитанное

### Медиа

**POST /api/media/upload**
- Загрузка файлов (multipart/form-data)

**POST /api/media/chunked/init**
- Инициализация chunked upload

**POST /api/media/chunked/upload**
- Загрузка чанка

**POST /api/media/chunked/complete**
- Завершение chunked upload

---

## 🌉 Взаимодействие с Gateway

### Development
Main Service работает **напрямую** без Gateway:
- Frontend → Main Backend (localhost:8000)
- Main Backend → Auth Service (localhost:7100)
- Main Backend → PetBase (localhost:8100)

### Production
Main Service работает **через Gateway**:
- Frontend → Gateway → Main Backend
- Gateway проксирует запросы к Auth Service и PetBase

**Gateway URL:** https://gateway.zooplatforma.ru

**Маршруты Gateway:**
- `/api/auth/*` → Auth Service
- `/api/petbase/*` → PetBase Service
- `/api/*` → Main Backend

---

## 🔧 Переменные окружения

### Backend (.env)

```env
# Database
DB_HOST=88.218.121.213
DB_PORT=5432
DB_USER=zp
DB_PASSWORD=lmLG7k2ed4vas19
DB_NAME=zp-db
DB_SSLMODE=disable

# Auth Service
AUTH_SERVICE_URL=http://localhost:7100

# JWT
JWT_SECRET=your-secret-key-here

# Server
PORT=8000

# S3 Storage (опционально)
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
S3_REGION=

# DaData API
DADATA_API_KEY=your-dadata-key
```

### Frontend (.env.local)

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# DaData API
NEXT_PUBLIC_DADATA_API_KEY=your-dadata-key

# Yandex Maps
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-key
```

### Frontend (.env.production)

```env
# API URL (пустая строка = относительные пути через Next.js rewrites)
NEXT_PUBLIC_API_URL=

# DaData API
NEXT_PUBLIC_DADATA_API_KEY=your-dadata-key

# Yandex Maps
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your-yandex-key
```

---

## 🚀 Запуск

### Development

```bash
# Запустить все сервисы
./run

# Или по отдельности:

# Backend
cd backend
go run main.go

# Frontend
cd frontend
npm run dev
```

### Production (Docker)

```bash
# Build
docker build -t main-service .

# Run
docker run -p 8000:8000 -p 3000:3000 main-service
```

---

## 📦 Зависимости

### Backend (Go)
- `github.com/lib/pq` - PostgreSQL driver
- `github.com/golang-jwt/jwt/v5` - JWT
- `github.com/aws/aws-sdk-go` - S3 storage

### Frontend (Next.js)
- `next` - React framework
- `react`, `react-dom` - React
- `tailwindcss` - CSS framework
- `browser-image-compression` - Image compression

---

## 🔄 API Client (Frontend)

### Использование

```typescript
import { apiClient } from '@/lib/api';

// GET запрос
const response = await apiClient.get<{ posts: Post[] }>('/api/posts');
if (response.success && response.data) {
  console.log(response.data.posts);
}

// POST запрос
const response = await apiClient.post<{ post: Post }>('/api/posts', {
  content: 'Hello world'
});

// PUT запрос
const response = await apiClient.put<{ post: Post }>(`/api/posts/${id}`, {
  content: 'Updated'
});

// DELETE запрос
const response = await apiClient.delete(`/api/posts/${id}`);
```

### Автоматические возможности
- ✅ Автоматически добавляет `Authorization` header
- ✅ Автоматически добавляет `credentials: 'include'`
- ✅ Автоматически использует правильный URL (dev/prod)
- ✅ Единообразная обработка ошибок

---

## 🐛 Отладка

### Логи Backend
```bash
tail -f /tmp/main-backend.log
```

### Проверка авторизации
```bash
# Проверить cookie
curl -v http://localhost:8000/api/auth/me \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Логин
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Проверка БД
```bash
psql postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db

# Внутри psql:
\dt                    # Список таблиц
\d users              # Схема таблицы users
SELECT * FROM users;  # Запрос
\q                    # Выход
```

---

## 📝 Примечания

### CORS
Main Backend настроен на работу с:
- `http://localhost:3000` (Frontend dev)
- `https://zooplatforma.ru` (Frontend prod)
- `https://my-projects-main-zp.crv1ic.easypanel.host` (Frontend prod - старый адрес)

### Cookie
- Имя: `auth_token`
- Domain: `localhost` (dev) / `zooplatforma.ru` (prod)
- HttpOnly: `true`
- SameSite: `Lax`
- MaxAge: 7 дней

### Относительные пути
Frontend использует относительные пути в production через Next.js rewrites:
```javascript
// next.config.ts
rewrites: async () => [
  {
    source: '/api/:path*',
    destination: 'http://localhost:8000/api/:path*', // dev
    // В production Next.js проксирует через Gateway
  }
]
```

---

## 🔗 Связанные сервисы

- **Auth Service** - Авторизация и управление пользователями
- **PetBase** - База данных питомцев (виды, породы)
- **Gateway** - API Gateway для production
- **Database** - Общая PostgreSQL база данных

---

**Дата обновления:** 6 февраля 2026
