-- ============================================
-- Скрипт добавления индексов для оптимизации
-- База данных: PostgreSQL
-- Дата: 2026-02-04
-- ============================================

-- Начинаем транзакцию
BEGIN;

-- ============================================
-- USERS - пользователи
-- ============================================
-- Уже есть: users_pkey, idx_users_email, idx_users_created_at

-- Индекс для поиска по имени (для автокомплита, поиска друзей)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Индекс для поиска по имени и фамилии (полнотекстовый поиск)
CREATE INDEX IF NOT EXISTS idx_users_fullname ON users(name, last_name);

-- Индекс для фильтрации по verified статусу
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified) WHERE verified = true;


-- ============================================
-- USER_ACTIVITY - активность пользователей
-- ============================================
-- Уже есть: user_activity_pkey, user_activity_user_id_key

-- Индекс для сортировки по последней активности
CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen_all ON user_activity(last_seen DESC);


-- ============================================
-- POSTS - посты
-- ============================================
-- Уже есть: posts_pkey, idx_posts_user_id, idx_posts_created_at, idx_posts_author, 
--           idx_posts_status, idx_posts_is_deleted, idx_posts_location

-- Составной индекс для фильтрации постов (не удаленные, по дате)
CREATE INDEX IF NOT EXISTS idx_posts_active_created ON posts(created_at DESC) 
WHERE is_deleted = false;

-- Индекс для постов конкретного автора (не удаленные)
CREATE INDEX IF NOT EXISTS idx_posts_author_active ON posts(author_id, author_type, created_at DESC) 
WHERE is_deleted = false;

-- Индекс для постов с геолокацией
CREATE INDEX IF NOT EXISTS idx_posts_with_location ON posts(location_lat, location_lon) 
WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;


-- ============================================
-- COMMENTS - комментарии
-- ============================================
-- Уже есть: comments_pkey, idx_comments_post_id, idx_comments_user_id

-- Составной индекс для загрузки комментариев поста (по дате)
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);

-- Индекс для ответов на комментарии
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;


-- ============================================
-- LIKES - лайки
-- ============================================
-- Уже есть: likes_pkey, idx_likes_post_id, idx_likes_user_id, likes_user_id_post_id_key

-- Составной индекс для подсчета лайков поста
CREATE INDEX IF NOT EXISTS idx_likes_post_count ON likes(post_id);


-- ============================================
-- MESSAGES - сообщения
-- ============================================
-- Уже есть: messages_pkey, idx_messages_chat_id, idx_messages_receiver_id, 
--           idx_messages_created_at, idx_messages_is_read

-- Составной индекс для загрузки сообщений чата (по дате)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at ASC);

-- Индекс для непрочитанных сообщений пользователя
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) 
WHERE is_read = false;

-- Индекс для отправителя (для загрузки данных отправителя)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);


-- ============================================
-- MESSAGE_ATTACHMENTS - вложения сообщений
-- ============================================
-- Уже есть: message_attachments_pkey, idx_message_attachments_message_id

-- Составной индекс для загрузки вложений по типу
CREATE INDEX IF NOT EXISTS idx_message_attachments_type ON message_attachments(message_id, file_type);


-- ============================================
-- CHATS - чаты
-- ============================================
-- Уже есть: chats_pkey, idx_chats_user1_id, idx_chats_user2_id, chats_user1_id_user2_id_key

-- Индекс для сортировки чатов по последнему сообщению
CREATE INDEX IF NOT EXISTS idx_chats_last_message ON chats(last_message_at DESC NULLS LAST);

-- Составной индекс для поиска чата пользователя
CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(user1_id, user2_id);


-- ============================================
-- FRIENDSHIPS - дружба
-- ============================================
-- Уже есть: friendships_pkey, idx_friendships_user_id, idx_friendships_friend_id, 
--           idx_friendships_status, friendships_user_id_friend_id_key

-- Составной индекс для загрузки друзей пользователя (принятые заявки)
CREATE INDEX IF NOT EXISTS idx_friendships_user_accepted ON friendships(user_id, status) 
WHERE status = 'accepted';

-- Составной индекс для входящих заявок
CREATE INDEX IF NOT EXISTS idx_friendships_friend_pending ON friendships(friend_id, status) 
WHERE status = 'pending';


-- ============================================
-- NOTIFICATIONS - уведомления
-- ============================================
-- Уже есть: notifications_pkey, idx_notifications_user_id, idx_notifications_is_read, 
--           idx_notifications_created_at, idx_notifications_user_unread

-- Составной индекс для загрузки уведомлений пользователя (по дате)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Индекс для непрочитанных уведомлений
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;


-- ============================================
-- ORGANIZATIONS - организации
-- ============================================
-- Уже есть: organizations_pkey, idx_organizations_type, idx_organizations_city

-- Индекс для поиска по названию организации
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- Составной индекс для фильтрации по типу и городу
CREATE INDEX IF NOT EXISTS idx_organizations_type_city ON organizations(type, city);

-- Индекс для верифицированных организаций
CREATE INDEX IF NOT EXISTS idx_organizations_verified ON organizations(is_verified) WHERE is_verified = true;


-- ============================================
-- ORGANIZATION_MEMBERS - члены организаций
-- ============================================
-- Уже есть: organization_members_pkey, idx_org_members_org_id, idx_org_members_user_id, 
--           organization_members_organization_id_user_id_key

-- Составной индекс для проверки роли пользователя в организации
CREATE INDEX IF NOT EXISTS idx_org_members_user_role ON organization_members(user_id, organization_id, role);

-- Индекс для поиска администраторов организации
CREATE INDEX IF NOT EXISTS idx_org_members_admins ON organization_members(organization_id, role) 
WHERE role IN ('owner', 'admin', 'moderator');


-- ============================================
-- PETS - питомцы
-- ============================================
-- Уже есть: pets_pkey, idx_pets_user_id, idx_pets_curator_id

-- Индекс для поиска по имени питомца
CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name);

-- Индекс для поиска по виду
CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);


-- ============================================
-- POLLS - опросы
-- ============================================
-- Уже есть: polls_pkey, idx_polls_post_id

-- Индекс для сортировки по дате окончания
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at);


-- ============================================
-- POLL_VOTES - голоса в опросах
-- ============================================
-- Уже есть: poll_votes_pkey, idx_poll_votes_poll_id, idx_poll_votes_option_id, 
--           idx_poll_votes_user_id, poll_votes_poll_id_option_id_user_id_key

-- Составной индекс для подсчета голосов по опции
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_count ON poll_votes(option_id);


-- ============================================
-- FAVORITES - избранное
-- ============================================
-- Уже есть: favorites_pkey

-- Индекс для загрузки избранного пользователя
CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON favorites(user_id, created_at DESC);

-- Индекс для избранных постов
CREATE INDEX IF NOT EXISTS idx_favorites_user_post ON favorites(user_id, post_id) WHERE post_id IS NOT NULL;

-- Индекс для избранных питомцев
CREATE INDEX IF NOT EXISTS idx_favorites_user_pet ON favorites(user_id, pet_id) WHERE pet_id IS NOT NULL;


-- ============================================
-- USER_MEDIA - медиафайлы пользователей
-- ============================================
-- Уже есть: user_media_pkey, idx_user_media_user_id, idx_user_media_type, idx_user_media_uploaded

-- Составной индекс для загрузки медиа пользователя по типу
CREATE INDEX IF NOT EXISTS idx_user_media_user_type_uploaded ON user_media(user_id, media_type, uploaded_at DESC);


-- Завершаем транзакцию
COMMIT;

-- ============================================
-- Анализ таблиц для обновления статистики
-- ============================================
ANALYZE users;
ANALYZE user_activity;
ANALYZE posts;
ANALYZE comments;
ANALYZE likes;
ANALYZE messages;
ANALYZE message_attachments;
ANALYZE chats;
ANALYZE friendships;
ANALYZE notifications;
ANALYZE organizations;
ANALYZE organization_members;
ANALYZE pets;
ANALYZE polls;
ANALYZE poll_votes;
ANALYZE favorites;
ANALYZE user_media;

-- ============================================
-- Готово!
-- ============================================
