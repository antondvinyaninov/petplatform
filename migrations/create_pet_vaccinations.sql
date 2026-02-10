-- Создание таблицы pet_vaccinations (прививки)
CREATE TABLE IF NOT EXISTS pet_vaccinations (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    vaccine_name VARCHAR(255) NOT NULL,
    vaccine_type VARCHAR(50) NOT NULL,
    next_date DATE,
    veterinarian VARCHAR(255),
    clinic VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_date ON pet_vaccinations(date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_next_date ON pet_vaccinations(next_date);
CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_type ON pet_vaccinations(vaccine_type);

-- Комментарии
COMMENT ON TABLE pet_vaccinations IS 'Прививки питомцев';
COMMENT ON COLUMN pet_vaccinations.vaccine_type IS 'Тип вакцины: rabies, distemper, parvovirus, hepatitis, leptospirosis, complex, other';
COMMENT ON COLUMN pet_vaccinations.next_date IS 'Дата следующей прививки';
