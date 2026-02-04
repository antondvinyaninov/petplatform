# 🔧 Gateway WebSocket - Полное описание проблемы и решения

> **Дата:** 04.02.2026  
> **Статус:** ❌ WebSocket не работает через Gateway  
> **Приоритет:** КРИТИЧЕСКИЙ

---

## 📊 Текущая ситуация

### ✅ Что работает:
- API запросы через Gateway → Backend (200 OK)
- JWT авторизация в Gateway
- Frontend → Gateway → Backend для всех `/api/*` запросов
- Gateway успешно валидирует JWT токен для WebSocket

### ❌ Что НЕ работает:
- WebSocket соединения через Gateway
- Gateway возвращает **403 Forbidden** для `/ws`
- Backend **НЕ получает** WebSocket запрос (нет логов `🔌 WebSocket request received`)

---

## 🔍 Анализ проблемы

### Логи Gateway:
```
✅ WebSocket auth: user_id=1, email=anton@dvinyaninov.ru
✅ WebSocket proxied for user_id=1
📋 GET /ws 403 3ms
```

**Вывод:** Gateway успешно авторизует пользователя, но `httputil.ReverseProxy` возвращает 403.

### Логи Backend:
```
(нет логов о WebSocket запросе)
```

**Вывод:** Backend вообще не получает WebSocket запрос. Gateway не проксирует его.

### Логи Frontend (браузер):
```
WebSocket connection to 'wss://my-projects-gateway-zp.crv1ic.easypanel.host/ws?token=...' failed
❌ WebSocket error
```

---

## 🎯 Причина проблемы

`httputil.ReverseProxy` **НЕ может** проксировать WebSocket соединения когда Gateway работает за reverse proxy (Easypanel nginx).

**Почему:**
1. WebSocket требует HTTP Upgrade
2. `ReverseProxy.ServeHTTP()` пытается сделать Upgrade
3. Но Easypanel nginx уже сделал Upgrade для клиентского соединения
4. Backend не получает правильный Upgrade request
5. ReverseProxy возвращает 403

---

## 🛠️ Решения

### Решение 1: Добавить ErrorHandler для отладки (ПЕРВЫЙ ШАГ)

**Цель:** Увидеть точную ошибку от ReverseProxy

**В `proxy.go` или где находится `ProxyWebSocketHandler`:**

```go
func ProxyWebSocketHandler(service *Service) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 1. Читаем токен из cookie или query
        var token string
        cookie, err := r.Cookie("auth_token")
        if err == nil {
            token = cookie.Value
        }
        if token == "" {
            token = r.URL.Query().Get("token")
        }
        
        if token == "" {
            log.Printf("❌ WebSocket: no token")
            http.Error(w, "Unauthorized: no token", http.StatusUnauthorized)
            return
        }
        
        // 2. Валидируем токен
        claims, err := validateToken(token)
        if err != nil {
            log.Printf("❌ WebSocket: invalid token: %v", err)
            http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
            return
        }
        
        log.Printf("✅ WebSocket auth: user_id=%d, email=%s", claims.UserID, claims.Email)
        
        // 3. Создаем ReverseProxy
        target, _ := url.Parse(service.URL)
        proxy := httputil.NewSingleHostReverseProxy(target)
        
        // 4. Настраиваем Director
        originalDirector := proxy.Director
        proxy.Director = func(req *http.Request) {
            originalDirector(req)
            req.URL.Path = "/ws"
            req.Host = target.Host
            
            // Добавляем заголовки X-User-*
            req.Header.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
            req.Header.Set("X-User-Email", claims.Email)
            req.Header.Set("X-User-Role", claims.Role)
            
            log.Printf("🔧 WebSocket headers set: X-User-ID=%d", claims.UserID)
        }
        
        // ✅ КРИТИЧНО: Добавляем ErrorHandler для отладки
        proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
            log.Printf("❌ ReverseProxy error for WebSocket: %v", err)
            log.Printf("❌ Request URL: %s", r.URL.String())
            log.Printf("❌ Target: %s", target.String())
            http.Error(w, fmt.Sprintf("Bad Gateway: %v", err), http.StatusBadGateway)
        }
        
        // 5. Проксируем
        proxy.ServeHTTP(w, r)
        
        log.Printf("✅ WebSocket proxied for user_id=%d", claims.UserID)
    }
}
```

**После добавления:**
1. Перезапусти Gateway
2. Попробуй подключить WebSocket
3. Скопируй логи Gateway - там будет строка `❌ ReverseProxy error for WebSocket: ...`
4. Эта ошибка покажет точную причину

---

### Решение 2: Проверить сетевую связность

**Проблема:** Gateway не может подключиться к backend

**Проверка:**

Открой терминал в контейнере Gateway (Easypanel → Terminal) и выполни:

```bash
# Проверь что backend доступен
curl -v http://my-projects-zooplatforma:80/api/health

# Должен вернуть 200 OK
```

Если ошибка `connection refused` или `timeout` - проблема в сети между контейнерами.

**Решение:**
- Проверь что `MAIN_SERVICE_URL=http://my-projects-zooplatforma:80` (не localhost!)
- Проверь что оба сервиса в одной сети Easypanel

---

### Решение 3: Использовать gorilla/websocket с правильной настройкой

**Если ReverseProxy не работает**, нужно вручную проксировать WebSocket через `gorilla/websocket`.

**Проблема с предыдущей попыткой:**
```
❌ Failed to upgrade client connection: websocket: response does not implement http.Hijacker
```

Это происходит когда Gateway за nginx и пытается сделать Upgrade на уже upgraded соединении.

**Правильное решение:**

```go
package main

import (
    "fmt"
    "io"
    "log"
    "net/http"
    "net/url"
    
    "github.com/gorilla/websocket"
)

func ProxyWebSocketHandler(service *Service) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 1. Читаем и валидируем токен (как в Решении 1)
        var token string
        cookie, err := r.Cookie("auth_token")
        if err == nil {
            token = cookie.Value
        }
        if token == "" {
            token = r.URL.Query().Get("token")
        }
        
        if token == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        claims, err := validateToken(token)
        if err != nil {
            log.Printf("❌ Invalid WebSocket token: %v", err)
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        log.Printf("✅ WebSocket auth: user_id=%d", claims.UserID)
        
        // 2. Создаем WebSocket соединение к backend
        backendURL := service.URL
        backendURL = strings.Replace(backendURL, "http://", "ws://", 1)
        backendURL = strings.Replace(backendURL, "https://", "wss://", 1)
        backendURL += "/ws"
        
        // Создаем заголовки для backend
        backendHeaders := http.Header{}
        backendHeaders.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
        backendHeaders.Set("X-User-Email", claims.Email)
        backendHeaders.Set("X-User-Role", claims.Role)
        
        // Подключаемся к backend
        dialer := websocket.Dialer{}
        backendConn, resp, err := dialer.Dial(backendURL, backendHeaders)
        if err != nil {
            log.Printf("❌ Failed to connect to backend WebSocket: %v", err)
            if resp != nil {
                log.Printf("❌ Backend response status: %d", resp.StatusCode)
            }
            http.Error(w, "Backend unavailable", http.StatusBadGateway)
            return
        }
        defer backendConn.Close()
        
        log.Printf("✅ Connected to backend WebSocket for user_id=%d", claims.UserID)
        
        // 3. Upgrade клиентского соединения
        // ВАЖНО: CheckOrigin должен разрешать запросы от frontend
        upgrader := websocket.Upgrader{
            CheckOrigin: func(r *http.Request) bool {
                origin := r.Header.Get("Origin")
                // Разрешаем запросы от frontend доменов
                allowedOrigins := map[string]bool{
                    "https://my-projects-zooplatforma.crv1ic.easypanel.host": true,
                    "https://my-projects-gateway-zp.crv1ic.easypanel.host": true,
                    "http://localhost:3000": true,
                }
                return allowedOrigins[origin]
            },
        }
        
        clientConn, err := upgrader.Upgrade(w, r, nil)
        if err != nil {
            log.Printf("❌ Failed to upgrade client connection: %v", err)
            return
        }
        defer clientConn.Close()
        
        log.Printf("✅ Client WebSocket upgraded for user_id=%d", claims.UserID)
        
        // 4. Проксируем сообщения в обе стороны
        errChan := make(chan error, 2)
        
        // Client -> Backend
        go func() {
            for {
                messageType, message, err := clientConn.ReadMessage()
                if err != nil {
                    if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                        log.Printf("❌ Client read error: %v", err)
                    }
                    errChan <- err
                    return
                }
                
                if err := backendConn.WriteMessage(messageType, message); err != nil {
                    log.Printf("❌ Backend write error: %v", err)
                    errChan <- err
                    return
                }
            }
        }()
        
        // Backend -> Client
        go func() {
            for {
                messageType, message, err := backendConn.ReadMessage()
                if err != nil {
                    if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                        log.Printf("❌ Backend read error: %v", err)
                    }
                    errChan <- err
                    return
                }
                
                if err := clientConn.WriteMessage(messageType, message); err != nil {
                    log.Printf("❌ Client write error: %v", err)
                    errChan <- err
                    return
                }
            }
        }()
        
        // Ждем ошибки или закрытия
        err = <-errChan
        log.Printf("🔌 WebSocket closed for user_id=%d: %v", claims.UserID, err)
    }
}
```

**Преимущества этого подхода:**
- ✅ Полный контроль над WebSocket соединением
- ✅ Правильная обработка Upgrade
- ✅ Работает за nginx reverse proxy
- ✅ Передает заголовки X-User-* в backend
- ✅ Проксирует сообщения в обе стороны

**Недостатки:**
- Требует `gorilla/websocket` зависимость
- Больше кода чем ReverseProxy

---

### Решение 4: Настроить Easypanel nginx для прямого проксирования

**Если ничего не работает**, можно настроить Easypanel nginx для прямого проксирования WebSocket к backend, минуя Gateway.

**НО:** Это обойдет JWT проверку Gateway, поэтому backend должен сам проверять токен.

**Не рекомендуется** - лучше использовать Решение 3.

---

## 📋 План действий

### Шаг 1: Отладка (СЕЙЧАС)
1. ✅ Добавить `ErrorHandler` в Gateway (Решение 1)
2. ✅ Перезапустить Gateway
3. ✅ Попробовать подключить WebSocket
4. ✅ Скопировать логи с ошибкой `❌ ReverseProxy error for WebSocket: ...`

### Шаг 2: Проверка сети
1. ✅ Проверить что backend доступен из Gateway (Решение 2)
2. ✅ Проверить переменную `MAIN_SERVICE_URL`

### Шаг 3: Исправление
1. ✅ Если ReverseProxy не работает - использовать Решение 3 (gorilla/websocket)
2. ✅ Добавить зависимость: `go get github.com/gorilla/websocket`
3. ✅ Заменить `ProxyWebSocketHandler` на код из Решения 3
4. ✅ Перезапустить Gateway

### Шаг 4: Проверка
1. ✅ Frontend подключается к `wss://my-projects-gateway-zp.crv1ic.easypanel.host/ws?token=...`
2. ✅ В логах Gateway: `✅ Connected to backend WebSocket for user_id=1`
3. ✅ В логах Backend: `🔌 WebSocket request received`, `✅ WebSocket upgraded successfully`
4. ✅ В браузере: `✅ WebSocket connected`

---

## 🔍 Ожидаемые логи после исправления

### Gateway:
```
✅ WebSocket auth: user_id=1, email=anton@dvinyaninov.ru
✅ Connected to backend WebSocket for user_id=1
✅ Client WebSocket upgraded for user_id=1
```

### Backend:
```
🔌 WebSocket request received from 10.11.0.13:12345
🔌 WebSocket headers: X-User-ID=1, Authorization=, token=
✅ Using headers from Gateway
✅ User from Gateway: id=1, email=anton@dvinyaninov.ru, role=user
✅ WebSocket: userID=1 from context
✅ WebSocket upgraded successfully for user 1
🔌 WebSocket: User 1 connected (total: 1)
```

### Frontend (браузер):
```
🔌 Connecting to WebSocket: wss://my-projects-gateway-zp.crv1ic.easypanel.host/ws?token=TOKEN_HIDDEN
✅ WebSocket connected
```

---

## 📞 Контакты для вопросов

Если нужна помощь:
1. Скопируй логи Gateway с ошибкой `❌ ReverseProxy error`
2. Скопируй логи Backend (если есть)
3. Скопируй ошибку из браузера (DevTools → Console)

---

## 📚 Полезные ссылки

- [gorilla/websocket документация](https://github.com/gorilla/websocket)
- [Go httputil.ReverseProxy](https://pkg.go.dev/net/http/httputil#ReverseProxy)
- [WebSocket RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)

---

**Последнее обновление:** 04.02.2026  
**Статус:** Ожидает добавления ErrorHandler для отладки
