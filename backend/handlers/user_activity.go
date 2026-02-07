package handlers

import (
	"net/http"
)

// UserActivityHandler - получение логов активности пользователей
func UserActivityHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Получаем параметры запроса
	query := r.URL.Query().Encode()
	endpoint := "/api/admin/user-activity"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}
