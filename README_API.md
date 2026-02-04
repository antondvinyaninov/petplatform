# Main Service - Социальная сеть

**Порт Backend:** 8000  
**Порт Frontend:** 3000  
**Назначение:** Главная социальная сеть для владельцев питомцев

---

## Описание

Main Service - это основная платформа, которая включает:
- Ленту постов с фото и видео
- Систему друзей
- Личные сообщения (мессенджер)
- Уведомления
- Организации (клиники, приюты, магазины)
- Лайки и комментарии
- Опросы
- Избранное

---

## База данных

`main/database/main.db`

### Таблицы

```sql
-- Посты
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    author_type TEXT DEFAULT 'user',
    content TEXT NOT NULL,
    attached_pets TEXT DEFAULT '[]',
    attachments TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'published',
    scheduled_at DATETIME,
    is_deleted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Комментарии
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Лайки
CREATE TABLE likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(post_id, user_id)
);

-- Опросы
CREATE TABLE polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    multiple_choice BOOLEAN DEFAULT 0,
    allow_vote_changes BOOLEAN DEFAULT 1,
    anonymous_voting BOOLEAN DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Варианты опросов
CREATE TABLE poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id)
);

-- Голоса в опросах
CREATE TABLE poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id),
    FOREIGN KEY (option_id) REFERENCES poll_options(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Друзья
CREATE TABLE friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
);

-- Уведомления
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Сообщения
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT,
    media_url TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Организации
CREATE TABLE organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    type TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    address_city TEXT,
    address_street TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Участники организаций
CREATE TABLE organization_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    position TEXT,
    can_post BOOLEAN DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Избранное
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Жалобы
CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id)
);
```

---

## API Endpoints

### Посты

#### GET /api/posts
Получить ленту постов

**Query параметры:**
- `limit` - количество постов (default: 20)
- `page` - номер страницы (default: 1)
- `include_polls` - включить опросы (default: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "author_id": 5,
      "author_type": "user",
      "content": "Мой новый пост!",
      "attachments": [
        {
          "type": "image",
          "url": "/uploads/posts/photo.jpg"
        }
      ],
      "tags": ["потерян", "кошка"],
      "user": {
        "id": 5,
        "name": "Иван",
        "avatar": "/uploads/users/5/avatar.jpg"
      },
      "comments_count": 10,
      "created_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

#### POST /api/posts
Создать пост

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "content": "Мой новый пост!",
  "attached_pets": [1, 2],
  "attachments": [
    {
      "type": "image",
      "url": "/uploads/posts/photo.jpg"
    }
  ],
  "tags": ["потерян", "кошка"],
  "status": "published",
  "author_type": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "author_id": 5,
    "content": "Мой новый пост!",
    "created_at": "2025-01-17T10:00:00Z"
  }
}
```

#### PUT /api/posts/:id
Обновить пост

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "content": "Обновленный текст поста",
  "tags": ["найден"]
}
```

#### DELETE /api/posts/:id
Удалить пост

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Post deleted"
}
```

### Лайки

#### POST /api/posts/:id/like
Поставить/убрать лайк

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likes_count": 15
  }
}
```

#### GET /api/posts/:id/likers
Получить список лайкнувших

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 10,
      "name": "Иван",
      "avatar": "/uploads/users/10/avatar.jpg",
      "created_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

### Комментарии

#### GET /api/comments
Получить комментарии к посту

**Query параметры:**
- `post_id` - ID поста (обязательно)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "post_id": 1,
      "user_id": 10,
      "content": "Отличный пост!",
      "user": {
        "id": 10,
        "name": "Иван",
        "avatar": "/uploads/users/10/avatar.jpg"
      },
      "created_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

#### POST /api/comments
Добавить комментарий

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "post_id": 1,
  "content": "Отличный пост!"
}
```

#### DELETE /api/comments/:id
Удалить комментарий

**Headers:**
```
Authorization: Bearer <token>
```

### Друзья

#### GET /api/friends
Получить список друзей

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "name": "Иван",
      "avatar": "/uploads/users/10/avatar.jpg",
      "friends_since": "2025-01-10T10:00:00Z"
    }
  ]
}
```

#### GET /api/friends/requests
Получить входящие запросы в друзья

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 15,
      "name": "Петр",
      "avatar": "/uploads/users/15/avatar.jpg",
      "created_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

#### POST /api/friends/send
Отправить запрос в друзья

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "friend_id": 15
}
```

#### POST /api/friends/accept
Принять запрос в друзья

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "friend_id": 15
}
```

#### POST /api/friends/reject
Отклонить запрос

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "friend_id": 15
}
```

#### DELETE /api/friends/remove
Удалить из друзей

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "friend_id": 15
}
```

### Уведомления

#### GET /api/notifications
Получить уведомления

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "friend_request",
      "title": "Новый запрос в друзья",
      "message": "Иван хочет добавить вас в друзья",
      "link": "/profile/10",
      "is_read": false,
      "created_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

#### GET /api/notifications/unread
Получить количество непрочитанных

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

#### PUT /api/notifications/:id
Отметить как прочитанное

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /api/notifications/read-all
Отметить все как прочитанные

**Headers:**
```
Authorization: Bearer <token>
```

### Мессенджер

#### GET /api/chats
Получить список диалогов

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 10,
      "name": "Иван",
      "avatar": "/uploads/users/10/avatar.jpg",
      "last_message": "Привет!",
      "last_message_time": "2025-01-17T10:00:00Z",
      "unread_count": 2
    }
  ]
}
```

#### GET /api/chats/:userId
Получить историю с пользователем

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sender_id": 5,
      "receiver_id": 10,
      "content": "Привет!",
      "is_read": true,
      "created_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

#### POST /api/messages/send
Отправить сообщение

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "receiver_id": 10,
  "content": "Привет!"
}
```

#### POST /api/messages/send-media
Отправить медиа сообщение

**Headers:**
```
Authorization: Bearer <token>
```

**Request (multipart/form-data):**
```
receiver_id: 10
file: [binary]
```

### Организации

#### GET /api/organizations/all
Получить все организации

**Query параметры:**
- `type` - фильтр по типу (clinic, shelter, store)
- `city` - фильтр по городу
- `verified` - только верифицированные

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ветклиника Айболит",
      "short_name": "Айболит",
      "type": "clinic",
      "logo": "/uploads/organizations/1/logo.jpg",
      "address_city": "Москва",
      "phone": "+7 (495) 123-45-67",
      "verified": true
    }
  ]
}
```

#### GET /api/organizations/my
Получить мои организации

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ветклиника Айболит",
      "role": "owner",
      "position": "Главный врач"
    }
  ]
}
```

#### POST /api/organizations
Создать организацию

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Ветклиника Айболит",
  "short_name": "Айболит",
  "type": "clinic",
  "description": "Современная ветеринарная клиника",
  "address_city": "Москва",
  "address_street": "ул. Ленина, 10",
  "phone": "+7 (495) 123-45-67",
  "email": "info@aibolit.ru",
  "website": "https://aibolit.ru"
}
```

#### GET /api/organizations/:id
Получить организацию

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ветклиника Айболит",
    "type": "clinic",
    "description": "Современная ветеринарная клиника",
    "logo": "/uploads/organizations/1/logo.jpg",
    "address_city": "Москва",
    "phone": "+7 (495) 123-45-67",
    "verified": true,
    "members_count": 5
  }
}
```

#### GET /api/organizations/:id/members
Получить участников организации

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 5,
      "name": "Иван Иванов",
      "avatar": "/uploads/users/5/avatar.jpg",
      "role": "owner",
      "position": "Главный врач",
      "joined_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

#### POST /api/organizations/:id/members
Добавить участника

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "user_id": 10,
  "role": "admin",
  "position": "Ветеринар",
  "can_post": true
}
```

### Профиль

#### GET /api/profile
Получить свой профиль

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "email": "user@example.com",
    "name": "Иван",
    "last_name": "Иванов",
    "avatar": "/uploads/users/5/avatar.jpg",
    "cover_photo": "/uploads/users/5/cover.jpg",
    "bio": "Люблю животных",
    "location": "Москва",
    "phone": "+7 (999) 123-45-67"
  }
}
```

#### PUT /api/profile
Обновить профиль

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Иван",
  "last_name": "Иванов",
  "bio": "Обновленная биография",
  "location": "Санкт-Петербург",
  "phone": "+7 (999) 999-99-99"
}
```

#### GET /api/users/:id
Получить профиль пользователя

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Иван",
    "last_name": "Иванов",
    "avatar": "/uploads/users/5/avatar.jpg",
    "bio": "Люблю животных",
    "location": "Москва"
  }
}
```

### Медиа

#### POST /api/profile/avatar
Загрузить аватар

**Headers:**
```
Authorization: Bearer <token>
```

**Request (multipart/form-data):**
```
avatar: [binary]
```

#### POST /api/profile/cover
Загрузить обложку

**Headers:**
```
Authorization: Bearer <token>
```

**Request (multipart/form-data):**
```
cover: [binary]
```

### Избранное

#### GET /api/favorites
Получить избранных питомцев

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pet_id": 10,
      "pet_name": "Барсик",
      "pet_photo": "/uploads/pets/10.jpg",
      "added_at": "2025-01-17T10:00:00Z"
    }
  ]
}
```

#### POST /api/favorites
Добавить в избранное

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "pet_id": 10
}
```

#### DELETE /api/favorites/:id
Удалить из избранного

**Headers:**
```
Authorization: Bearer <token>
```

### Жалобы

#### POST /api/reports
Создать жалобу

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "target_type": "post",
  "target_id": 123,
  "reason": "spam",
  "description": "Рекламный спам"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully"
}
```

---

## Зависимости от других сервисов

- **Auth Service** - авторизация пользователей
- **PetBase Service** - данные о питомцах для постов

---

## Конфигурация

### .env
```bash
PORT=8000
DATABASE_URL=./database/main.db
AUTH_SERVICE_URL=http://localhost:7000
PETBASE_SERVICE_URL=http://localhost:8100
UPLOADS_DIR=../../uploads
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

---

## Запуск

```bash
cd main/backend
air
```

Frontend:
```bash
cd main/frontend
npm run dev
```

---

## Swagger документация

```
http://localhost:8000/swagger/index.html
```

---

**Дата обновления:** 17 января 2025
