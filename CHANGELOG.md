# Changelog - Admin Panel Refactoring

## 2026-02-07 - Реализация функционала модерации и жалоб

### Добавлено

#### Страница постов с полным контентом
- ✅ Отображение авторов постов (имя + фамилия)
- ✅ Отображение контента постов
- ✅ Отображение фото и видео из attachments
- ✅ Отображение опросов с результатами голосования
- ✅ Прогресс-бары для опций опросов
- ✅ Метаданные опросов (множественный выбор, дата окончания)

**Эндпоинты:**
- `GET /api/admin/posts` - список постов с авторами
- `GET /api/admin/posts/with-polls` - посты с данными опросов

#### Страница модерации жалоб
- ✅ Просмотр всех жалоб (pending/resolved)
- ✅ Статистика модерации (всего, ожидают, рассмотрено)
- ✅ Рассмотрение жалоб с действиями (warning, content_removed, user_banned, no_action)
- ✅ Комментарии модератора
- ✅ История рассмотрения жалоб
- ✅ Фильтрация по статусу

**База данных:**
- Создана таблица `reports` с полями:
  - reporter_id, target_type, target_id
  - reason, description, status
  - moderator_id, moderator_action, moderator_comment
  - reviewed_at, created_at, updated_at
- Добавлены индексы для оптимизации запросов
- Добавлены тестовые данные

**Эндпоинты:**
- `GET /api/moderation/reports?status=pending|resolved` - список жалоб
- `PUT /api/moderation/reports/:id` - рассмотрение жалобы
- `GET /api/moderation/stats` - статистика модерации

**Next.js API Routes (прокси):**
- `GET /api/admin/moderation/reports` - прокси к Gateway
- `PUT /api/admin/moderation/reports/[id]` - прокси к Gateway
- `GET /api/admin/moderation/stats` - прокси к Gateway

#### Исправление авторизации
- ✅ Исправлен баг с форматом JWT токена (role vs roles)
- ✅ Middleware теперь поддерживает оба формата:
  - `roles: ["user", "superadmin"]` (массив)
  - `role: "superadmin"` (строка)
- ✅ Добавлено логирование для отладки авторизации

#### Подача жалоб с главного сайта
- ✅ Исправлена конфигурация главного сайта
- ✅ Убран хардкод `localhost:8000` из `ReportButton.tsx`
- ✅ Включены rewrites в production для проксирования через Next.js
- ✅ Относительные пути `/api/reports` вместо абсолютных URL
- ✅ Добавлен `credentials: 'include'` для передачи cookies
- ✅ Исправлен `CreateReportHandler` для чтения `X-User-ID` из заголовка

**Архитектура подачи жалоб:**
```
Браузер (zooplatforma.ru)
    ↓
POST /api/reports (относительный путь)
    ↓
Next.js Server (rewrites)
    ↓
https://api.zooplatforma.ru/api/reports
    ↓
Gateway → Main Backend → PostgreSQL
```

#### Скрипт запуска
- ✅ Создан единый скрипт `./run` для запуска всех сервисов
- ✅ Проверка наличия .env файлов
- ✅ Запуск backend (порт 9000) и frontend (порт 4000)
- ✅ Проверка health endpoint
- ✅ Логирование в файлы (backend.log, frontend.log)
- ✅ Graceful shutdown при Ctrl+C

### Исправлено

- 🐛 SQL запрос для постов использовал `user_id` вместо `author_id`
- 🐛 JWT токен содержит `role` (строка), но middleware ожидал `roles` (массив)
- 🐛 Пустой файл `backend/handlers/proxy.go` вызывал ошибку компиляции
- 🐛 Главный сайт использовал `localhost:8000` вместо Gateway URL
- 🐛 Cookies не передавались в запросах с главного сайта
- 🐛 `CreateReportHandler` не читал `X-User-ID` из заголовка

### Файлы

**Созданы:**
- `frontend/app/(dashboard)/posts/page.tsx` - страница постов
- `frontend/app/(dashboard)/moderation/page.tsx` - страница модерации
- `frontend/app/api/admin/moderation/reports/route.ts` - API прокси
- `frontend/app/api/admin/moderation/reports/[id]/route.ts` - API прокси
- `frontend/app/api/admin/moderation/stats/route.ts` - API прокси
- `backend/handlers/moderation.go` - handlers модерации
- `run` - скрипт запуска всех сервисов

**Обновлены:**
- `backend/middleware/auth.go` - поддержка обоих форматов токена
- `backend/handlers/proxy.go` - исправлен пустой файл
- `backend/handlers/posts.go` - добавлены поля для опросов и медиа
- Main site `ReportButton.tsx` - использование относительных путей
- Main site `next.config.ts` - включены rewrites в production
- Main site `CreateReportHandler` - чтение X-User-ID из заголовка

### База данных

**SQL команды:**
```sql
-- Создание таблицы reports
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  moderator_id INTEGER REFERENCES users(id),
  moderator_action VARCHAR(50),
  moderator_comment TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_moderator ON reports(moderator_id);
```

### Конфигурация

**Главный сайт (.env.production):**
```env
NEXT_PUBLIC_API_URL=
```

**Главный сайт (next.config.ts):**
```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'https://api.zooplatforma.ru/api/:path*',
    },
  ];
}
```

---

## 2026-02-06 - Переход на Gateway архитектуру

### Изменения

#### Backend

**Удалено:**
- ❌ Прямой доступ к базе данных
- ❌ Зависимость от модуля `database`
- ❌ Зависимость от `pkg/middleware`
- ❌ Старый `middleware/admin.go`

**Добавлено:**
- ✅ HTTP клиент для работы с Gateway (`middleware/gateway.go`)
- ✅ Новый middleware для JWT авторизации (`middleware/auth.go`)
- ✅ Проксирование всех запросов через Gateway
- ✅ Использование gorilla/mux для роутинга
- ✅ Поддержка CORS для нескольких origins

**Обновлено:**
- 🔄 `main.go` - новая структура роутинга с mux
- 🔄 Все handlers теперь работают через Gateway API
- 🔄 `go.mod` - убраны локальные зависимости
- 🔄 `.env.example` - новые переменные окружения

**Новые файлы:**
- 📄 `backend/README.md` - документация backend
- 📄 `backend/handlers/utils.go` - общие утилиты
- 📄 `backend/middleware/auth.go` - JWT авторизация
- 📄 `backend/middleware/gateway.go` - HTTP клиент

#### Frontend

**Обновлено:**
- 🔄 `app/(dashboard)/layout.tsx` - авторизация через Gateway (порт 80)
- 🔄 `app/(dashboard)/dashboard/page.tsx` - запросы через Gateway
- 🔄 `lib/api.ts` - добавлен GATEWAY_URL
- 🔄 `.env.local` - новые переменные окружения
- 🔄 `README.md` - обновлена документация

#### Документация

**Добавлено:**
- 📄 `README.md` - главная документация проекта
- 📄 `backend/README.md` - документация backend
- 📄 `frontend/README.md` - обновленная документация frontend
- 📄 `CHANGELOG.md` - этот файл

### Архитектура

**Было:**
```
Admin Frontend → Admin Backend → Database
```

**Стало:**
```
Admin Frontend → Admin Backend → Gateway → Main Service → Database
```

### Преимущества новой архитектуры

1. **Безопасность** - нет прямого доступа к БД
2. **Централизация** - все запросы через Gateway
3. **SSO** - единая авторизация для всех сервисов
4. **Масштабируемость** - легко добавлять новые сервисы
5. **Логирование** - централизованное логирование в Gateway
6. **CORS** - настроен в одном месте

### Конфигурация

#### Backend (.env)

```env
GATEWAY_URL=http://localhost:80
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:4000,http://localhost:3000
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_GATEWAY_URL=http://localhost:80
NEXT_PUBLIC_ENVIRONMENT=development
```

### Миграция

#### Для разработчиков

1. Обновите зависимости backend:
   ```bash
   cd backend
   go mod tidy
   ```

2. Создайте `.env` из `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Установите `JWT_SECRET` (должен совпадать с Gateway!)

4. Запустите backend:
   ```bash
   go run main.go
   ```

5. Обновите зависимости frontend:
   ```bash
   cd frontend
   npm install
   ```

6. Запустите frontend:
   ```bash
   npm run dev
   ```

#### Для production

1. Соберите backend:
   ```bash
   cd backend
   go build -o admin-api
   ```

2. Соберите frontend:
   ```bash
   cd frontend
   npm run build
   ```

3. Настройте переменные окружения для production

4. Запустите сервисы

### Breaking Changes

⚠️ **Важно:** Эти изменения несовместимы со старой версией!

1. Backend больше не работает без Gateway
2. Требуется Gateway на порту 80
3. JWT_SECRET должен совпадать с Gateway
4. Изменились URL для авторизации (теперь через Gateway)

### Тестирование

После обновления проверьте:

- [ ] Backend собирается без ошибок
- [ ] Frontend собирается без ошибок
- [ ] Авторизация работает через Gateway
- [ ] Проверка роли superadmin работает
- [ ] Все API endpoints доступны
- [ ] CORS настроен правильно

### Известные проблемы

Нет известных проблем.

### TODO

- [ ] Добавить Docker Compose для всех сервисов
- [ ] Добавить тесты для backend
- [ ] Добавить тесты для frontend
- [ ] Добавить CI/CD pipeline
- [ ] Добавить мониторинг и алерты

### Контакты

При возникновении проблем обращайтесь:
- GitHub Issues
- Email: support@zooplatforma.ru
