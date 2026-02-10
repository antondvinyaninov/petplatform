package handlers

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// AdminBreedsHandler - список пород через gateway
func AdminBreedsHandler(w http.ResponseWriter, r *http.Request) {
	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Получаем параметры запроса
		query := r.URL.Query().Encode()
		endpoint := "/api/petid/breeds"
		if query != "" {
			endpoint += "?" + query
		}

		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPost:
		// Создание новой породы
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		data, err := client.Post("/api/petid/breeds", body)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// AdminBreedHandler - действия с конкретной породой
func AdminBreedHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	breedID := vars["id"]

	if breedID == "" {
		sendError(w, "Неверный ID породы", http.StatusBadRequest)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/breeds/%s", breedID)

	switch r.Method {
	case http.MethodGet:
		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPut:
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
