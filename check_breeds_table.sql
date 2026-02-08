-- Проверка существования таблицы breeds
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'breeds'
ORDER BY ordinal_position;

-- Проверка количества записей
SELECT COUNT(*) as total_breeds FROM breeds;

-- Примеры записей
SELECT id, name, species_id, description 
FROM breeds 
LIMIT 5;
