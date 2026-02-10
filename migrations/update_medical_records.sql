-- Расширение таблицы medical_records
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(50) DEFAULT 'examination';
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON medical_records(record_type);

-- Комментарии
COMMENT ON COLUMN medical_records.record_type IS 'Тип записи: examination, surgery, analysis, treatment, injury, other';
