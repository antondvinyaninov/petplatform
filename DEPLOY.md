# Инструкция по деплою Gateway

## Easypanel Deploy

### 1. Создайте новый сервис в Easypanel

1. Откройте Easypanel
2. Создайте новый проект или используйте существующий
3. Добавьте новый сервис типа "App"
4. Выберите "Build from source" или "Docker"

### 2. Настройте переменные окружения

В настройках сервиса добавьте следующие переменные:

```bash
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
GATEWAY_PORT=80
ENVIRONMENT=production
DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable
MAIN_SERVICE_URL=http://my-projects-zooplatforma:80
TELEGRAM_BOT_TOKEN=8206442500:AAFWYIMDy-i7-PC7cQwPmK_dRoATVU9YLEs
TELEGRAM_CHAT_ID=273773467
```

### 3. Настройте домен

1. В настройках сервиса добавьте домен:
   - `my-projects-gateway-zp.crv1ic.easypanel.host`
2. Easypanel автоматически настроит SSL сертификат

### 4. Deploy

1. Загрузите код в репозиторий или используйте Dockerfile
2. Easypanel автоматически соберет и запустит контейнер
3. Проверьте логи на наличие ошибок

### 5. Проверка

```bash
# Health check
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health

# Регистрация
curl -X POST https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Тест",
    "last_name": "Тестов"
  }'

# Логин
curl -X POST https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Docker Deploy (альтернатива)

### 1. Соберите образ

```bash
docker build -t gateway .
```

### 2. Запустите контейнер

```bash
docker run -d \
  --name gateway \
  -p 80:80 \
  -e JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE= \
  -e GATEWAY_PORT=80 \
  -e ENVIRONMENT=production \
  -e DATABASE_URL=postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable \
  -e MAIN_SERVICE_URL=http://my-projects-zooplatforma:80 \
  -e TELEGRAM_BOT_TOKEN=8206442500:AAFWYIMDy-i7-PC7cQwPmK_dRoATVU9YLEs \
  -e TELEGRAM_CHAT_ID=273773467 \
  gateway
```

### 3. Проверьте логи

```bash
docker logs -f gateway
```

## Обновление CORS origins

Если нужно добавить новый frontend, отредактируйте `middleware.go`:

```go
allowedOrigins := map[string]bool{
    "http://localhost:3000": true,
    "https://my-projects-gateway-zp.crv1ic.easypanel.host": true,
    "https://new-frontend.com": true,  // ← добавьте сюда
}
```

И `websocket.go`:

```go
allowedOrigins := map[string]bool{
    "http://localhost:3000": true,
    "https://my-projects-gateway-zp.crv1ic.easypanel.host": true,
    "https://new-frontend.com": true,  // ← добавьте сюда
}
```

Затем пересоберите и задеплойте.

## Troubleshooting

### Gateway не запускается

Проверьте:
- `JWT_SECRET` установлен
- `DATABASE_URL` правильный
- База данных доступна
- Порт 80 свободен

### Backend недоступен

Проверьте:
- `MAIN_SERVICE_URL` правильный
- Main Service запущен
- Сетевая связность между контейнерами

### CORS ошибки

Проверьте:
- Origin добавлен в `allowedOrigins`
- Backend НЕ устанавливает CORS заголовки
- Gateway фильтрует CORS заголовки от backend

### JWT токен не работает

Проверьте:
- `JWT_SECRET` одинаковый везде
- Токен не истек (7 дней)
- Формат: `Authorization: Bearer TOKEN`
