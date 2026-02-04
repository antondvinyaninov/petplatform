package middleware

import (
	"context"
	"backend/db"
	"fmt"
	"log"
	"net/http"
	"os"
)

// AuthMiddleware читает данные пользователя из заголовков Gateway
// Gateway уже проверил JWT и добавил X-User-* заголовки
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Читаем заголовки от Gateway
		userIDStr := r.Header.Get("X-User-ID")
		userEmail := r.Header.Get("X-User-Email")
		userRole := r.Header.Get("X-User-Role")

		// Если заголовков нет - пользователь не авторизован
		if userIDStr == "" {
			log.Printf("⚠️ No X-User-ID header from Gateway")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"success":false,"error":"Unauthorized"}`))
			return
		}

		// Конвертируем userID в int
		var userID int
		if _, err := fmt.Sscanf(userIDStr, "%d", &userID); err != nil {
			log.Printf("❌ Invalid X-User-ID: %s", userIDStr)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"success":false,"error":"Unauthorized"}`))
			return
		}

		// ✅ Обновляем активность пользователя
		updateUserActivity(userID)

		// ✅ Добавляем данные пользователя в контекст
		ctx := context.WithValue(r.Context(), "userID", userID)
		ctx = context.WithValue(ctx, "userEmail", userEmail)
		ctx = context.WithValue(ctx, "userRole", userRole)

		log.Printf("✅ User from Gateway: id=%d, email=%s, role=%s", userID, userEmail, userRole)

		// Передаем управление следующему handler
		next(w, r.WithContext(ctx))
	}
}

// updateUserActivity обновляет время последней активности пользователя
func updateUserActivity(userID int) {
	query := convertPlaceholders(`
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

// convertPlaceholders конвертирует ? в $1, $2, $3 для PostgreSQL
func convertPlaceholders(query string) string {
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

// OptionalAuthMiddleware - опциональная авторизация (не требует токен)
// Работает и через Gateway (X-User-* заголовки) и в dev режиме (JWT токен)
func OptionalAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Проверяем есть ли заголовки от Gateway
		userIDStr := r.Header.Get("X-User-ID")

		// Если есть заголовки от Gateway - используем их
		if userIDStr != "" {
			userEmail := r.Header.Get("X-User-Email")
			userRole := r.Header.Get("X-User-Role")

			var userID int
			if _, err := fmt.Sscanf(userIDStr, "%d", &userID); err == nil {
				// ✅ Обновляем активность пользователя
				updateUserActivity(userID)

				ctx := context.WithValue(r.Context(), "userID", userID)
				ctx = context.WithValue(ctx, "userEmail", userEmail)
				ctx = context.WithValue(ctx, "userRole", userRole)
				log.Printf("✅ Optional auth (Gateway): id=%d, email=%s", userID, userEmail)
				next(w, r.WithContext(ctx))
				return
			}
		}

		// Dev режим - проверяем JWT токен (опционально)
		// Вызываем DevAuthMiddleware но без требования токена
		DevOptionalAuthMiddleware(next)(w, r)
	}
}
