# Архитектура ЗооПлатформа - Admin Panel

## Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                     ЗооПлатформа Ecosystem                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Main Frontend│  │Admin Frontend│  │Other Frontends│
│   :3000      │  │   :4000      │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   Admin Backend  │
              │      :9000       │
              └─────────┬────────┘
                        │
                        ▼
              ┌──────────────────┐
              │     Gateway      │
              │ api.zooplatforma │
              └─────────┬────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Main Backend    │
              │   (Go + Next.js) │
              └──────┬───────────┘
                     │
                     ▼
            ┌──────────────────┐
            │   PostgreSQL     │
            │ 88.218.121.213   │
            │     :5432        │
            └──────────────────┘
```

## Компоненты системы

### Frontend Layer

#### Main Frontend (порт 3000)
- **Технологии:** Next.js 15, React 19, TypeScript
- **Назначение:** Основной сайт для пользователей
- **Функции:**
  - Лента постов
  - Профили пользователей
  - Мессенджер
  - Организации
  - Питомцы

#### Admin Frontend (порт 4000)
- **Технологии:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Назначение:** Административная панель
- **Функции:**
  - Управление пользователями
  - Модерация контента
  - Управление организациями
  - Мониторинг системы
  - Логирование действий

### Backend Layer

#### Admin Backend (порт 9000)
- **Технологии:** Go, gorilla/mux, JWT
- **Назначение:** API для админ-панели
- **Особенности:**
  - Нет прямого доступа к БД
  - Все запросы через Gateway
  - Проверка роли superadmin
  - Логирование действий

#### Gateway (api.zooplatforma.ru)
- **Технологии:** Go, gorilla/mux
- **Назначение:** API Gateway и SSO Provider
- **Функции:**
  - Маршрутизация запросов
  - JWT авторизация
  - CORS
  - Rate limiting
  - WebSocket proxy
  - Логирование

#### Main Backend
- **Технологии:** Go + Next.js, PostgreSQL
- **Назначение:** Основной бизнес-логика
- **Функции:**
  - CRUD операции
  - Бизнес-логика
  - Работа с БД
  - Медиа-файлы
  - Авторизация (JWT)

### Data Layer

#### PostgreSQL Database
- **Адрес:** 88.218.121.213:5432
- **База:** zp-db
- **Назначение:** Хранение всех данных
- **Таблицы:**
  - users, posts, comments
  - organizations, pets
  - messages, chats
  - notifications
  - и другие

## Потоки данных

### 1. Авторизация пользователя

```
User → Main Frontend → Gateway → Main Backend → Database
                          ↓
                    Auth Check (JWT)
                          ↓
                      JWT Token
                          ↓
                  Cookie: auth_token
                          ↓
                        User
```

### 2. Создание поста

```
User → Main Frontend → Gateway → Main Backend → Database
                          ↓
                    Auth Check (JWT)
                          ↓
                    User Authorized
```

### 3. Админ действие

```
Admin → Admin Frontend → Admin Backend → Gateway → Main Backend → Database
                              ↓              ↓
                        Auth Check    Auth Check
                              ↓              ↓
                      Superadmin?    Valid JWT?
```

## Безопасность

### Уровни защиты

1. **Frontend Level**
   - Проверка авторизации перед рендером
   - Редирект неавторизованных пользователей
   - Валидация форм

2. **Admin Backend Level**
   - JWT проверка
   - Проверка роли superadmin
   - Логирование всех действий

3. **Gateway Level**
   - JWT проверка
   - Rate limiting
   - CORS
   - Логирование запросов

4. **Service Level**
   - Валидация данных
   - Проверка прав доступа
   - SQL injection защита

### JWT Токены

**Структура токена:**
```json
{
  "user_id": 1,
  "email": "admin@example.com",
  "roles": ["user", "superadmin"],
  "exp": 1234567890
}
```

**Проверка:**
- Подпись (HMAC-SHA256)
- Срок действия (7 дней)
- Роли пользователя

### Cookie

**Параметры:**
- Name: `auth_token`
- HttpOnly: `true`
- Secure: `true` (production)
- SameSite: `Lax`
- Domain: `localhost` (dev) / `.zooplatforma.ru` (prod)
- MaxAge: 7 дней

## Масштабирование

### Горизонтальное

Можно запустить несколько инстансов:
- Admin Backend (за load balancer)
- Main Backend (за load balancer)
- Gateway (за load balancer)

### Вертикальное

Увеличение ресурсов:
- CPU для Gateway (много запросов)
- RAM для Main Backend (кэширование)
- Disk для Database (хранение данных)

## Мониторинг

### Метрики

- **Gateway:** RPS, latency, errors
- **Admin Backend:** requests, auth failures
- **Main Backend:** DB queries, response time
- **Database:** connections, queries, size

### Логирование

- **Gateway:** все запросы
- **Admin Backend:** все действия админов
- **Main Backend:** ошибки и важные события
- **Auth Service:** попытки входа

## Development vs Production

### Development

```
Frontend → Backend → Service (прямое подключение)
```

- Все сервисы на localhost
- Разные порты
- Без SSL
- Подробное логирование

### Production

```
Frontend → Gateway → Backend → Service
```

- Все через Gateway
- SSL/TLS
- Единый домен
- Минимальное логирование

## Deployment

### Docker Compose

```yaml
services:
  gateway:
    image: gateway:latest
    ports: ["80:80"]
    
  admin-backend:
    image: admin-backend:latest
    ports: ["9000:9000"]
    
  main-backend:
    image: main-backend:latest
    ports: ["8000:8000"]
    
  auth-service:
    image: auth-service:latest
    ports: ["7100:7100"]
    
  database:
    image: postgres:15
    ports: ["5432:5432"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: admin-backend
  template:
    metadata:
      labels:
        app: admin-backend
    spec:
      containers:
      - name: admin-backend
        image: admin-backend:latest
        ports:
        - containerPort: 9000
```

## Troubleshooting

### Проблема: Сервис недоступен

**Проверка:**
```bash
# Проверьте все сервисы
curl http://localhost:80/health      # Gateway
curl http://localhost:9000/api/admin/health  # Admin Backend
curl http://localhost:8000/api/health        # Main Backend
curl http://localhost:7100/health            # Auth Service
```

### Проблема: Авторизация не работает

**Проверка:**
1. JWT_SECRET совпадает во всех сервисах?
2. Cookie установлен?
3. Токен валиден?
4. Роль superadmin есть?

### Проблема: CORS ошибки

**Проверка:**
1. Origin в списке разрешенных?
2. Credentials включены?
3. Preflight запрос проходит?

## Дополнительные ресурсы

- [Main Service Documentation](MAIN.md)
- [Gateway Documentation](gateway.md)
- [Admin Backend README](backend/README.md)
- [Admin Frontend README](frontend/README.md)

---

**Дата обновления:** 6 февраля 2026
