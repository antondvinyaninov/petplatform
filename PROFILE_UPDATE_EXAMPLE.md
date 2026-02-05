# Обновление профиля через Gateway

## Эндпоинт
```
PUT /api/auth/profile
```

## Требования
- Авторизация через JWT токен (cookie `auth_token` или заголовок `Authorization: Bearer <token>`)

## Пример запроса

### Обновление имени и фамилии
```bash
curl -X PUT https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{
    "name": "Иван",
    "last_name": "Петров"
  }'
```

### Обновление всех полей
```bash
curl -X PUT https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{
    "name": "Иван",
    "last_name": "Петров",
    "bio": "Люблю животных",
    "phone": "+7 999 123-45-67",
    "location": "Москва",
    "profile_visibility": "public",
    "show_phone": "friends",
    "show_email": "nobody",
    "allow_messages": "public",
    "show_online": "yes"
  }'
```

### Обновление только фамилии
```bash
curl -X PUT https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN" \
  -d '{
    "last_name": "Сидоров"
  }'
```

## Ответ

### Успешное обновление (200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван",
    "last_name": "Петров",
    "bio": "Люблю животных",
    "phone": "+7 999 123-45-67",
    "location": "Москва",
    "avatar": null,
    "cover_photo": null,
    "profile_visibility": "public",
    "show_phone": "friends",
    "show_email": "nobody",
    "allow_messages": "public",
    "show_online": "yes",
    "verified": false,
    "role": "user",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Ошибка авторизации (401 Unauthorized)
```json
{
  "success": false,
  "error": "Authorization required"
}
```

### Нет полей для обновления (400 Bad Request)
```json
{
  "success": false,
  "error": "No fields to update"
}
```

## Особенности

1. **Динамическое обновление** - обновляются только переданные поля
2. **Поддержка NULL** - можно передать `null` для очистки поля
3. **Свежие данные** - после обновления возвращаются актуальные данные из БД
4. **Логирование** - все операции логируются с деталями

## Проверка обновления

После обновления профиля можно проверить изменения через:

```bash
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/auth/me \
  -H "Cookie: auth_token=YOUR_JWT_TOKEN"
```

Эндпоинт `/api/auth/me` всегда возвращает свежие данные из БД, а не из JWT токена.
