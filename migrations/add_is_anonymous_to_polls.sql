-- Добавляем колонку is_anonymous в таблицу polls
-- Используется для настройки "Анонимное голосование"
-- Когда включена, скрываются имена проголосовавших пользователей

ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Комментарий к колонке
COMMENT ON COLUMN polls.is_anonymous IS 'Анонимное голосование - скрывает имена проголосовавших';
