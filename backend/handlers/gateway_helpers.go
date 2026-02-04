package handlers

import (
	"net/http"
	"strconv"
)

// GetUserIDFromGateway получает user_id из заголовка X-User-ID (установленного Gateway)
// Возвращает user_id и true если пользователь авторизован, или 0 и false если нет
func GetUserIDFromGateway(r *http.Request) (int, bool) {
	// Сначала пробуем получить из контекста (dev режим с DevAuthMiddleware)
	if userID, ok := r.Context().Value("userID").(int); ok && userID > 0 {
		return userID, true
	}

	// Если нет в контексте - пробуем из заголовка (production с Gateway)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		return 0, false
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return 0, false
	}

	return userID, true
}

// GetUserEmailFromGateway получает email из заголовка X-User-Email
func GetUserEmailFromGateway(r *http.Request) string {
	return r.Header.Get("X-User-Email")
}

// GetUserRoleFromGateway получает роль из заголовка X-User-Role
func GetUserRoleFromGateway(r *http.Request) string {
	return r.Header.Get("X-User-Role")
}

// RequireAuth проверяет что пользователь авторизован (для использования в handlers)
// Если не авторизован - отправляет ошибку и возвращает false
func RequireAuth(w http.ResponseWriter, r *http.Request) (int, bool) {
	userID, ok := GetUserIDFromGateway(r)
	if !ok {
		sendError(w, "Unauthorized", http.StatusUnauthorized)
		return 0, false
	}
	return userID, true
}
