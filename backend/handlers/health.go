package handlers

import (
	"net/http"
)

// HealthCheckHandler - проверка здоровья всех сервисов
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	data, err := client.Get("/api/health")
	proxyGatewayResponse(w, data, err)
}
