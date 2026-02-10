-- Создание таблицы pet_treatments (обработки)
CREATE TABLE IF NOT EXISTS pet_treatments (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    treatment_type VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    next_date DATE,
    dosage VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_pet_treatments_pet_id ON pet_treatments(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_treatments_date ON pet_treatments(date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_treatments_next_date ON pet_treatments(next_date);
CREATE INDEX IF NOT EXISTS idx_pet_treatments_type ON pet_treatments(treatment_type);

-- Комментарии
COMMENT ON TABLE pet_treatments IS 'Обработки питомцев (дегельминтизация, от блох и клещей и т.д.)';
COMMENT ON COLUMN pet_treatments.treatment_type IS 'Тип обработки: deworming, flea_tick, ear_cleaning, teeth_cleaning, grooming, other';
COMMENT ON COLUMN pet_treatments.next_date IS 'Дата следующей обработки';
