-- Тестовые данные для user_activity_logs
-- Вставляем несколько примеров разных действий

-- Регистрация пользователя
INSERT INTO user_activity_logs (user_id, action_type, target_type, target_id, metadata, ip_address, user_agent, created_at)
VALUES 
(1, 'user_register', 'user', 1, '{"email": "test@example.com", "registration_method": "email"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 days'),

-- Вход в систему
(1, 'user_login', 'user', 1, '{"email": "test@example.com", "role": "user"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 days'),

-- Создание поста
(1, 'post_create', 'post', 1, '{"content_length": 150, "has_media": true, "media_count": 2}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1 day'),

-- Комментарий
(1, 'comment_create', 'post', 1, '{"comment_id": 1, "content_length": 50}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1 day'),

-- Лайк поста
(1, 'post_like', 'post', 1, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '12 hours'),

-- Обновление профиля
(1, 'profile_update', 'user', 1, '{"updated_fields": ["name", "bio", "avatar"]}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '6 hours'),

-- Создание питомца
(1, 'pet_create', 'pet', 1, '{"species": "dog", "name": "Бобик"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '3 hours'),

-- Подписка на пользователя
(1, 'user_follow', 'user', 2, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 hours'),

-- Добавление в избранное
(1, 'favorite_add', 'post', 2, NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1 hour'),

-- Подача жалобы
(1, 'report_create', 'post', 3, '{"reason": "spam", "report_id": 1}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '30 minutes');

SELECT 'Тестовые данные добавлены! Всего записей: ' || COUNT(*) as result FROM user_activity_logs;
