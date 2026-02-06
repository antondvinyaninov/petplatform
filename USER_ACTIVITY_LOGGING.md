# Система логирования активности пользователей

## Описание

Система логирования действий обычных пользователей для аналитики и мониторинга активности на платформе.

## Таблица user_activity_logs

```sql
CREATE TABLE user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Типы действий (action_type)

### Аутентификация
- `user_register` - регистрация нового пользователя
- `user_login` - вход в систему
- `user_logout` - выход из системы
- `password_reset_request` - запрос сброса пароля
- `password_reset_complete` - пароль изменен

### Контент
- `post_create` - создание поста
- `post_update` - редактирование поста
- `post_delete` - удаление поста
- `comment_create` - добавление комментария
- `comment_update` - редактирование комментария
- `comment_delete` - удаление комментария
- `post_like` - лайк поста
- `post_unlike` - снятие лайка
- `comment_like` - лайк комментария

### Социальные действия
- `friend_request_send` - отправка заявки в друзья
- `friend_request_accept` - принятие заявки
- `friend_request_reject` - отклонение заявки
- `friend_remove` - удаление из друзей
- `user_follow` - подписка на пользователя
- `user_unfollow` - отписка

### Профиль
- `profile_update` - обновление профиля
- `avatar_upload` - загрузка аватара
- `cover_photo_upload` - загрузка обложки

### Питомцы
- `pet_create` - добавление питомца
- `pet_update` - редактирование питомца
- `pet_delete` - удаление питомца

### Организации
- `organization_create` - создание организации
- `organization_update` - обновление организации
- `organization_follow` - подписка на организацию

### Модерация
- `report_create` - подача жалобы
- `favorite_add` - добавление в избранное
- `favorite_remove` - удаление из избранного

## Функция логирования

```go
LogUserActivity(userID, actionType, targetType, targetID, metadata, ipAddress, userAgent)
```

### Параметры:
- `userID` (int) - ID пользователя
- `actionType` (string) - тип действия
- `targetType` (string) - тип целевого объекта
- `targetID` (int) - ID целевого объекта
- `metadata` (map[string]interface{}) - дополнительные данные
- `ipAddress` (string) - IP адрес
- `userAgent` (string) - User-Agent браузера

### Примеры использования:

```go
// Регистрация
LogUserActivity(userID, "user_register", "user", userID, map[string]interface{}{
    "email": email,
    "registration_method": "email",
}, r.RemoteAddr, r.UserAgent())

// Создание поста
LogUserActivity(userID, "post_create", "post", postID, map[string]interface{}{
    "content_length": len(content),
    "has_media": len(attachments) > 0,
    "has_poll": hasPoll,
}, r.RemoteAddr, r.UserAgent())

// Комментарий
LogUserActivity(userID, "comment_create", "post", postID, map[string]interface{}{
    "comment_id": commentID,
    "content_length": len(content),
}, r.RemoteAddr, r.UserAgent())

// Лайк
LogUserActivity(userID, "post_like", "post", postID, nil, r.RemoteAddr, r.UserAgent())

// Подача жалобы
LogUserActivity(userID, "report_create", targetType, targetID, map[string]interface{}{
    "reason": reason,
    "report_id": reportID,
}, r.RemoteAddr, r.UserAgent())
```

## API Endpoints для админ-панели

### GET /api/admin/user-activity

Получение логов активности пользователей с фильтрами.

**Query параметры:**
- `user_id` - фильтр по пользователю
- `action_type` - фильтр по типу действия
- `date_from` - начальная дата (ISO 8601)
- `date_to` - конечная дата (ISO 8601)
- `limit` - количество записей (по умолчанию 100, максимум 1000)

**Пример запроса:**
```bash
GET /api/admin/user-activity?user_id=123&limit=50&action_type=post_create
```

**Ответ:**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "user_email": "user@example.com",
    "user_name": "John Doe",
    "action_type": "post_create",
    "target_type": "post",
    "target_id": 456,
    "metadata": "{\"content_length\": 150, \"has_media\": true}",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2026-02-07T10:30:00Z"
  }
]
```

### GET /api/admin/user-activity/stats

Статистика активности пользователей.

**Ответ:**
```json
{
  "total_actions": 15000,
  "actions_last_24h": 450,
  "actions_last_7days": 3200,
  "by_action_type": [
    {"action_type": "post_create", "count": 5000},
    {"action_type": "comment_create", "count": 3500},
    {"action_type": "post_like", "count": 2500}
  ],
  "most_active_users": [
    {"user_id": 123, "user_email": "user@example.com", "user_name": "John", "count": 250},
    {"user_id": 456, "user_email": "jane@example.com", "user_name": "Jane", "count": 180}
  ],
  "hourly_distribution": [
    {"hour": 0, "count": 10},
    {"hour": 1, "count": 5},
    {"hour": 9, "count": 150}
  ]
}
```

### GET /api/admin/user-activity/user/:id

История активности конкретного пользователя.

**Query параметры:**
- `limit` - количество записей (по умолчанию 100, максимум 1000)

**Пример запроса:**
```bash
GET /api/admin/user-activity/user/123?limit=50
```

**Ответ:**
```json
[
  {
    "id": 1,
    "action_type": "post_create",
    "target_type": "post",
    "target_id": 456,
    "metadata": "{\"content_length\": 150}",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0...",
    "created_at": "2026-02-07T10:30:00Z"
  }
]
```

## Metadata примеры

```json
{
  "content_length": 150,
  "has_media": true,
  "media_count": 3,
  "has_poll": false,
  "tags": ["собаки", "приют"],
  "location": "Москва",
  "updated_fields": ["name", "bio", "avatar"]
}
```

## Особенности

- **Асинхронное логирование** - не блокирует основные операции
- **Индексы** - оптимизированы запросы по user_id, created_at, action_type
- **JSONB metadata** - гибкое хранение дополнительных данных с поддержкой GIN индекса
- **Безопасность** - не логируются чувствительные данные (пароли, токены)
- **User-Agent** - помогает выявить ботов и автоматизированную активность

## TTL (Time To Live)

Рекомендуется настроить автоматическое удаление старых логов:

```sql
-- Удаление логов старше 90 дней (запускать по расписанию)
DELETE FROM user_activity_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Мониторинг

Используйте статистику для:
- Выявления подозрительной активности (спам, боты)
- Анализа популярных функций
- Определения пиковых часов нагрузки
- Отслеживания активности конкретных пользователей
