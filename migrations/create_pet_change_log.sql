-- Создание таблицы pet_change_log (история изменений)
CREATE TABLE IF NOT EXISTS pet_change_log (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    change_type VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_pet_change_log_pet_id ON pet_change_log(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_change_log_created_at ON pet_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_change_log_user_id ON pet_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_change_log_change_type ON pet_change_log(change_type);

-- Комментарии
COMMENT ON TABLE pet_change_log IS 'История всех изменений данных питомца';
COMMENT ON COLUMN pet_change_log.change_type IS 'Тип изменения: registration, update_general, update_identification, update_location, update_health, vaccination, treatment, medical_record, owner_change, status_change';
COMMENT ON COLUMN pet_change_log.description IS 'Человекочитаемое описание изменения для отображения в хронологии';
