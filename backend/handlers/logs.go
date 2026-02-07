package handlers

import (
	"net/http"
)

// AdminLogsHandler - получение логов администраторов
func AdminLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Получаем параметры запроса (фильтры, пагинация)
	query := r.URL.Query().Encode()
	endpoint := "/api/admin/logs"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}

// AdminLogsStatsHandler - получение статистики логов
func AdminLogsStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	data, err := client.Get("/api/admin/logs/stats")
	proxyGatewayResponse(w, data, err)
}
