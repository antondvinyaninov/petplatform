-- Миграция: Добавление геолокации к постам
-- Дата: 2026-02-03

-- Добавляем колонки для геолокации
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lon DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);

-- Создаём индекс для быстрого поиска по координатам
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_lat, location_lon);

-- Комментарии к колонкам
COMMENT ON COLUMN posts.location_lat IS 'Широта местоположения (например, 55.7558)';
COMMENT ON COLUMN posts.location_lon IS 'Долгота местоположения (например, 37.6173)';
COMMENT ON COLUMN posts.location_name IS 'Название места (например, "Москва, Красная площадь")';
