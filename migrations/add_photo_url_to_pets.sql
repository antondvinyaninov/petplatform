-- Добавление поля photo_url в таблицу pets
-- Дата: 10.02.2026

-- Проверяем существует ли колонка photo_url
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pets' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE pets ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Column photo_url added to pets table';
    ELSE
        RAISE NOTICE 'Column photo_url already exists in pets table';
    END IF;
END $$;

-- Создаем индекс для быстрого поиска питомцев с фото
CREATE INDEX IF NOT EXISTS idx_pets_photo_url ON pets(photo_url) WHERE photo_url IS NOT NULL;

COMMENT ON COLUMN pets.photo_url IS 'URL фотографии питомца в S3 хранилище';
