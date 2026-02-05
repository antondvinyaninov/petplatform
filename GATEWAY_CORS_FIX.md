# 🔧 Gateway CORS Fix - Messenger не работает

## Проблема

Мессенджер не работает на продакшене из-за CORS ошибки:

```
Access to fetch at 'https://my-projects-gateway-zp.crv1ic.easypanel.host/api/chats' 
from origin 'https://my-projects-zooplatforma.crv1ic.easypanel.host' 
has been blocked by CORS policy
```

## Причина

Gateway не добавляет заголовок `Access-Control-Allow-Origin` для запросов к `/api/chats` и `/api/messages`.

## Решение

### 1. Проверить ALLOWED_ORIGINS в Gateway

В Easypanel → Gateway (my-projects-gateway-zp) → Environment Variables:

```bash
ALLOWED_ORIGINS=https://my-projects-zooplatforma.crv1ic.easypanel.host,http://localhost:3000
```

**ВАЖНО:** URL должен быть БЕЗ trailing slash!

### 2. Проверить CORS middleware в Gateway

В файле `main.go` Gateway должен быть CORS middleware:

```go
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
        
        // Проверяем разрешен ли origin
        for _, allowed := range allowedOrigins {
            if strings.TrimSpace(allowed) == origin {
                w.Header().Set("Access-Control-Allow-Origin", origin)
                w.Header().Set("Access-Control-Allow-Credentials", "true")
                w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-ID, X-User-Email, X-User-Role")
                break
            }
        }
        
        // Обрабатываем preflight запросы
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

### 3. Применить CORS middleware ко ВСЕМ роутам

```go
// В main.go Gateway
mux := http.NewServeMux()

// Регистрируем роуты
mux.HandleFunc("/api/auth/login", handlers.LoginHandler(db))
mux.HandleFunc("/api/auth/register", handlers.RegisterHandler(db))
mux.HandleFunc("/api/auth/me", handlers.MeHandler(db))

// ✅ Добавляем CORS middleware для ВСЕХ роутов
handler := corsMiddleware(mux)

// Запускаем сервер
log.Fatal(http.ListenAndServe(":"+port, handler))
```

### 4. Проверить что Gateway проксирует /api/chats и /api/messages

В Gateway должны быть роуты для мессенджера:

```go
// Мессенджер
mux.HandleFunc("/api/chats", proxyToMainService(mainServiceURL))
mux.HandleFunc("/api/chats/", proxyToMainService(mainServiceURL))
mux.HandleFunc("/api/messages/", proxyToMainService(mainServiceURL))
```

### 5. Перезапустить Gateway

После изменений перезапусти Gateway в Easypanel.

## Проверка

После исправления проверь в браузере:

1. Открой DevTools → Network
2. Перейди на страницу мессенджера
3. Найди запрос к `/api/chats`
4. Проверь Response Headers:
   ```
   Access-Control-Allow-Origin: https://my-projects-zooplatforma.crv1ic.easypanel.host
   Access-Control-Allow-Credentials: true
   ```

## Альтернативное решение (если Gateway не поддерживает CORS)

Если Gateway не может добавить CORS заголовки, можно настроить Nginx в Main Service чтобы он добавлял CORS заголовки:

```nginx
location /api/ {
    # CORS headers
    add_header 'Access-Control-Allow-Origin' 'https://my-projects-zooplatforma.crv1ic.easypanel.host' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    proxy_pass http://localhost:8000;
    # ... остальные proxy настройки
}
```

---

**Последнее обновление:** 05.02.2026
