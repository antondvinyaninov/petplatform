# Admin Panel - Административная панель ZooPlatforma

## Описание

Административная панель для управления платформой ZooPlatforma. Предоставляет интерфейс для модерации контента, управления пользователями, мониторинга системы и просмотра логов.

## Архитектура

```
Browser → Admin Frontend (Next.js) → Admin Backend (Go) → Gateway API → Main Backend → Database
```

### Компоненты

1. **Frontend (Next.js 16)**
   - Порт: 4000
   - Технологии: React 19, TypeScript, Tailwind CSS
   - Роутинг: App Router
   - Авторизация: JWT через cookies

2. **Backend (Go)**
   - Порт: 9000
   - Функции: Прокси к Gateway, проверка прав доступа
   - Авторизация: JWT middleware

3. **Gateway API**
   - URL: https://api.zooplatforma.ru
   - Основной бэкенд платформы

## Функциональность

### 1. Dashboard
- Общая статистика платформы
- Активность пользователей
- Графики и метрики

### 2. Users (Пользователи)
- Список всех пользователей
- Поиск и фильтрация
- Просмотр профилей
- Управление ролями
- Верификация пользователей

### 3. Posts (Посты)
- Список всех постов
- Модерация контента
- Удаление постов

### 4. Organizations (Организации)
- Список организаций (приюты, клиники, фонды)
- Просмотр участников
- Статистика организаций

### 5. Moderation (Модерация)
- Жалобы пользователей
- Обработка репортов
- Статистика модерации

### 6. Logs (Логи)
- Системные логи
- Действия пользователей
- Фильтрация по типам

### 7. Monitoring (Мониторинг)
- Ошибки системы
- Метрики производительности
- Статус сервисов

### 8. Health (Здоровье системы)
- Статус всех сервисов
- Проверка доступности

## Роли и доступ

### Superadmin
- Полный доступ ко всем функциям
- Управление пользователями и ролями
- Доступ к системным настройкам

### Moderator
- Модерация контента
- Обработка жалоб
- Просмотр логов

## Технические детали

### Авторизация

1. Пользователь входит через Gateway API
2. Получает JWT токен в cookie `auth_token`
3. Frontend проверяет наличие роли `superadmin`
4. Backend проверяет токен на каждом запросе

### API Routes

Frontend использует Next.js API Routes для проксирования запросов:

```
/api/admin/* → Admin Backend (localhost:9000) → Gateway API
```

### Переменные окружения

**Frontend:**
```env
ADMIN_API_URL=http://localhost:9000
NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
NEXT_PUBLIC_ENVIRONMENT=production
```

**Backend:**
```env
GATEWAY_URL=https://api.zooplatforma.ru
JWT_SECRET=<секрет, совпадает с Gateway>
PORT=9000
ENVIRONMENT=production
CORS_ORIGINS=https://admin.zooplatforma.ru
```

## Деплой

### Production

**URL:** https://admin.zooplatforma.ru

**Easypanel:**
- Один контейнер с backend и frontend
- Порт 4000 (внешний)
- Автодеплой из ветки `admin`

### Local Development

```bash
# Backend
cd backend
go run main.go

# Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:4000
Backend: http://localhost:9000

## Структура проекта

```
admin/
├── backend/
│   ├── main.go              # Точка входа
│   ├── handlers/            # HTTP handlers
│   │   ├── auth.go         # Авторизация
│   │   ├── users.go        # Пользователи
│   │   ├── posts.go        # Посты
│   │   ├── organizations.go # Организации
│   │   ├── moderation.go   # Модерация
│   │   ├── logs.go         # Логи
│   │   └── monitoring.go   # Мониторинг
│   └── middleware/
│       └── auth.go         # JWT middleware
│
├── frontend/
│   ├── app/
│   │   ├── (dashboard)/    # Защищённые страницы
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   ├── posts/
│   │   │   ├── organizations/
│   │   │   ├── moderation/
│   │   │   ├── logs/
│   │   │   └── monitoring/
│   │   ├── api/admin/      # API routes (прокси)
│   │   └── auth/           # Страница входа
│   └── lib/
│       └── api.ts          # API клиент
│
└── Dockerfile              # Multi-stage build
```

## Безопасность

1. **JWT токены** - проверка на каждом запросе
2. **CORS** - только разрешённые домены
3. **HTTPS** - обязательно в production
4. **Роли** - проверка прав доступа
5. **Cookies** - HttpOnly, Secure, SameSite

## Мониторинг

### Логи

Все действия логируются:
- Вход в систему
- Изменение данных
- Модерация контента
- Системные ошибки

### Метрики

- Активные пользователи
- Количество запросов
- Время ответа
- Ошибки (4xx, 5xx)

## Обновление

```bash
# Локально
git add .
git commit -m "Update admin panel"
git push origin admin

# Easypanel автоматически пересоберёт и задеплоит
```

## Troubleshooting

### Ошибка "Unauthorized"
- Проверьте JWT_SECRET (должен совпадать с Gateway)
- Проверьте роль пользователя (должна быть superadmin)

### Ошибка "Failed to fetch"
- Проверьте ADMIN_API_URL (должен быть http://localhost:9000)
- Проверьте что backend запущен

### Ошибка "CORS"
- Проверьте CORS_ORIGINS в backend
- Добавьте домен админки

## Контакты

- Gateway API: https://api.zooplatforma.ru
- Admin Panel: https://admin.zooplatforma.ru
- Main Site: https://zooplatforma.ru
