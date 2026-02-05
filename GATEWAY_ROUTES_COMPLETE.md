# 🔧 Gateway - Полный список роутов для проксирования

## ✅ Статус реализации: ВСЕ РОУТЫ ДОБАВЛЕНЫ

**Последняя проверка:** 05.02.2026  
**Версия Gateway:** 1.2.1

## Обязательные роуты которые Gateway должен проксировать к Main Service

### 1. Авторизация (Auth) ✅ РЕАЛИЗОВАНО
```go
// Gateway обрабатывает сам, НЕ проксирует:
// ✅ /api/auth/register
// ✅ /api/auth/login
// ✅ /api/auth/logout
// ✅ /api/auth/me (читает свежие данные из БД)
// ✅ /api/auth/profile (обновление профиля - PUT/PATCH)

// Gateway проксирует:
// ✅ Все остальные /api/auth/* через PathPrefix
```

### 2. Пользователи (Users) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/users").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/users
// - /api/users/:id
// - /api/users/stats
```

### 3. Профиль (Profile) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/profile").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/profile
// - /api/profile/avatar
// - /api/profile/avatar/delete
// - /api/profile/cover
// - /api/profile/cover/delete
```

### 4. Посты (Posts) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/posts").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/posts
// - /api/posts/:id
// - /api/posts/drafts
```

### 5. Комментарии (Comments) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/comments").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/comments/:id
// - /api/comments/post/:post_id
```

### 6. Опросы (Polls) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/polls").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - ✅ /api/polls/:id
// - ✅ /api/polls/post/:post_id
// - ✅ /api/polls/:poll_id/vote
```

**Endpoints:**
- ✅ `GET /api/polls/post/:post_id` - получить опрос для поста
- ✅ `POST /api/polls/:poll_id/vote` - проголосовать
- ✅ `DELETE /api/polls/:poll_id/vote` - отменить голос

### 7. Питомцы (Pets) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/pets").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/pets
// - /api/pets/:id
// - /api/pets/user/:user_id
// - /api/pets/curated/:id
```

### 8. Объявления (Announcements) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/announcements").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/announcements
// - /api/announcements/:id
// - /api/announcements/posts/:id
// - /api/announcements/donations/:id
```

### 9. Друзья (Friends) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/friends").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/friends
// - /api/friends/:id
// - /api/friends/requests
// - /api/friends/send
// - /api/friends/accept
// - /api/friends/reject
// - /api/friends/remove
// - /api/friends/status
```

### 10. Уведомления (Notifications) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/notifications").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/notifications
// - /api/notifications/:id
// - /api/notifications/unread
// - /api/notifications/read-all
```

### 11. Организации (Organizations) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/organizations").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/organizations
// - /api/organizations/:id
// - /api/organizations/all
// - /api/organizations/my
// - /api/organizations/user/:user_id
// - /api/organizations/members/:org_id
// - /api/organizations/members/add
// - /api/organizations/members/update
// - /api/organizations/members/remove
// - /api/organizations/claim-ownership/:org_id
// - /api/organizations/check-inn/:inn
```

### 12. Мессенджер (Messenger) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/chats").HandlerFunc(ProxyHandler(mainService))
// ✅ apiRouter.PathPrefix("/messages").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/chats
// - /api/chats/:id
// - /api/messages/:id
// - /api/messages/send
// - /api/messages/send-media
// - /api/messages/unread
```

### 13. WebSocket ✅ РЕАЛИЗОВАНО
```go
// ✅ router.HandleFunc("/ws", WebSocketProxyHandler(mainService)).Methods("GET")
```

**Примечание:** WebSocket использует специальный handler `WebSocketProxyHandler` для проксирования WebSocket соединений с поддержкой авторизации.

### 14. Избранное (Favorites) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/favorites").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/favorites
// - /api/favorites/:id
```

### 15. Роли (Roles) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/roles").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/roles/:id
// - /api/roles/available
// - /api/roles/user/:user_id
// - /api/roles/grant
// - /api/roles/revoke
```

### 16. Верификация (Verification) ✅ РЕАЛИЗОВАНО
```go
// ✅ apiRouter.PathPrefix("/verification").HandlerFunc(ProxyHandler(mainService))
// Покрывает все эндпоинты:
// - /api/verification/:id
// - /api/verification/verify
// - /api/verification/unverify
```

### 17. Health Check ✅ РЕАЛИЗОВАНО
```go
// ✅ router.HandleFunc("/health", HealthCheckHandler).Methods("GET", "OPTIONS")
// ✅ router.HandleFunc("/ping", ...).Methods("GET", "OPTIONS")
```

**Endpoints:**
- ✅ `GET /health` - Проверка здоровья всех сервисов (с деталями)
- ✅ `GET /ping` - Быстрая проверка доступности Gateway

---

## ✅ Текущая реализация в Gateway

Gateway использует **PathPrefix** для упрощенной конфигурации, что покрывает все необходимые роуты:

```go
// router.go - актуальная реализация

// 1. Health checks
router.HandleFunc("/health", HealthCheckHandler).Methods("GET", "OPTIONS")
router.HandleFunc("/ping", ...).Methods("GET", "OPTIONS")

// 2. WebSocket
router.HandleFunc("/ws", WebSocketProxyHandler(mainService)).Methods("GET")

// 3. Auth endpoints (Gateway обрабатывает сам)
authRouter.HandleFunc("/register", RegisterHandler).Methods("POST", "OPTIONS")
authRouter.HandleFunc("/login", LoginHandler).Methods("POST", "OPTIONS")
authRouter.HandleFunc("/logout", LogoutHandler).Methods("POST", "OPTIONS")
authRouter.HandleFunc("/me", AuthMiddlewareFunc(MeHandler)).Methods("GET", "OPTIONS")
authRouter.HandleFunc("/profile", AuthMiddlewareFunc(UpdateProfileHandler)).Methods("PUT", "PATCH", "OPTIONS")

// 4. API endpoints (проксируются на Main Service)
apiRouter.PathPrefix("/posts").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/profile").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/users").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/pets").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/organizations").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/comments").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/likes").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/favorites").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/friends").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/notifications").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/chats").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/messages").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/announcements").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/polls").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/reports").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/roles").HandlerFunc(ProxyHandler(mainService))
apiRouter.PathPrefix("/verification").HandlerFunc(ProxyHandler(mainService))

// 5. Admin endpoints
adminRouter.PathPrefix("/").HandlerFunc(ProxyHandler(mainService))
```

**Преимущества PathPrefix:**
- ✅ Покрывает все подроуты автоматически
- ✅ Не нужно добавлять каждый эндпоинт вручную
- ✅ Легко поддерживать и расширять

---

## Минимальный набор роутов (если нужно упростить)

Если хочешь упростить конфигурацию, можно использовать wildcard роуты:

```go
// Авторизация - Gateway обрабатывает сам
mux.HandleFunc("/api/auth/register", handlers.RegisterHandler(db))
mux.HandleFunc("/api/auth/login", handlers.LoginHandler(db))
mux.HandleFunc("/api/auth/me", handlers.MeHandler(db))

// Все остальное - проксируем к Main Service
mux.HandleFunc("/api/", proxyToMainService(mainServiceURL))
mux.HandleFunc("/ws", proxyWebSocketToMainService(mainServiceURL))
```

**ВАЖНО:** При использовании wildcard роута `/api/` убедись что роуты авторизации зарегистрированы ПЕРЕД ним!

---

## Проверка

После настройки роутов проверь что все работает:

```bash
# Опросы
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/polls/post/12 \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Мессенджер
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/chats \
  -H "Cookie: auth_token=YOUR_TOKEN"

# Посты
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/posts

# Друзья
curl https://my-projects-gateway-zp.crv1ic.easypanel.host/api/friends \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

---

## CORS заголовки ✅ РЕАЛИЗОВАНО

Gateway использует CORS middleware для всех роутов:

```go
// middleware.go - актуальная реализация

func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        
        allowedOrigins := map[string]bool{
            "http://localhost:3000": true,
            "https://my-projects-zooplatforma.crv1ic.easypanel.host": true,
            "https://my-projects-gateway-zp.crv1ic.easypanel.host": true,
        }
        
        if allowedOrigins[origin] {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-User-ID, X-User-Email, X-User-Role")
            w.Header().Set("Access-Control-Max-Age", "3600")
        }
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

**Особенности:**
- ✅ Поддержка credentials (cookies)
- ✅ Разрешены все необходимые методы
- ✅ Разрешены заголовки X-User-* для передачи информации о пользователе
- ✅ Preflight запросы обрабатываются корректно

---

**Последнее обновление:** 05.02.2026  
**Статус:** ✅ ВСЕ РОУТЫ РЕАЛИЗОВАНЫ И ПРОТЕСТИРОВАНЫ
