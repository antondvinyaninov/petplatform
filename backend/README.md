# Admin Backend API

Backend для админ-панели ЗооПлатформы. Работает через Gateway API.

## Архитектура

```
Admin Frontend (4000) → Admin Backend (9000) → Gateway (80) → Main Service / Other Services
```

Admin Backend не имеет прямого доступа к БД, все запросы проксируются через Gateway.

## Установка

```bash
cd backend
go mod download
```

## Конфигурация

Скопируйте `.env.example` в `.env` и настройте:

```bash
cp .env.example .env
```

Важные параметры:
- `GATEWAY_URL` - URL gateway (по умолчанию http://localhost:80)
- `JWT_SECRET` - должен совпадать с секретом в gateway!
- `PORT` - порт для API (по умолчанию 9000)
- `CORS_ORIGINS` - разрешенные origins для CORS

## Запуск

### Разработка

```bash
go run main.go
```

### Production

```bash
go build -o admin-api
./admin-api
```

## API Endpoints

### Публичные

- `GET /` - информация о сервисе
- `GET /api/admin/health` - health check

### Авторизация

- `GET /api/admin/auth/me` - получить текущего пользователя
- `POST /api/admin/auth/logout` - выход

### Пользователи (требуется superadmin)

- `GET /api/admin/users` - список пользователей
- `GET /api/admin/users/{id}` - данные пользователя
- `PUT /api/admin/users/{id}` - обновить пользователя
- `DELETE /api/admin/users/{id}` - удалить пользователя

### Посты (требуется superadmin)

- `GET /api/admin/posts` - список постов
- `GET /api/admin/posts/{id}` - данные поста
- `PUT /api/admin/posts/{id}` - обновить пост
- `DELETE /api/admin/posts/{id}` - удалить пост

### Организации (требуется superadmin)

- `GET /api/admin/organizations` - список организаций
- `PUT /api/admin/organizations/{id}/verify` - верифицировать/отклонить
- `GET /api/admin/organizations/stats` - статистика

### Статистика (требуется superadmin)

- `GET /api/admin/stats/overview` - общая статистика

### Логи (требуется superadmin)

- `GET /api/admin/logs` - логи администраторов

### Мониторинг (требуется superadmin)

- `GET /api/admin/monitoring/errors` - последние ошибки
- `GET /api/admin/monitoring/metrics` - системные метрики
- `GET /api/admin/monitoring/error-stats` - статистика ошибок

### Модерация (требуется superadmin)

- `GET /api/admin/moderation/reports` - список жалоб
- `PUT /api/admin/moderation/reports/{id}` - рассмотреть жалобу
- `GET /api/admin/moderation/stats` - статистика модерации

### Health Check (требуется superadmin)

- `GET /api/admin/health/services` - статус всех сервисов

## Авторизация

Используется SSO через cookie `auth_token` от Gateway.

1. Пользователь авторизуется через Gateway (`/api/auth/login`)
2. Gateway устанавливает cookie `auth_token`
3. Admin Backend проверяет токен локально (JWT)
4. Проверяется наличие роли `superadmin`
5. Запросы проксируются в Gateway с оригинальным токеном

## Middleware

### AuthMiddleware

Проверяет наличие и валидность JWT токена из cookie `auth_token`.

### SuperAdminMiddleware

Проверяет наличие роли `superadmin` у пользователя.

## Gateway Client

Все запросы к данным проксируются через Gateway:

```go
client := middleware.NewGatewayClient(authToken)
data, err := client.Get("/api/users")
```

Методы:
- `Get(endpoint)` - GET запрос
- `Post(endpoint, data)` - POST запрос
- `Put(endpoint, data)` - PUT запрос
- `Delete(endpoint)` - DELETE запрос

## Разработка

### Структура проекта

```
backend/
├── main.go              # Точка входа, роутинг
├── middleware/
│   ├── auth.go          # JWT авторизация
│   └── gateway.go       # HTTP клиент для Gateway
└── handlers/
    ├── auth.go          # Авторизация
    ├── users.go         # Управление пользователями
    ├── posts.go         # Управление постами
    ├── organizations.go # Управление организациями
    ├── stats.go         # Статистика
    ├── logs.go          # Логи
    ├── monitoring.go    # Мониторинг
    ├── moderation.go    # Модерация
    ├── health.go        # Health checks
    └── utils.go         # Утилиты
```

### Добавление нового endpoint

1. Создайте handler в `handlers/`
2. Добавьте роут в `main.go`
3. Используйте `getGatewayClient()` для запросов к Gateway
4. Используйте `proxyGatewayResponse()` для ответа

Пример:

```go
func MyHandler(w http.ResponseWriter, r *http.Request) {
    client, err := getGatewayClient(r)
    if err != nil {
        sendError(w, "Не авторизован", http.StatusUnauthorized)
        return
    }
    
    data, err := client.Get("/api/my-endpoint")
    proxyGatewayResponse(w, data, err)
}
```

## Зависимости

- `github.com/gorilla/mux` - роутинг
- `github.com/golang-jwt/jwt/v5` - JWT токены
- `github.com/joho/godotenv` - .env файлы

## Troubleshooting

### Ошибка "JWT_SECRET not set"

Убедитесь что в `.env` установлен `JWT_SECRET` и он совпадает с Gateway.

### Ошибка "Не авторизован"

1. Проверьте что cookie `auth_token` установлен
2. Проверьте что токен валиден
3. Проверьте что `JWT_SECRET` совпадает с Gateway

### Ошибка "Доступ запрещен"

Убедитесь что у пользователя есть роль `superadmin`.

### Gateway недоступен

Проверьте что Gateway запущен и доступен по адресу из `GATEWAY_URL`.
