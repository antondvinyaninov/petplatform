package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

// AdminUsersHandler - список пользователей через gateway
func AdminUsersHandler(w http.ResponseWriter, r *http.Request) {
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
	endpoint := "/api/users"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}

// AdminUserHandler - действия с конкретным пользователем
func AdminUserHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	if userID == "" {
		sendError(w, "Неверный ID пользователя", http.StatusBadRequest)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	endpoint := fmt.Sprintf("/api/users/%s", userID)

	switch r.Method {
	case http.MethodGet:
		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPut:
		// Проверяем действие (block/unblock)
		action := strings.TrimPrefix(r.URL.Path, fmt.Sprintf("/api/admin/users/%s/", userID))

		if action == "block" || action == "unblock" {
			endpoint = fmt.Sprintf("/api/admin/users/%s/%s", userID, action)
		}

		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		data, err := client.Put(endpoint, body)
		proxyGatewayResponse(w, data, err)

	case http.MethodDelete:
		data, err := client.Delete(endpoint)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
