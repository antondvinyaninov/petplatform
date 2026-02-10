-- Добавляем колонки для места содержания
ALTER TABLE pets ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'home';
ALTER TABLE pets ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS location_cage VARCHAR(100);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS location_contact VARCHAR(255);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS location_phone VARCHAR(50);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS location_notes TEXT;

-- Добавляем колонку для здоровья
ALTER TABLE pets ADD COLUMN IF NOT EXISTS health_notes TEXT;

-- Комментарии к колонкам
COMMENT ON COLUMN pets.location_type IS 'Тип места содержания: home, shelter, foster, clinic, hotel, other';
COMMENT ON COLUMN pets.location_address IS 'Адрес места содержания';
COMMENT ON COLUMN pets.location_cage IS 'Номер вольера/комнаты';
COMMENT ON COLUMN pets.location_contact IS 'Контактное лицо на месте';
COMMENT ON COLUMN pets.location_phone IS 'Телефон контактного лица';
COMMENT ON COLUMN pets.location_notes IS 'Примечания о месте содержания';
COMMENT ON COLUMN pets.health_notes IS 'Заметки о здоровье: хронические заболевания, аллергии';

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_pets_location_type ON pets(location_type);
CREATE INDEX IF NOT EXISTS idx_pets_location_cage ON pets(location_cage);
