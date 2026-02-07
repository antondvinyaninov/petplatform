package handlers

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// AdminOrganizationsHandler - список всех организаций для модерации
func AdminOrganizationsHandler(w http.ResponseWriter, r *http.Request) {
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
	endpoint := "/api/organizations"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}

// AdminVerifyOrganizationHandler - верификация/отклонение организации
func AdminVerifyOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vars := mux.Vars(r)
	orgID := vars["id"]

	if orgID == "" {
		sendError(w, "Неверный ID организации", http.StatusBadRequest)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Парсим тело запроса
	var body map[string]interface{}
	if err := parseJSONBody(r, &body); err != nil {
		sendError(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	endpoint := fmt.Sprintf("/api/admin/organizations/%s/verify", orgID)
	data, err := client.Put(endpoint, body)
	proxyGatewayResponse(w, data, err)
}

// AdminOrganizationStatsHandler - статистика организаций
func AdminOrganizationStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	data, err := client.Get("/api/admin/organizations/stats")
	proxyGatewayResponse(w, data, err)
}
