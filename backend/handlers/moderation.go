package handlers

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// GetReportsHandler - получение списка жалоб
func GetReportsHandler(w http.ResponseWriter, r *http.Request) {
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
	endpoint := "/api/moderation/reports"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}

// ReviewReportHandler - рассмотрение жалобы
func ReviewReportHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	reportID := vars["id"]

	if reportID == "" {
		sendError(w, "Неверный ID жалобы", http.StatusBadRequest)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	var body map[string]interface{}
	if err := parseJSONBody(r, &body); err != nil {
		sendError(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	endpoint := fmt.Sprintf("/api/moderation/reports/%s", reportID)
	data, err := client.Put(endpoint, body)
	proxyGatewayResponse(w, data, err)
}

// GetModerationStatsHandler - статистика модерации
func GetModerationStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	data, err := client.Get("/api/moderation/stats")
	proxyGatewayResponse(w, data, err)
}
