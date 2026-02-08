# PetBase Service Integration

## Проверка настроек

### 1. JWT_SECRET должен совпадать

**Gateway (.env):**
```bash
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
```

**PetBase Service (.env):**
Убедись, что в PetBase Service используется **ТОЧНО ТАКОЙ ЖЕ** JWT_SECRET!

### 2. PETBASE_SERVICE_URL

**Локальная разработка:**
```bash
PETBASE_SERVICE_URL=http://127.0.0.1:8100
```

**Production (Easypanel):**
```bash
PETBASE_SERVICE_URL=http://my-projects-petbase:8100
# или
PETBASE_SERVICE_URL=http://petbase-service:8100
```

**Почему 127.0.0.1 вместо localhost?**
- `localhost` может резолвиться в IPv6 `[::1]`
- Если PetBase слушает только на IPv4, будет ошибка "connection refused"
- `127.0.0.1` - явный IPv4 адрес

Узнай точное имя сервиса в Easypanel!

### 3. Роуты Gateway → PetBase

| Gateway Route | PetBase Route | Method | Auth |
|--------------|---------------|--------|------|
| `/api/petid/breeds` | `/api/breeds` | GET | ✅ |
| `/api/petid/breeds` | `/api/breeds` | POST | ✅ |
| `/api/petid/breeds/:id` | `/api/breeds/:id` | PUT | ✅ |
| `/api/petid/pets` | `/api/pets` | GET, POST | ✅ |
| `/api/petid/pets/:id` | `/api/pets/:id` | GET, PUT, DELETE | ✅ |

### 4. Проверка доступности PetBase

**Локально:**
```bash
curl http://127.0.0.1:8100/api/health
```

**Production:**
```bash
# Внутри Gateway контейнера
curl http://my-projects-petbase:8100/api/health
```

### 5. Отладка 401 ошибки

Проверь логи Gateway после запроса:
```
🔄 Proxying: POST /api/petid/breeds → http://127.0.0.1:8100/api/breeds (Service: PetBase Service)
🔍 Proxy headers: Authorization=Bearer xxx, Cookie=auth_token=xxx, X-User-ID=1
```

Если Authorization или Cookie пустые - проблема в передаче токена от клиента.

### 6. Переменные окружения для Production

Добавь в Easypanel для Gateway:
```bash
PETBASE_SERVICE_URL=http://my-projects-petbase:8100
```

Добавь в Easypanel для PetBase:
```bash
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
```

## Тестирование

### Создание породы через Gateway

```bash
curl -X POST http://localhost:80/api/petid/breeds \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Тестовая порода",
    "species_id": 1,
    "description": "Описание"
  }'
```

### Получение пород через Gateway

```bash
curl http://localhost:80/api/petid/breeds \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
