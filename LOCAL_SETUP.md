# Локальный запуск Admin Panel

## ✅ Статус сервисов

- ✅ **Gateway:** https://api.zooplatforma.ru (работает)
- ✅ **Admin Backend:** http://localhost:9000 (запущен)
- ✅ **Admin Frontend:** http://localhost:4000 (запущен)

## 🔐 Авторизация

### Вариант 1: Через главный сайт (рекомендуется)

1. Откройте главный сайт: https://zooplatforma.ru
2. Войдите под пользователем с ролью `superadmin`
3. Gateway установит cookie `auth_token`
4. Откройте админ-панель: http://localhost:4000
5. Панель автоматически проверит токен

### Вариант 2: Через API (для тестирования)

```bash
# Войдите через API
curl -X POST https://api.zooplatforma.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }' \
  -c cookies.txt

# Проверьте авторизацию
curl -s https://api.zooplatforma.ru/api/auth/me \
  -b cookies.txt

# Теперь используйте cookie в браузере
```

### Вариант 3: Ручная установка cookie (DevTools)

1. Войдите на https://zooplatforma.ru
2. Откройте DevTools (F12)
3. Перейдите в Application → Cookies → https://zooplatforma.ru
4. Найдите cookie `auth_token`
5. Скопируйте его значение
6. Откройте http://localhost:4000
7. В DevTools создайте cookie:
   - Name: `auth_token`
   - Value: (вставьте скопированное значение)
   - Domain: `localhost`
   - Path: `/`
   - HttpOnly: ✓
8. Обновите страницу

## 🧪 Проверка работы

### 1. Проверьте Backend

```bash
# Health check
curl http://localhost:9000/api/admin/health

# Должен вернуть:
# {"status": "ok", "service": "admin-api"}
```

### 2. Проверьте авторизацию

```bash
# Проверьте что вы авторизованы (с cookie)
curl http://localhost:9000/api/admin/auth/me \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Должен вернуть данные пользователя с ролью superadmin
```

### 3. Откройте Frontend

Откройте в браузере: http://localhost:4000

Вы должны увидеть:
- ✅ Дашборд с статистикой
- ✅ Навигацию по разделам
- ✅ Данные пользователей/организаций

## 🔧 Настройки

### Backend (.env)

```env
GATEWAY_URL=https://api.zooplatforma.ru
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:4000,http://localhost:3000,https://api.zooplatforma.ru
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:9000
NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
NEXT_PUBLIC_ENVIRONMENT=development
```

## 🐛 Troubleshooting

### Ошибка "Не авторизован"

**Причина:** Cookie `auth_token` не установлен или невалиден

**Решение:**
1. Войдите на https://zooplatforma.ru
2. Проверьте что cookie установлен
3. Скопируйте cookie в localhost

### Ошибка "Доступ запрещен"

**Причина:** У пользователя нет роли `superadmin`

**Решение:**
1. Проверьте роли пользователя:
```bash
curl https://api.zooplatforma.ru/api/auth/me \
  -H "Cookie: auth_token=YOUR_TOKEN"
```
2. Убедитесь что в `roles` есть `superadmin`

### Ошибка CORS

**Причина:** Origin не в списке разрешенных

**Решение:**
1. Проверьте `CORS_ORIGINS` в backend/.env
2. Добавьте нужный origin
3. Перезапустите backend

### Gateway недоступен

**Причина:** Проблемы с сетью или Gateway не работает

**Решение:**
```bash
# Проверьте Gateway
curl https://api.zooplatforma.ru/health

# Должен вернуть:
# {"status":"healthy","success":true,...}
```

## 📝 Полезные команды

### Backend

```bash
# Запуск
cd backend
go run main.go

# Остановка
Ctrl+C

# Логи
# Смотрите в терминале где запущен backend
```

### Frontend

```bash
# Запуск
cd frontend
npm run dev

# Остановка
Ctrl+C

# Логи
# Смотрите в терминале где запущен frontend
```

### Проверка сервисов

```bash
# Gateway
curl https://api.zooplatforma.ru/health

# Admin Backend
curl http://localhost:9000/api/admin/health

# Frontend
curl http://localhost:4000
```

## 🎯 Следующие шаги

1. ✅ Авторизуйтесь на https://zooplatforma.ru
2. ✅ Откройте http://localhost:4000
3. ✅ Проверьте что видите дашборд
4. ✅ Попробуйте разные разделы:
   - Пользователи
   - Посты
   - Организации
   - Логи
   - Мониторинг
   - Модерация

## 🔗 Ссылки

- **Admin Frontend:** http://localhost:4000
- **Admin Backend:** http://localhost:9000
- **Gateway:** https://api.zooplatforma.ru
- **Main Site:** https://zooplatforma.ru

## 💡 Советы

1. **Используйте разные браузеры** для main site и admin panel, чтобы не путать cookies
2. **Откройте DevTools** чтобы видеть запросы и ошибки
3. **Проверяйте логи** backend и frontend в терминале
4. **Используйте Postman** для тестирования API

---

**Дата:** 6 февраля 2026
