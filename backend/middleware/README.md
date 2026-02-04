# JWT Middleware

Улучшенный middleware для проверки JWT токенов с поддержкой Gateway.

## Использование

### 1. Обязательная авторизация

```go
import "backend/middleware"

// Создаем конфигурацию
jwtConfig := middleware.DefaultJWTConfig()

// Применяем к роуту
http.HandleFunc("/api/posts", middleware.JWTMiddleware(jwtConfig)(handlers.GetPostsHandler))
```

### 2. Опциональная авторизация

```go
// Для публичных эндпоинтов, где авторизация опциональна
http.HandleFunc("/api/posts/public", middleware.OptionalJWTMiddleware(jwtConfig)(handlers.GetPublicPostsHandler))
```

### 3. Кастомная конфигурация

```go
jwtConfig := middleware.JWTConfig{
    Secret:      os.Getenv("JWT_SECRET"),
    TokenLookup: "header:Authorization,cookie:auth_token",
    AuthScheme:  "Bearer",
    ContextKey:  "user",
    SkipperFunc: func(r *http.Request) bool {
        // Пропускаем health check
        return r.URL.Path == "/api/health"
    },
    ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
        // Кастомная обработка ошибок
        log.Printf("Auth error: %v", err)
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Unauthorized",
        })
    },
}
```

### 4. Получение данных пользователя

```go
func MyHandler(w http.ResponseWriter, r *http.Request) {
    // Получаем userID из контекста
    userID, ok := middleware.GetUserIDFromContext(r.Context())
    if !ok {
        // Пользователь не авторизован
        return
    }
    
    // Получаем email
    email, _ := middleware.GetUserEmailFromContext(r.Context())
    
    // Получаем все claims
    claims, _ := middleware.GetClaimsFromContext(r.Context())
    
    // Используем данные
    log.Printf("User %d (%s) accessed endpoint", userID, email)
}
```

## Преимущества

1. **Автоматическая поддержка Gateway** - проверяет X-User-* заголовки
2. **Множественные источники токенов** - header, cookie, query параметр
3. **Переиспользуемая конфигурация** - один конфиг для всех роутов
4. **Типобезопасность** - helper функции для извлечения данных
5. **Гибкая настройка** - кастомные error handlers, skippers
6. **Автоматическое обновление активности** - встроенная логика

## Миграция со старого middleware

### Было:
```go
http.HandleFunc("/api/posts", middleware.DevAuthMiddleware(handlers.GetPostsHandler))
```

### Стало:
```go
jwtConfig := middleware.DefaultJWTConfig()
http.HandleFunc("/api/posts", middleware.JWTMiddleware(jwtConfig)(handlers.GetPostsHandler))
```

### Получение userID:

**Было:**
```go
userID := r.Context().Value("userID").(int)
```

**Стало:**
```go
userID, ok := middleware.GetUserIDFromContext(r.Context())
if !ok {
    // handle error
}
```
