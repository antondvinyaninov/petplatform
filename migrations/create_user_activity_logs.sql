-- Создание таблицы для логирования активности пользователей
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON user_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_metadata ON user_activity_logs USING gin(metadata);

-- Комментарии к таблице
COMMENT ON TABLE user_activity_logs IS 'Логи активности пользователей для аналитики и мониторинга';
COMMENT ON COLUMN user_activity_logs.action_type IS 'Тип действия: user_register, user_login, post_create, comment_create и т.д.';
COMMENT ON COLUMN user_activity_logs.target_type IS 'Тип целевого объекта: user, post, comment, organization и т.д.';
COMMENT ON COLUMN user_activity_logs.target_id IS 'ID целевого объекта';
COMMENT ON COLUMN user_activity_logs.metadata IS 'Дополнительные данные в формате JSON';
