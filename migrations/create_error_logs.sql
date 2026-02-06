-- Создание таблицы для логирования ошибок
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    service VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    error_message TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_service ON error_logs(service);

-- Комментарии к таблице
COMMENT ON TABLE error_logs IS 'Логи ошибок для мониторинга системы';
COMMENT ON COLUMN error_logs.service IS 'Название сервиса: gateway, main-service, auth-service и т.д.';
COMMENT ON COLUMN error_logs.endpoint IS 'URL endpoint где произошла ошибка';
COMMENT ON COLUMN error_logs.method IS 'HTTP метод: GET, POST, PUT, DELETE';
COMMENT ON COLUMN error_logs.error_message IS 'Текст ошибки';

SELECT 'Таблица error_logs создана!' as result;
