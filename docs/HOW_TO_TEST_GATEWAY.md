# 🧪 Как проверить все Gateway роуты

## Автоматическая проверка (рекомендуется)

### 1. Получи auth token

1. Открой сайт https://my-projects-zooplatforma.crv1ic.easypanel.host
2. Войди в аккаунт
3. Открой DevTools (F12)
4. Перейди в **Application** → **Cookies**
5. Найди cookie `auth_token` и скопируй его значение

### 2. Запусти скрипт проверки

```bash
# Сделай скрипт исполняемым (только первый раз)
chmod +x test-gateway-routes.sh

# Запусти проверку (вставь свой токен)
./test-gateway-routes.sh "YOUR_AUTH_TOKEN_HERE"
```

### 3. Проверь результаты

Скрипт проверит все важные endpoints и покажет:
- ✅ Какие роуты работают
- ❌ Какие роуты не настроены
- ⚠️ Какие роуты требуют авторизацию

**Пример вывода:**
```
🔍 Проверка Gateway роутов...
Gateway: https://my-projects-gateway-zp.crv1ic.easypanel.host

=== 1. Авторизация ===
[1] GET /api/auth/me - Получить текущего пользователя... ✅ OK (200)

=== 6. Опросы ⚠️ ВАЖНО ===
[10] GET /api/polls/post/12 - Получить опрос для поста 12... ✅ OK (200)

=== 12. Мессенджер ⚠️ ВАЖНО ===
[20] GET /api/chats - Получить список чатов... ✅ OK (200)

========================================
📊 Результаты проверки:
   Всего: 25
   ✅ Успешно: 25
   ❌ Ошибок: 0
========================================
🎉 Все роуты работают!
```

---

## Ручная проверка (если скрипт не работает)

### Получи токен (как выше)

### Проверь важные endpoints

#### 1. Опросы (самое важное!)
```bash
curl "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/polls/post/12" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "question": "опросик",
    "user_voted": true,
    "user_votes": [1],
    "options": [...]
  }
}
```

**Если 404:** Gateway не проксирует `/api/polls/`

#### 2. Мессенджер
```bash
curl "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/chats" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "data": [...]
}
```

**Если 404:** Gateway не проксирует `/api/chats`

#### 3. Посты
```bash
curl "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/posts"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "data": [...]
}
```

#### 4. Друзья
```bash
curl "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/friends" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

---

## Проверка CORS

Проверь что Gateway возвращает правильные CORS заголовки:

```bash
curl -I "https://my-projects-gateway-zp.crv1ic.easypanel.host/api/posts" \
  -H "Origin: https://my-projects-zooplatforma.crv1ic.easypanel.host"
```

**Должны быть заголовки:**
```
Access-Control-Allow-Origin: https://my-projects-zooplatforma.crv1ic.easypanel.host
Access-Control-Allow-Credentials: true
```

---

## Что делать если роут не работает?

### Если 404 Not Found

Роут не настроен в Gateway. Добавь в `main.go`:

```go
mux.HandleFunc("/api/polls/", proxyToMainService(mainServiceURL))
```

### Если 401 Unauthorized

Проблема с авторизацией:
1. Проверь что токен правильный
2. Проверь что Gateway передает заголовки `X-User-ID`, `X-User-Email`
3. Проверь что `JWT_SECRET` одинаковый в Gateway и Main Service

### Если CORS ошибка

Добавь frontend URL в `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=https://my-projects-zooplatforma.crv1ic.easypanel.host,http://localhost:3000
```

---

**Последнее обновление:** 05.02.2026
