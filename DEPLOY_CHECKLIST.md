# ✅ Чеклист деплоя PetPlatform

## Перед деплоем

- [ ] Все изменения закоммичены и запушены в `main`
- [ ] Docker образ собирается локально (`docker build -t petplatform-backend:test -f backend/Dockerfile backend/`)
- [ ] Есть доступ к Easypanel
- [ ] Есть доступ к Vercel
- [ ] Есть все необходимые credentials (PostgreSQL, S3, JWT_SECRET)

## Easypanel - Backend

### Создание сервиса

- [ ] Создан новый App в Easypanel
- [ ] Название: `petplatform-backend`
- [ ] Подключен GitHub репозиторий: `antondvinyaninov/petplatform`
- [ ] Ветка: `main`
- [ ] Build Path: `/backend`

### Environment Variables

- [ ] `PORT=8000`
- [ ] `JWT_SECRET=<сгенерирован сильный ключ>`
- [ ] `ALLOWED_ORIGINS=<URL фронтенда>`
- [ ] `ENVIRONMENT=production`
- [ ] `AUTH_SERVICE_URL=https://my-projects-gateway-zp.crv1ic.easypanel.host`
- [ ] `DATABASE_URL=postgres://...` (проверен доступ)
- [ ] `USE_S3=true`
- [ ] `S3_ENDPOINT=https://s3.firstvds.ru`
- [ ] `S3_REGION=ru-1`
- [ ] `S3_BUCKET=zooplatforma`
- [ ] `S3_ACCESS_KEY=<ключ>`
- [ ] `S3_SECRET_KEY=<секрет>`
- [ ] `S3_CDN_URL=https://zooplatforma.s3.firstvds.ru`

### Настройки

- [ ] Health Check: `/api/health` на порту 8000
- [ ] Resources: CPU 0.5-1.0, Memory 512MB-1GB
- [ ] Auto Deploy: включен для ветки `main`

### Деплой

- [ ] Нажата кнопка "Deploy"
- [ ] Сборка прошла успешно
- [ ] Контейнер запущен
- [ ] Health check проходит

## Vercel - Frontend

### Создание проекта

- [ ] Импортирован репозиторий в Vercel
- [ ] Framework: Next.js
- [ ] Root Directory: `frontend`

### Environment Variables

- [ ] `NEXT_PUBLIC_API_URL=<URL Gateway или Backend>`
- [ ] `NEXT_PUBLIC_S3_CDN_URL=https://zooplatforma.s3.firstvds.ru`
- [ ] `NEXT_PUBLIC_DADATA_API_KEY=<ключ>`

### Деплой

- [ ] Нажата кнопка "Deploy"
- [ ] Сборка прошла успешно
- [ ] Сайт доступен

## Gateway (если используется)

- [ ] В Gateway обновлен `MAIN_SERVICE_URL` на новый backend
- [ ] Gateway перезапущен
- [ ] Health check показывает `main_backend: healthy: true`

## Проверка после деплоя

### Backend

```bash
# Health check
curl https://your-backend-url/api/health
# Ожидается: {"status":"ok"}

# Проверка подключения к БД (в логах)
# Ожидается: ✅ Successfully connected to PostgreSQL database

# Проверка S3 (в логах)
# Ожидается: ☁️ S3 storage initialized: bucket=zooplatforma
```

### Frontend

- [ ] Сайт открывается
- [ ] Можно зарегистрироваться
- [ ] Можно войти
- [ ] Посты загружаются
- [ ] Изображения отображаются (через S3)

### Интеграция

- [ ] Frontend может обращаться к Backend
- [ ] WebSocket подключается
- [ ] Уведомления работают
- [ ] Мессенджер работает

## Мониторинг

- [ ] Настроены алерты в Easypanel
- [ ] Проверяются логи регулярно
- [ ] Мониторится использование ресурсов

## Rollback план

Если что-то пошло не так:

1. В Easypanel: Deployments → выбрать предыдущий деплой → Redeploy
2. В Vercel: Deployments → выбрать предыдущий деплой → Promote to Production
3. Или откатить коммит: `git revert HEAD && git push`

## Готово! 🎉

Проект задеплоен и работает!

Полезные ссылки:
- Backend: https://your-backend-url
- Frontend: https://your-frontend-url
- Gateway: https://my-projects-gateway-zp.crv1ic.easypanel.host
- GitHub: https://github.com/antondvinyaninov/petplatform
