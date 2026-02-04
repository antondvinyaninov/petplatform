# 🚀 Деплой PetPlatform на Easypanel

## Подготовка

### 1. Подключите GitHub репозиторий

В Easypanel:
1. Перейдите в Projects
2. Нажмите "Create Project"
3. Выберите "GitHub Repository"
4. Выберите репозиторий `antondvinyaninov/petplatform`

### 2. Создайте Backend сервис

**Настройки сервиса:**

- **Name**: `petplatform-backend`
- **Type**: App
- **Source**: GitHub Repository
- **Repository**: `antondvinyaninov/petplatform`
- **Branch**: `main`
- **Build Path**: `/` (корень репозитория)
- **Dockerfile Path**: `Dockerfile` (в корне)

**Порты:**
- **Container Port**: 8000
- **Public Port**: 8000 (или через Gateway)

**Environment Variables:**

```env
PORT=8000
JWT_SECRET=your-super-secret-key-change-this
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
ENVIRONMENT=production

# Service URLs
AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
PETBASE_SERVICE_URL=http://localhost:8100

# PostgreSQL Database
DATABASE_URL=postgres://user:password@88.218.121.213:5432/zp-db?sslmode=disable

# S3 Storage (FirstVDS)
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
```

**Health Check:**
- **Path**: `/api/health`
- **Port**: 8000
- **Interval**: 30s
- **Timeout**: 10s
- **Retries**: 3

**Resources:**
- **CPU**: 0.5 - 1.0 vCPU
- **Memory**: 512MB - 1GB

### 3. Настройте домен

**Вариант 1: Через Gateway (рекомендуется)**

Backend будет доступен через Gateway:
```
https://my-projects-gateway-zp.crv1ic.easypanel.host/api/*
```

В Gateway настройте проксирование:
```env
MAIN_SERVICE_URL=http://petplatform-backend:8000
```

**Вариант 2: Прямой доступ**

Настройте домен в Easypanel:
```
https://petplatform-api.your-domain.com
```

### 4. Деплой Frontend на Vercel

Frontend деплоится отдельно на Vercel:

1. Подключите репозиторий к Vercel
2. Настройте Build Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. Настройте Environment Variables:
```env
NEXT_PUBLIC_API_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host
NEXT_PUBLIC_S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
NEXT_PUBLIC_DADATA_API_KEY=your-dadata-key
```

## Проверка деплоя

### 1. Проверьте Backend

```bash
# Health check
curl https://your-backend-url/api/health

# Должен вернуть:
{"status":"ok"}
```

### 2. Проверьте подключение к PostgreSQL

```bash
# Проверьте логи в Easypanel
# Должно быть сообщение:
✅ Successfully connected to PostgreSQL database
```

### 3. Проверьте S3

```bash
# Проверьте логи в Easypanel
# Должно быть сообщение:
☁️  S3 storage initialized: bucket=zooplatforma, region=ru-1
```

### 4. Проверьте Gateway

```bash
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health

# Проверьте что main_backend healthy: true
```

## Обновление

### Автоматический деплой

Easypanel автоматически деплоит при push в `main` ветку:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

### Ручной деплой

В Easypanel:
1. Перейдите в сервис `petplatform-backend`
2. Нажмите "Deploy"
3. Выберите "Rebuild"

## Мониторинг

### Логи

В Easypanel:
1. Перейдите в сервис
2. Вкладка "Logs"
3. Выберите "Live Logs"

### Метрики

В Easypanel:
1. Перейдите в сервис
2. Вкладка "Metrics"
3. Смотрите CPU, Memory, Network

### Health Check

```bash
# Проверка здоровья сервиса
curl https://your-backend-url/api/health

# Проверка Gateway
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health
```

## Troubleshooting

### Backend не запускается

1. Проверьте логи в Easypanel
2. Проверьте Environment Variables
3. Проверьте DATABASE_URL (должен быть доступен)
4. Проверьте S3 credentials

### Ошибка подключения к PostgreSQL

```bash
# Проверьте что PostgreSQL доступен
nc -zv 88.218.121.213 5432

# Проверьте DATABASE_URL в Environment Variables
# Формат: postgres://user:password@host:port/database?sslmode=disable
```

### Ошибка S3

1. Проверьте S3_ACCESS_KEY и S3_SECRET_KEY
2. Проверьте S3_BUCKET существует
3. Проверьте S3_ENDPOINT доступен

### Gateway не видит Backend

1. Проверьте что Backend запущен и healthy
2. Проверьте MAIN_SERVICE_URL в Gateway
3. Проверьте что сервисы в одной сети Docker

## Rollback

Если что-то пошло не так:

1. В Easypanel перейдите в "Deployments"
2. Найдите предыдущий успешный деплой
3. Нажмите "Redeploy"

Или через Git:

```bash
# Откатите коммит
git revert HEAD
git push origin main
```

## Масштабирование

### Горизонтальное

В Easypanel:
1. Перейдите в сервис
2. Settings → Scaling
3. Увеличьте количество реплик

### Вертикальное

В Easypanel:
1. Перейдите в сервис
2. Settings → Resources
3. Увеличьте CPU/Memory

## Backup

### База данных

PostgreSQL бэкапится автоматически на VPS.

Ручной бэкап:
```bash
pg_dump -h 88.218.121.213 -U user -d zp-db > backup.sql
```

### S3 Storage

FirstVDS S3 имеет встроенное резервное копирование.

## Безопасность

### Обязательно:

1. ✅ Смените JWT_SECRET на уникальный
2. ✅ Используйте сильные пароли для PostgreSQL
3. ✅ Ограничьте ALLOWED_ORIGINS только вашими доменами
4. ✅ Используйте HTTPS для всех соединений
5. ✅ Регулярно обновляйте зависимости

### Рекомендуется:

1. Настройте rate limiting в Gateway
2. Включите логирование всех запросов
3. Настройте мониторинг и алерты
4. Используйте secrets manager для чувствительных данных

## Полезные команды

```bash
# Проверить статус сервиса
curl https://your-backend-url/api/health

# Проверить Gateway
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/health

# Проверить PostgreSQL
psql -h 88.218.121.213 -U user -d zp-db -c "SELECT version();"

# Проверить S3
aws s3 ls s3://zooplatforma --endpoint-url=https://s3.firstvds.ru

# Посмотреть логи (в Easypanel)
# Projects → petplatform-backend → Logs
```

## Контакты

При проблемах с деплоем:
- Проверьте логи в Easypanel
- Проверьте документацию: https://easypanel.io/docs
- GitHub Issues: https://github.com/antondvinyaninov/petplatform/issues
