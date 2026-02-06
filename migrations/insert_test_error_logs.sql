-- Тестовые данные для error_logs
INSERT INTO error_logs (service, endpoint, method, error_message, user_id, ip_address, user_agent, created_at)
VALUES 
('gateway', '/api/posts', 'GET', 'Database connection timeout', 1, '127.0.0.1', 'Mozilla/5.0', NOW() - INTERVAL '1 hour'),
('main-service', '/api/users/123', 'GET', 'User not found', NULL, '192.168.1.1', 'Mozilla/5.0', NOW() - INTERVAL '2 hours'),
('gateway', '/api/auth/login', 'POST', 'Invalid credentials', 2, '10.0.0.1', 'Chrome/120.0', NOW() - INTERVAL '3 hours'),
('main-service', '/api/posts/create', 'POST', 'Validation error: content is required', 1, '127.0.0.1', 'Safari/17.0', NOW() - INTERVAL '5 hours'),
('gateway', '/api/media/upload', 'POST', 'File size exceeds limit', 3, '172.16.0.1', 'Firefox/121.0', NOW() - INTERVAL '6 hours'),
('auth-service', '/api/auth/refresh', 'POST', 'Token expired', 1, '127.0.0.1', 'Mozilla/5.0', NOW() - INTERVAL '8 hours'),
('main-service', '/api/comments', 'POST', 'Rate limit exceeded', 2, '192.168.1.1', 'Chrome/120.0', NOW() - INTERVAL '10 hours'),
('gateway', '/api/organizations/456', 'GET', 'Organization not found', NULL, '10.0.0.1', 'Safari/17.0', NOW() - INTERVAL '12 hours'),
('main-service', '/api/pets/789', 'DELETE', 'Permission denied', 3, '172.16.0.1', 'Firefox/121.0', NOW() - INTERVAL '15 hours'),
('gateway', '/api/reports', 'POST', 'Database error: duplicate key', 1, '127.0.0.1', 'Mozilla/5.0', NOW() - INTERVAL '20 hours');

SELECT 'Тестовые ошибки добавлены! Всего: ' || COUNT(*) as result FROM error_logs;
