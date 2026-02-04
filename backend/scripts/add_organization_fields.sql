-- Добавление полей для организаций (данные от DaData)
-- Дата: 2026-02-04

BEGIN;

-- Юридическая информация
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_form TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS inn TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ogrn TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kpp TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_date DATE;

-- Детальный адрес
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_full TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_house TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_office TEXT;

-- Геолокация
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS geo_lat DECIMAL(10, 8);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS geo_lon DECIMAL(11, 8);

-- Руководство
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS director_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS director_position TEXT;

-- Владелец (пользователь который создал организацию)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Статус (для будущего использования)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Настройки приватности
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS show_phone TEXT DEFAULT 'everyone';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS show_email TEXT DEFAULT 'everyone';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allow_messages TEXT DEFAULT 'everyone';

-- Индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_organizations_inn ON organizations(inn);
CREATE INDEX IF NOT EXISTS idx_organizations_ogrn ON organizations(ogrn);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_geo ON organizations(geo_lat, geo_lon) WHERE geo_lat IS NOT NULL AND geo_lon IS NOT NULL;

COMMIT;

-- Анализ таблицы
ANALYZE organizations;
