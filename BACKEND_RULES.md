# Правила работы Backend с Gateway

## ✅ Что должен делать Backend

### 1. Читать заголовки X-User-*

Backend **НЕ проверяет JWT токены**. Вместо этого он читает заголовки, которые Gateway добавляет:

```go
// Go example
userID := r.Header.Get("X-User-ID")
userEmail := r.Header.Get("X-User-Email")
userRole := r.Header.Get("X-User-Role")
```

```python
# Python/FastAPI example
user_id = request.headers.get("X-User-ID")
user_email = request.headers.get("X-User-Email")
user_role = request.headers.get("X-User-Role")
```

```javascript
// Node.js/Express example
const userId = req.headers['x-user-id'];
const userEmail = req.headers['x-user-email'];
const userRole = req.headers['x-user-role'];
```

### 2. Доверять Gateway

Backend должен **полностью доверять** заголовкам от Gateway, потому что:
- Gateway проверил JWT токен
- Gateway получил пользователя из БД
- Backend недоступен напрямую (только через Gateway)

### 3. Возвращать JSON

Backend возвращает обычный JSON без дополнительных заголовков:

```json
{
  "success": true,
  "data": { ... }
}
```

### 4. Health check endpoint

Backend должен иметь endpoint `/api/health`:

```go
// Go example
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "status": "healthy",
    })
}
```

## ❌ Что НЕ должен делать Backend

### 1. НЕ проверять JWT токены

```go
// ❌ НЕПРАВИЛЬНО - Backend НЕ должен проверять JWT
token := r.Header.Get("Authorization")
jwt.Parse(token, ...) // НЕ ДЕЛАЙТЕ ЭТО!

// ✅ ПРАВИЛЬНО - Backend читает X-User-ID
userID := r.Header.Get("X-User-ID")
```

### 2. НЕ устанавливать CORS заголовки

```go
// ❌ НЕПРАВИЛЬНО - Backend НЕ должен устанавливать CORS
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Credentials", "true")

// ✅ ПРАВИЛЬНО - Backend просто возвращает данные
json.NewEncoder(w).Encode(data)
```

**Почему?** Gateway управляет CORS и фильтрует все `Access-Control-*` заголовки от backend. Если backend тоже установит CORS, это приведет к дублированию заголовков и ошибкам в браузере.

### 3. НЕ требовать авторизацию

```go
// ❌ НЕПРАВИЛЬНО - Backend НЕ должен требовать Authorization header
if r.Header.Get("Authorization") == "" {
    return errors.New("unauthorized")
}

// ✅ ПРАВИЛЬНО - Backend читает X-User-ID
userID := r.Header.Get("X-User-ID")
if userID == "" {
    return errors.New("user not authenticated")
}
```

### 4. НЕ быть доступным напрямую

Backend должен быть доступен **только через Gateway**:
- В Docker: используйте внутреннюю сеть
- В Kubernetes: используйте ClusterIP сервисы
- Не открывайте порты backend наружу

## 🔐 Безопасность

### Проверка X-User-ID

Backend должен проверять что `X-User-ID` присутствует:

```go
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        userID := r.Header.Get("X-User-ID")
        if userID == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    }
}
```

### Проверка роли

Для админских endpoint'ов проверяйте `X-User-Role`:

```go
func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        role := r.Header.Get("X-User-Role")
        if role != "admin" && role != "superadmin" {
            http.Error(w, "Forbidden", http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    }
}
```

## 📝 Примеры

### Публичный endpoint (без авторизации)

```go
// GET /api/posts - просмотр постов (публичный)
func GetPostsHandler(w http.ResponseWriter, r *http.Request) {
    posts := getAllPosts()
    json.NewEncoder(w).Encode(posts)
}
```

### Защищенный endpoint

```go
// POST /api/posts - создание поста (требует авторизацию)
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
    // Читаем user_id из заголовка
    userID := r.Header.Get("X-User-ID")
    if userID == "" {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    // Создаем пост от имени пользователя
    post := createPost(userID, ...)
    json.NewEncoder(w).Encode(post)
}
```

### Админский endpoint

```go
// DELETE /api/admin/posts/:id - удаление поста (только admin)
func DeletePostHandler(w http.ResponseWriter, r *http.Request) {
    // Проверяем роль
    role := r.Header.Get("X-User-Role")
    if role != "admin" && role != "superadmin" {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Удаляем пост
    deletePost(postID)
    json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
```

## 🎯 Итого

**Backend должен:**
- ✅ Читать `X-User-ID`, `X-User-Email`, `X-User-Role`
- ✅ Доверять этим заголовкам
- ✅ Иметь `/api/health` endpoint
- ✅ Возвращать обычный JSON

**Backend НЕ должен:**
- ❌ Проверять JWT токены
- ❌ Устанавливать CORS заголовки
- ❌ Требовать Authorization header
- ❌ Быть доступным напрямую

**Gateway делает:**
- ✅ Проверяет JWT токены
- ✅ Добавляет `X-User-*` заголовки
- ✅ Управляет CORS
- ✅ Проксирует запросы на backend
