-- Проверка структуры таблицы polls
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'polls'
ORDER BY ordinal_position;

-- Проверка структуры таблицы poll_options
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'poll_options'
ORDER BY ordinal_position;

-- Проверка структуры таблицы poll_votes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'poll_votes'
ORDER BY ordinal_position;
