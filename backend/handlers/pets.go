package handlers

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// AdminPetsHandler - список питомцев через gateway
func AdminPetsHandler(w http.ResponseWriter, r *http.Request) {
	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Получаем параметры запроса
		query := r.URL.Query().Encode()
		endpoint := "/api/petid/pets"
		if query != "" {
			endpoint += "?" + query
		}

		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPost:
		// Создание нового питомца
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		fmt.Printf("📝 [AdminPets] Creating pet with data: %+v\n", body)
		data, err := client.Post("/api/petid/pets", body)
		if err != nil {
			fmt.Printf("❌ [AdminPets] Gateway error: %v\n", err)
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		fmt.Printf("✅ [AdminPets] Gateway response: %s\n", string(data))
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// AdminPetHandler - действия с конкретным питомцем
func AdminPetHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	petID := vars["id"]

	if petID == "" {
		sendError(w, "Неверный ID питомца", http.StatusBadRequest)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/pets/%s", petID)

	switch r.Method {
	case http.MethodGet:
		fmt.Printf("📝 [AdminPet] Fetching pet ID: %s\n", petID)
		data, err := client.Get(endpoint)
		if err != nil {
			fmt.Printf("❌ [AdminPet] Gateway error: %v\n", err)
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		fmt.Printf("✅ [AdminPet] Gateway response: %s\n", string(data))
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
