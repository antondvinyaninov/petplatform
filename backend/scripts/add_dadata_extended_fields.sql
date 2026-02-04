-- Добавление расширенных полей от DaData
-- Дата: 2026-02-04

BEGIN;

-- Статус организации
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state_status TEXT; -- ACTIVE, LIQUIDATING, LIQUIDATED, REORGANIZING
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state_liquidation_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state_registration_date DATE;

-- Финансовая информация
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS capital BIGINT; -- Уставный капитал
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_count INTEGER; -- Количество сотрудников

-- ОКВЭД (виды деятельности)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okved TEXT; -- Основной ОКВЭД
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okved_type TEXT; -- Тип ОКВЭД (2001, 2014)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okveds JSONB; -- Все ОКВЭД в формате JSON

-- Дополнительные реквизиты
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okpo TEXT; -- ОКПО
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS oktmo TEXT; -- ОКТМО
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okato TEXT; -- ОКАТО
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okogu TEXT; -- ОКОГУ
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okfs TEXT; -- ОКФС (форма собственности)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okopf TEXT; -- ОКОПФ (организационно-правовая форма)

-- Налоговая информация
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_system TEXT; -- Система налогообложения
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS finance_income BIGINT; -- Доход
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS finance_expense BIGINT; -- Расход
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS finance_year INTEGER; -- Год финансовых данных

-- Дополнительная информация
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branch_type TEXT; -- Тип подразделения (MAIN, BRANCH)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branch_count INTEGER; -- Количество филиалов
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founders JSONB; -- Учредители в формате JSON
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS managers JSONB; -- Руководители в формате JSON
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS predecessors JSONB; -- Предшественники в формате JSON
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS successors JSONB; -- Правопреемники в формате JSON

-- Лицензии и разрешения
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS licenses JSONB; -- Лицензии в формате JSON

-- Дополнительные контакты
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS emails_json JSONB; -- Все email в формате JSON
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phones_json JSONB; -- Все телефоны в формате JSON

-- Индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_organizations_state_status ON organizations(state_status);
CREATE INDEX IF NOT EXISTS idx_organizations_okved ON organizations(okved);
CREATE INDEX IF NOT EXISTS idx_organizations_okpo ON organizations(okpo);
CREATE INDEX IF NOT EXISTS idx_organizations_employee_count ON organizations(employee_count) WHERE employee_count IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_branch_type ON organizations(branch_type);

-- GIN индексы для JSONB полей (для быстрого поиска внутри JSON)
CREATE INDEX IF NOT EXISTS idx_organizations_okveds_gin ON organizations USING GIN (okveds);
CREATE INDEX IF NOT EXISTS idx_organizations_founders_gin ON organizations USING GIN (founders);
CREATE INDEX IF NOT EXISTS idx_organizations_licenses_gin ON organizations USING GIN (licenses);

COMMIT;

-- Анализ таблицы
ANALYZE organizations;

-- Комментарии к полям
COMMENT ON COLUMN organizations.state_status IS 'Статус организации: ACTIVE, LIQUIDATING, LIQUIDATED, REORGANIZING';
COMMENT ON COLUMN organizations.okved IS 'Основной код ОКВЭД';
COMMENT ON COLUMN organizations.okveds IS 'Все коды ОКВЭД в формате JSON';
COMMENT ON COLUMN organizations.capital IS 'Уставный капитал в рублях';
COMMENT ON COLUMN organizations.employee_count IS 'Количество сотрудников';
COMMENT ON COLUMN organizations.branch_type IS 'Тип подразделения: MAIN (головная), BRANCH (филиал)';
COMMENT ON COLUMN organizations.founders IS 'Учредители в формате JSON';
COMMENT ON COLUMN organizations.managers IS 'Руководители в формате JSON';
COMMENT ON COLUMN organizations.licenses IS 'Лицензии в формате JSON';
