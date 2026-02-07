package handlers

import (
	"admin/middleware"
	"encoding/json"
	"net/http"
)

type AdminResponse struct {
	ID    int      `json:"id"`
	Name  string   `json:"name"`
	Email string   `json:"email"`
	Roles []string `json:"roles"`
}

// AdminMeHandler - получить текущего админа через gateway
func AdminMeHandler(w http.ResponseWriter, r *http.Request) {
	// Получаем данные из контекста (уже проверены middleware)
	roles, ok := r.Context().Value("roles").([]string)
	if !ok {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Проверяем наличие роли superadmin
	hasSuperAdmin := false
	for _, role := range roles {
		if role == "superadmin" {
			hasSuperAdmin = true
			break
		}
	}

	if !hasSuperAdmin {
		sendError(w, "Доступ запрещен. Требуются права суперадмина", http.StatusForbidden)
		return
	}

	// Получаем дополнительные данные пользователя через gateway
	authToken, err := middleware.GetAuthTokenFromRequest(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	client := middleware.NewGatewayClient(authToken)
	userData, err := client.Get("/api/auth/me")
	if err != nil {
		sendError(w, "Ошибка получения данных пользователя", http.StatusInternalServerError)
		return
	}

	// Парсим ответ от gateway
	var gatewayResp struct {
		Success bool `json:"success"`
		Data    struct {
			User struct {
				ID     int      `json:"id"`
				Email  string   `json:"email"`
				Name   string   `json:"name"`
				Roles  []string `json:"roles"`
				Avatar string   `json:"avatar"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.Unmarshal(userData, &gatewayResp); err != nil {
		sendError(w, "Ошибка парсинга данных", http.StatusInternalServerError)
		return
	}

	if !gatewayResp.Success {
		sendError(w, "Ошибка получения данных пользователя", http.StatusInternalServerError)
		return
	}

	sendSuccess(w, AdminResponse{
		ID:    gatewayResp.Data.User.ID,
		Name:  gatewayResp.Data.User.Name,
		Email: gatewayResp.Data.User.Email,
		Roles: gatewayResp.Data.User.Roles,
	})
}

// AdminLogoutHandler - выход из системы
func AdminLogoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Удаляем cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		MaxAge:   -1,
	})

	sendSuccess(w, map[string]string{"message": "Logged out successfully"})
}

func sendSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
	})
}
