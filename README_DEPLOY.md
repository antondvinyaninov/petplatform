# Deployment Guide - Admin Panel

## GitHub Setup

### 1. Создать ветку admin

```bash
git checkout -b admin
git add .
git commit -m "Admin panel initial commit"
git push origin admin
```

### 2. Repository

Repository: `antondvinyaninovpetplatform`  
Branch: `admin`

## Easypanel Deployment

### 1. Создать новый проект

1. Войдите в Easypanel
2. Создайте новый проект: **Admin Panel**

### 2. Добавить сервисы

#### Backend Service

**Name:** `admin-backend`  
**Type:** Docker  
**Source:** GitHub  
- Repository: `antondvinyaninovpetplatform`
- Branch: `admin`
- Build Context: `backend`
- Dockerfile: `backend/Dockerfile`

**Environment Variables:**
```env
GATEWAY_URL=https://api.zooplatforma.ru
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
ENVIRONMENT=production
CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru
```

**Port:** 9000 (internal)

**Health Check:**
- Path: `/api/admin/health`
- Port: 9000

#### Frontend Service

**Name:** `admin-frontend`  
**Type:** Docker  
**Source:** GitHub  
- Repository: `antondvinyaninovpetplatform`
- Branch: `admin`
- Build Context: `frontend`
- Dockerfile: `frontend/Dockerfile`

**Environment Variables:**
```env
ADMIN_API_URL=http://admin-backend:9000
NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
NEXT_PUBLIC_ENVIRONMENT=production
```

**Port:** 3000 → 80 (external)

**Domain:** `admin.zooplatforma.ru`

**Health Check:**
- Path: `/`
- Port: 3000

### 3. Настроить домен

1. В Easypanel добавьте домен: `admin.zooplatforma.ru`
2. Включите SSL (Let's Encrypt)
3. Настройте DNS:
   ```
   Type: A
   Name: admin
   Value: <IP вашего сервера Easypanel>
   ```

### 4. Deploy

1. Нажмите **Deploy** для обоих сервисов
2. Дождитесь завершения сборки
3. Проверьте логи на наличие ошибок

## Проверка

### Backend

```bash
curl https://admin.zooplatforma.ru/api/admin/health
```

Ожидаемый ответ:
```json
{"status": "ok", "service": "admin-api"}
```

### Frontend

Откройте в браузере: `https://admin.zooplatforma.ru`

Должна открыться страница входа.

## Структура проекта

```
admin/
├── backend/
│   ├── Dockerfile
│   ├── main.go
│   ├── handlers/
│   └── middleware/
├── frontend/
│   ├── Dockerfile
│   ├── app/
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README_DEPLOY.md
```

## Переменные окружения

### Обязательные

- `JWT_SECRET` - должен совпадать с Gateway
- `GATEWAY_URL` - URL Gateway API
- `CORS_ORIGINS` - разрешенные origins

### Опциональные

- `FRONTEND_PORT` - внешний порт frontend (по умолчанию 4000)
- `ENVIRONMENT` - окружение (production/development)

## Troubleshooting

### Backend не запускается

1. Проверьте логи: `docker logs admin-backend`
2. Убедитесь что `JWT_SECRET` установлен
3. Проверьте доступность Gateway

### Frontend не может подключиться к Backend

1. Проверьте `ADMIN_API_URL=http://admin-backend:9000`
2. Убедитесь что оба сервиса в одной сети
3. Проверьте health check backend

### Ошибка авторизации

1. Проверьте что `JWT_SECRET` совпадает с Gateway
2. Убедитесь что пользователь имеет роль `superadmin`
3. Проверьте что cookie `auth_token` передается

### CORS ошибки

1. Добавьте домен в `CORS_ORIGINS`
2. Перезапустите backend
3. Очистите кэш браузера

## Обновление

### Автоматическое (через GitHub)

1. Сделайте изменения в коде
2. Закоммитьте в ветку `admin`
3. Запушьте: `git push origin admin`
4. Easypanel автоматически пересоберет и задеплоит

### Ручное

В Easypanel нажмите **Rebuild** для нужного сервиса.

## Мониторинг

### Логи

В Easypanel:
1. Выберите сервис
2. Перейдите в **Logs**
3. Смотрите real-time логи

### Метрики

Страница мониторинга: `https://admin.zooplatforma.ru/monitoring`

Показывает:
- Активные пользователи
- Ошибки за час/24ч
- Размер БД
- Статус сервисов

## Backup

### База данных

Логи хранятся в PostgreSQL Gateway. Бэкап делается на уровне Gateway.

### Конфигурация

Все конфигурации в Git (ветка `admin`).

## Rollback

Если что-то пошло не так:

1. В Easypanel выберите сервис
2. Перейдите в **Deployments**
3. Выберите предыдущий успешный деплой
4. Нажмите **Rollback**

## Support

При проблемах проверьте:
1. Логи сервисов в Easypanel
2. Страницу мониторинга
3. Health checks
4. Переменные окружения
