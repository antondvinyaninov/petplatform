# Admin API Endpoints

Все admin endpoints требуют роль `admin` или `superadmin` и JWT токен.

## Базовый URL
- Development: `http://localhost/api/admin`
- Production: `https://gateway.zooplatforma.ru/api/admin`

## Аутентификация
Все запросы должны включать JWT токен:
```
Authorization: Bearer YOUR_JWT_TOKEN
```
или через cookie `auth_token`.

---

## 📊 Статистика активности

### GET /api/admin/activity/stats
Возвращает статистику активности пользователей.

**Response:**
```json
{
  "online_now": 5,
  "active_last_hour": 23,
  "active_last_24h": 156
}
```

---

## 👥 Пользователи

### GET /api/admin/users
Возвращает список всех пользователей (последние 100).

**Response:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван",
    "last_name": "Иванов",
    "avatar": "https://...",
    "verified": true,
    "created_at": "2026-01-15T10:30:00Z",
    "role": "user"
  }
]
```

### GET /api/admin/users/{id}
Возвращает полные данные пользователя по ID.

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Иван",
  "last_name": "Иванов",
  "bio": "Описание профиля",
  "phone": "+7 999 123-45-67",
  "location": "Москва",
  "avatar": "https://...",
  "cover_photo": "https://...",
  "profile_visibility": "public",
  "show_phone": "friends",
  "show_email": "nobody",
  "allow_messages": "public",
  "show_online": "yes",
  "verified": true,
  "role": "user",
  "created_at": "2026-01-15T10:30:00Z"
}
```

---

## ✅ Верификация

### POST /api/admin/verification/verify
Верифицирует пользователя.

**Request:**
```json
{
  "user_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "User verified successfully"
}
```

### POST /api/admin/verification/unverify
Снимает верификацию с пользователя.

**Request:**
```json
{
  "user_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "User verification removed successfully"
}
```

---

## 🎭 Роли

### GET /api/admin/roles/user/{id}
Возвращает все роли пользователя.

**Response:**
```json
[
  {
    "role": "admin",
    "is_active": true,
    "granted_at": "2026-01-20T15:00:00Z",
    "granted_by": 1
  },
  {
    "role": "user",
    "is_active": false,
    "granted_at": "2026-01-15T10:30:00Z",
    "granted_by": null
  }
]
```

### GET /api/admin/roles/available
Возвращает список доступных ролей.

**Response:**
```json
["user", "moderator", "admin", "superadmin"]
```

### POST /api/admin/roles/grant
Выдает роль пользователю (деактивирует предыдущие роли).

**Request:**
```json
{
  "user_id": 123,
  "role": "moderator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role granted successfully"
}
```

### POST /api/admin/roles/revoke
Отзывает роль у пользователя.

**Request:**
```json
{
  "user_id": 123,
  "role": "moderator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role revoked successfully"
}
```

---

## 🏢 Организации

### GET /api/organizations
Список всех организаций (публичный endpoint).

### GET /api/organizations/all
Альтернативный endpoint для списка организаций.

### GET /api/organizations/{id}
Данные организации по ID (публичный endpoint).

### GET /api/organizations/{id}/members
Участники организации (публичный endpoint).

---

## 📝 Посты

### GET /api/admin/posts
Список всех постов (проксируется на backend).

### DELETE /api/admin/posts/{id}
Удаляет пост по ID (проксируется на backend).

---

## 🐾 Питомцы

### GET /api/admin/pets/user/{id}
Возвращает всех питомцев пользователя (проксируется на backend).

---

## Примеры использования

### JavaScript (fetch)
```javascript
const response = await fetch('https://gateway.zooplatforma.ru/api/admin/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const users = await response.json();
```

### cURL
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway.zooplatforma.ru/api/admin/activity/stats
```

---

## Коды ошибок

- `401 Unauthorized` - Нет токена или токен невалидный
- `403 Forbidden` - Недостаточно прав (требуется admin/superadmin)
- `404 Not Found` - Ресурс не найден
- `500 Internal Server Error` - Ошибка сервера
