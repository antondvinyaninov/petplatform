# Запрос на добавление CORS в Gateway

## 🎯 Задача

Добавить в Gateway поддержку CORS для локальной разработки админ-панели.

## 📋 Что нужно сделать

### 1. Добавить `localhost:4000` в список разрешенных origins

В Gateway в файле конфигурации CORS (обычно `middleware.go` или `cors.go`) добавить:

```go
allowedOrigins := []string{
    "http://localhost:3000",      // Main Frontend (dev)
    "http://localhost:4000",      // Admin Frontend (dev) ← ДОБАВИТЬ
    "https://zooplatforma.ru",    // Main Frontend (prod)
    "https://admin.zooplatforma.ru", // Admin Frontend (prod) ← ДОБАВИТЬ
    // ... другие origins
}
```

### 2. Разрешить credentials для admin origins

Убедиться что для admin origins разрешены credentials:

```go
w.Header().Set("Access-Control-Allow-Credentials", "true")
```

### 3. Разрешить необходимые headers

```go
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
```

### 4. Разрешить необходимые methods

```go
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
```

## 📝 Пример кода для Gateway

### Вариант 1: Если используется middleware

```go
// middleware.go или cors.go

func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        
        allowedOrigins := []string{
            "http://localhost:3000",           // Main Frontend (dev)
            "http://localhost:4000",           // Admin Frontend (dev)
            "https://zooplatforma.ru",         // Main Frontend (prod)
            "https://www.zooplatforma.ru",     // Main Frontend (prod)
            "https://admin.zooplatforma.ru",   // Admin Frontend (prod)
        }
        
        // Проверяем origin
        originAllowed := false
        for _, allowed := range allowedOrigins {
            if origin == allowed {
                w.Header().Set("Access-Control-Allow-Origin", origin)
                originAllowed = true
                break
            }
        }
        
        // Если origin разрешен, добавляем остальные headers
        if originAllowed {
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
            w.Header().Set("Access-Control-Max-Age", "3600")
        }
        
        // Обработка preflight запросов
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

### Вариант 2: Если CORS настраивается через переменные окружения

Добавить в `.env` Gateway:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,https://zooplatforma.ru,https://admin.zooplatforma.ru
```

И в коде:

```go
allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
```

## ✅ Проверка

После внесения изменений проверить:

```bash
# Preflight запрос
curl -v -X OPTIONS https://api.zooplatforma.ru/api/auth/login \
  -H "Origin: http://localhost:4000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# Должен вернуть:
# Access-Control-Allow-Origin: http://localhost:4000
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, Cookie
```

```bash
# Реальный запрос
curl -v -X POST https://api.zooplatforma.ru/api/auth/login \
  -H "Origin: http://localhost:4000" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Должен вернуть:
# Access-Control-Allow-Origin: http://localhost:4000
# Access-Control-Allow-Credentials: true
```

## 🔒 Безопасность

### Development origins (только для разработки)

```
http://localhost:3000  ← Main Frontend dev
http://localhost:4000  ← Admin Frontend dev
```

**Важно:** Эти origins должны быть разрешены ТОЛЬКО в development окружении!

### Production origins

```
https://zooplatforma.ru         ← Main Frontend prod
https://www.zooplatforma.ru     ← Main Frontend prod (www)
https://admin.zooplatforma.ru   ← Admin Frontend prod
```

### Рекомендация

Использовать разные конфигурации для dev и prod:

```go
var allowedOrigins []string

if os.Getenv("ENVIRONMENT") == "development" {
    allowedOrigins = []string{
        "http://localhost:3000",
        "http://localhost:4000",
        "https://zooplatforma.ru",
        "https://admin.zooplatforma.ru",
    }
} else {
    allowedOrigins = []string{
        "https://zooplatforma.ru",
        "https://www.zooplatforma.ru",
        "https://admin.zooplatforma.ru",
    }
}
```

## 📍 Где вносить изменения

Обычно CORS настраивается в одном из этих файлов:

- `middleware.go` - если используется middleware
- `cors.go` - если есть отдельный файл для CORS
- `main.go` - если CORS настраивается в main
- `router.go` - если CORS настраивается в роутере

## 🚨 Важно

1. **Credentials:** Обязательно установить `Access-Control-Allow-Credentials: true` для работы с cookies
2. **Origin:** Нельзя использовать `*` если нужны credentials
3. **Preflight:** Обязательно обрабатывать OPTIONS запросы
4. **Headers:** Разрешить `Cookie` header для работы с auth_token

## 📞 Контакты

Если нужна помощь с реализацией:
- Посмотрите текущую реализацию CORS в Gateway
- Проверьте какие origins уже разрешены
- Добавьте новые origins по аналогии

## 🔗 Полезные ссылки

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Go CORS middleware examples](https://github.com/rs/cors)

---

**Приоритет:** Высокий (блокирует локальную разработку админ-панели)

**Время на реализацию:** 5-10 минут

**Дата:** 6 февраля 2026
