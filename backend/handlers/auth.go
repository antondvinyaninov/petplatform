package handlers

import (
	"admin/middleware"
	"encoding/json"
	"fmt"
	"net/http"
)

type AdminResponse struct {
	ID    int      `json:"id"`
	Name  string   `json:"name"`
	Email string   `json:"email"`
	Roles []string `json:"roles"`
}

// AdminMeHandler - получить текущего пользователя через gateway
func AdminMeHandler(w http.ResponseWriter, r *http.Request) {
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

	// Логируем сырой ответ от Gateway
	fmt.Printf("📦 [Auth/Me] Gateway raw response: %s\n", string(userData))

	// Парсим ответ от gateway
	var gatewayResp struct {
		Success bool `json:"success"`
		User    struct {
			ID       int    `json:"id"`
			Email    string `json:"email"`
			Name     string `json:"name"`
			LastName string `json:"last_name"`
			Avatar   string `json:"avatar"`
			Role     string `json:"role"`
		} `json:"user"`
	}

	if err := json.Unmarshal(userData, &gatewayResp); err != nil {
		fmt.Printf("❌ [Auth/Me] Failed to parse: %v\n", err)
		sendError(w, "Ошибка парсинга данных", http.StatusInternalServerError)
		return
	}

	if !gatewayResp.Success {
		sendError(w, "Ошибка получения данных пользователя", http.StatusInternalServerError)
		return
	}

	// Логируем данные пользователя
	fmt.Printf("👤 [Auth/Me] User data: id=%d, email=%s, name=%s, last_name=%s, avatar=%s\n",
		gatewayResp.User.ID,
		gatewayResp.User.Email,
		gatewayResp.User.Name,
		gatewayResp.User.LastName,
		gatewayResp.User.Avatar,
	)

	// Возвращаем в формате {success: true, user: {...}}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]interface{}{
			"id":         gatewayResp.User.ID,
			"email":      gatewayResp.User.Email,
			"first_name": gatewayResp.User.Name,
			"last_name":  gatewayResp.User.LastName,
			"name":       gatewayResp.User.Name + " " + gatewayResp.User.LastName,
			"avatar_url": gatewayResp.User.Avatar,
			"role":       gatewayResp.User.Role,
		},
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
