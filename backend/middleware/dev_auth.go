package middleware

import (
	"context"
	"backend/db"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// DevAuthMiddleware - middleware для локальной разработки
// Имитирует Gateway: проверяет JWT токен и добавляет X-User-* заголовки
func DevAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Проверяем есть ли заголовки от Gateway
		// Если есть - значит работаем через Gateway, используем их
		if r.Header.Get("X-User-ID") != "" {
			log.Printf("✅ Using headers from Gateway")
			AuthMiddleware(next)(w, r)
			return
		}

		// Если нет заголовков от Gateway - работаем в dev режиме
		// Проверяем JWT токен из Authorization заголовка или cookie
		var tokenString string

		// 1. Проверяем Authorization заголовок
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// 2. Если нет в заголовке - проверяем cookie
		if tokenString == "" {
			cookie, err := r.Cookie("auth_token")
			if err == nil {
				tokenString = cookie.Value
			}
		}

		// 3. Если токена нет - 401
		if tokenString == "" {
			log.Printf("⚠️ No token found (dev mode)")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"success":false,"error":"Unauthorized"}`))
			return
		}

		// 4. Валидируем JWT токен
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			log.Printf("❌ JWT_SECRET not set")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"success":false,"error":"Server configuration error"}`))
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			log.Printf("❌ Invalid token (dev mode): %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"success":false,"error":"Invalid token"}`))
			return
		}

		// 5. Извлекаем claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Printf("❌ Invalid token claims (dev mode)")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"success":false,"error":"Invalid token"}`))
			return
		}

		// 6. Проверяем expiration
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				log.Printf("❌ Token expired (dev mode)")
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"success":false,"error":"Token expired"}`))
				return
			}
		}

		// 7. Извлекаем данные пользователя
		userID := int(claims["user_id"].(float64))
		userEmail := claims["email"].(string)
		userRole := claims["role"].(string)

		// ✅ Обновляем активность пользователя
		updateDevUserActivity(userID)

		// 8. Добавляем данные в контекст (как Gateway)
		ctx := context.WithValue(r.Context(), "userID", userID)
		ctx = context.WithValue(ctx, "userEmail", userEmail)
		ctx = context.WithValue(ctx, "userRole", userRole)

		log.Printf("✅ Dev auth: id=%d, email=%s, role=%s", userID, userEmail, userRole)

		next(w, r.WithContext(ctx))
	}
}

// updateDevUserActivity обновляет время последней активности пользователя в dev режиме
func updateDevUserActivity(userID int) {
	query := convertPlaceholdersDevAuth(`
		INSERT INTO user_activity (user_id, last_seen)
		VALUES (?, NOW())
		ON CONFLICT(user_id) DO UPDATE SET
			last_seen = NOW()
	`)

	_, err := db.DB.Exec(query, userID)
	if err != nil {
		log.Printf("⚠️ Failed to update user activity for user %d: %v", userID, err)
	}
}

// convertPlaceholdersDevAuth конвертирует ? в $1, $2, $3 для PostgreSQL
func convertPlaceholdersDevAuth(query string) string {
	if os.Getenv("ENVIRONMENT") == "production" {
		result := ""
		paramNum := 1
		for _, char := range query {
			if char == '?' {
				result += fmt.Sprintf("$%d", paramNum)
				paramNum++
			} else {
				result += string(char)
			}
		}
		return result
	}
	return query
}

// DevOptionalAuthMiddleware - опциональная авторизация для dev режима
// Если токен есть - добавляет userID в контекст
// Если токена нет - пропускает запрос без userID (userID = 0)
func DevOptionalAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var tokenString string

		// 1. Проверяем Authorization заголовок
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// 2. Если нет в заголовке - проверяем cookie
		if tokenString == "" {
			cookie, err := r.Cookie("auth_token")
			if err == nil {
				tokenString = cookie.Value
			}
		}

		// 3. Если токена нет - пропускаем без авторизации
		if tokenString == "" {
			next(w, r)
			return
		}

		// 4. Валидируем JWT токен
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			next(w, r)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			// Токен невалидный - пропускаем без авторизации
			next(w, r)
			return
		}

		// 5. Извлекаем claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			next(w, r)
			return
		}

		// 6. Проверяем expiration
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				// Токен истек - пропускаем без авторизации
				next(w, r)
				return
			}
		}

		// 7. Извлекаем данные пользователя и добавляем в контекст
		userID := int(claims["user_id"].(float64))
		userEmail := claims["email"].(string)
		userRole := claims["role"].(string)

		// ✅ Обновляем активность пользователя
		updateDevUserActivity(userID)

		ctx := context.WithValue(r.Context(), "userID", userID)
		ctx = context.WithValue(ctx, "userEmail", userEmail)
		ctx = context.WithValue(ctx, "userRole", userRole)

		log.Printf("✅ Optional auth (dev): id=%d, email=%s", userID, userEmail)

		next(w, r.WithContext(ctx))
	}
}
