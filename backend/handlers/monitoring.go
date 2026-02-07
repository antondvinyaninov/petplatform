package handlers

import (
	"net/http"
)

// GetRecentErrorsHandler - получение последних ошибок
func GetRecentErrorsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	query := r.URL.Query().Encode()
	endpoint := "/api/monitoring/errors"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}

// GetSystemMetricsHandler - получение системных метрик
func GetSystemMetricsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	data, err := client.Get("/api/monitoring/metrics")
	proxyGatewayResponse(w, data, err)
}

// GetErrorStatsByServiceHandler - статистика ошибок по сервисам
func GetErrorStatsByServiceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	data, err := client.Get("/api/monitoring/error-stats")
	proxyGatewayResponse(w, data, err)
}
