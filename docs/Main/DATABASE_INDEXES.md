# Индексы базы данных PostgreSQL

**Дата создания:** 2026-02-04  
**База данных:** zp-db (PostgreSQL)  
**Всего индексов:** 145

## Зачем нужны индексы?

Индексы ускоряют выполнение запросов к базе данных, особенно критично для удаленной БД где каждый запрос имеет latency ~200ms.

**Пример:**
- Без индекса: поиск пользователя по email = полное сканирование таблицы (медленно)
- С индексом: поиск по индексу = мгновенно

## Добавленные индексы (2026-02-04)

### USERS - пользователи
```sql
-- Поиск по имени (автокомплит, поиск друзей)
CREATE INDEX idx_users_name ON users(name);

-- Поиск по имени и фамилии
CREATE INDEX idx_users_fullname ON users(name, last_name);

-- Фильтрация верифицированных пользователей
CREATE INDEX idx_users_verified ON users(verified) WHERE verified = true;
```

### USER_ACTIVITY - активность пользователей
```sql
-- Сортировка по последней активности (онлайн статус)
CREATE INDEX idx_user_activity_last_seen_all ON user_activity(last_seen DESC);
```

### POSTS - посты
```sql
-- Фильтрация активных постов по дате
CREATE INDEX idx_posts_active_created ON posts(created_at DESC) 
WHERE is_deleted = false;

-- Посты конкретного автора (не удаленные)
CREATE INDEX idx_posts_author_active ON posts(author_id, author_type, created_at DESC) 
WHERE is_deleted = false;

-- Посты с геолокацией
CREATE INDEX idx_posts_with_location ON posts(location_lat, location_lon) 
WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;
```

### COMMENTS - комментарии
```sql
-- Загрузка комментариев поста по дате
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at ASC);

-- Ответы на комментарии
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
```

### LIKES - лайки
```sql
-- Подсчет лайков поста
CREATE INDEX idx_likes_post_count ON likes(post_id);
```

### MESSAGES - сообщения
```sql
-- Загрузка сообщений чата по дате
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at ASC);

-- Непрочитанные сообщения пользователя
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read) 
WHERE is_read = false;

-- Отправитель сообщения
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
```

### MESSAGE_ATTACHMENTS - вложения сообщений
```sql
-- Загрузка вложений по типу
CREATE INDEX idx_message_attachments_type ON message_attachments(message_id, file_type);
```

### CHATS - чаты
```sql
-- Сортировка чатов по последнему сообщению
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC NULLS LAST);

-- Поиск чата пользователя
CREATE INDEX idx_chats_users ON chats(user1_id, user2_id);
```

### FRIENDSHIPS - дружба
```sql
-- Загрузка друзей пользователя (принятые заявки)
CREATE INDEX idx_friendships_user_accepted ON friendships(user_id, status) 
WHERE status = 'accepted';

-- Входящие заявки в друзья
CREATE INDEX idx_friendships_friend_pending ON friendships(friend_id, status) 
WHERE status = 'pending';
```

### NOTIFICATIONS - уведомления
```sql
-- Загрузка уведомлений пользователя по дате
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Непрочитанные уведомления
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;
```

### ORGANIZATIONS - организации
```sql
-- Поиск по названию организации
CREATE INDEX idx_organizations_name ON organizations(name);

-- Фильтрация по типу и городу
CREATE INDEX idx_organizations_type_city ON organizations(type, city);

-- Верифицированные организации
CREATE INDEX idx_organizations_verified ON organizations(is_verified) 
WHERE is_verified = true;
```

### ORGANIZATION_MEMBERS - члены организаций
```sql
-- Проверка роли пользователя в организации
CREATE INDEX idx_org_members_user_role ON organization_members(user_id, organization_id, role);

-- Поиск администраторов организации
CREATE INDEX idx_org_members_admins ON organization_members(organization_id, role) 
WHERE role IN ('owner', 'admin', 'moderator');
```

### PETS - питомцы
```sql
-- Поиск по имени питомца
CREATE INDEX idx_pets_name ON pets(name);

-- Поиск по виду
CREATE INDEX idx_pets_species ON pets(species);
```

### POLLS - опросы
```sql
-- Сортировка по дате окончания
CREATE INDEX idx_polls_expires_at ON polls(expires_at);
```

### POLL_VOTES - голоса в опросах
```sql
-- Подсчет голосов по опции
CREATE INDEX idx_poll_votes_option_count ON poll_votes(option_id);
```

### FAVORITES - избранное
```sql
-- Загрузка избранного пользователя
CREATE INDEX idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- Избранные посты
CREATE INDEX idx_favorites_user_post ON favorites(user_id, post_id) 
WHERE post_id IS NOT NULL;

-- Избранные питомцы
CREATE INDEX idx_favorites_user_pet ON favorites(user_id, pet_id) 
WHERE pet_id IS NOT NULL;
```

### USER_MEDIA - медиафайлы пользователей
```sql
-- Загрузка медиа пользователя по типу
CREATE INDEX idx_user_media_user_type_uploaded ON user_media(user_id, media_type, uploaded_at DESC);
```

## Результаты оптимизации

### Мессенджер (GetChatMessagesHandler)

**До оптимизации:**
- Время загрузки: 4.6 секунды
- Проблема: N+1 запросы (21 запрос для 10 сообщений)

**После оптимизации кода + индексы:**
- Время загрузки: 0.7 секунды
- Ускорение: **в 6.5 раз!**
- Запросов: 3 (вместо 21)

**Детальная разбивка:**
```
Query execution (with access check): 240ms
Loading 2 unique senders:           223ms
Loading attachments:                 238ms
Assigning data:                      0.001ms
────────────────────────────────────────
TOTAL:                               701ms
```

## Как применить индексы

Скрипт находится в `backend/scripts/add_indexes.sql`

```bash
# Применить индексы
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
psql "postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db" -f backend/scripts/add_indexes.sql
```

## Мониторинг индексов

### Посмотреть все индексы
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Посмотреть размер индексов
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

### Неиспользуемые индексы
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

## Рекомендации

1. **Регулярно анализируйте таблицы** после больших изменений:
   ```sql
   ANALYZE users;
   ANALYZE posts;
   ANALYZE messages;
   ```

2. **Мониторьте медленные запросы** в логах PostgreSQL

3. **Проверяйте использование индексов** с помощью `EXPLAIN ANALYZE`

4. **Удаляйте неиспользуемые индексы** - они замедляют INSERT/UPDATE

## История изменений

### 2026-02-04
- ✅ Добавлено 33 новых индекса
- ✅ Оптимизирован мессенджер (6.5x быстрее)
- ✅ Установлен PostgreSQL клиент на macOS
- ✅ Создан скрипт `add_indexes.sql`

---

**Автор:** AI Assistant  
**Дата обновления:** 2026-02-04
