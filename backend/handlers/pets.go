package handlers

import (
	"encoding/json"
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

	// Получаем ID текущего пользователя из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Получаем параметры запроса и добавляем фильтр по user_id
		query := r.URL.Query()
		query.Set("user_id", fmt.Sprintf("%d", userID))

		endpoint := fmt.Sprintf("/api/petid/pets?%s", query.Encode())

		fmt.Printf("📝 [Pets] Fetching pets for user_id=%d (owners only)\n", userID)
		data, err := client.Get(endpoint)
		if err != nil {
			proxyGatewayResponse(w, data, err)
			return
		}

		// Парсим ответ и фильтруем только владельцев
		var response struct {
			Success bool                     `json:"success"`
			Pets    []map[string]interface{} `json:"pets"`
		}

		if err := parseJSON(data, &response); err != nil {
			fmt.Printf("❌ [Pets] Failed to parse response: %v\n", err)
			proxyGatewayResponse(w, data, nil)
			return
		}

		// Фильтруем только питомцев где relationship = "owner"
		var ownerPets []map[string]interface{}
		for _, pet := range response.Pets {
			if relationship, ok := pet["relationship"].(string); ok && relationship == "owner" {
				ownerPets = append(ownerPets, pet)
			}
		}

		fmt.Printf("📊 [Pets] Total pets: %d, Owner pets: %d\n", len(response.Pets), len(ownerPets))

		// Возвращаем отфильтрованный список
		response.Pets = ownerPets
		filteredData, _ := json.Marshal(response)
		proxyGatewayResponse(w, filteredData, nil)

	case http.MethodPost:
		// Создание нового питомца - автоматически привязываем к текущему пользователю
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		// Принудительно устанавливаем owner_id = текущий пользователь
		body["owner_id"] = userID

		fmt.Printf("📝 [Pets] Creating pet for user_id=%d with data: %+v\n", userID, body)
		data, err := client.Post("/api/petid/pets", body)
		if err != nil {
			fmt.Printf("❌ [Pets] Gateway error: %v\n", err)
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		fmt.Printf("✅ [Pets] Gateway response: %s\n", string(data))
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

	// Получаем ID текущего пользователя
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/pets/%s", petID)

	switch r.Method {
	case http.MethodGet:
		fmt.Printf("📝 [Pet] Fetching pet ID: %s for user_id=%d\n", petID, userID)

		// Получаем питомца
		data, err := client.Get(endpoint)
		if err != nil {
			fmt.Printf("❌ [Pet] Gateway error: %v\n", err)
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Проверяем владение питомцем
		if !checkPetOwnership(data, userID) {
			sendError(w, "Доступ запрещен. Это не ваш питомец", http.StatusForbidden)
			return
		}

		fmt.Printf("✅ [Pet] Gateway response: %s\n", string(data))
		proxyGatewayResponse(w, data, nil)

	case http.MethodPut:
		// Сначала проверяем владение
		data, err := client.Get(endpoint)
		if err != nil {
			sendError(w, "Питомец не найден", http.StatusNotFound)
			return
		}

		if !checkPetOwnership(data, userID) {
			sendError(w, "Доступ запрещен. Это не ваш питомец", http.StatusForbidden)
			return
		}

		// Теперь обновляем
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		// Запрещаем менять owner_id и curator_id
		delete(body, "owner_id")
		delete(body, "curator_id")

		data, err = client.Put(endpoint, body)
		proxyGatewayResponse(w, data, err)

	case http.MethodDelete:
		// Сначала проверяем владение
		data, err := client.Get(endpoint)
		if err != nil {
			sendError(w, "Питомец не найден", http.StatusNotFound)
			return
		}

		if !checkPetOwnership(data, userID) {
			sendError(w, "Доступ запрещен. Это не ваш питомец", http.StatusForbidden)
			return
		}

		// Теперь удаляем
		data, err = client.Delete(endpoint)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// checkPetOwnership проверяет, является ли пользователь владельцем или куратором питомца
func checkPetOwnership(petData []byte, userID int) bool {
	var response struct {
		Success bool `json:"success"`
		Pet     struct {
			OwnerID   *int `json:"owner_id"`
			CuratorID *int `json:"curator_id"`
		} `json:"pet"`
	}

	if err := parseJSON(petData, &response); err != nil {
		fmt.Printf("❌ [checkPetOwnership] Failed to parse pet data: %v\n", err)
		return false
	}

	// Проверяем, является ли пользователь владельцем или куратором
	isOwner := response.Pet.OwnerID != nil && *response.Pet.OwnerID == userID
	isCurator := response.Pet.CuratorID != nil && *response.Pet.CuratorID == userID

	fmt.Printf("🔍 [checkPetOwnership] userID=%d, owner_id=%v, curator_id=%v, isOwner=%v, isCurator=%v\n",
		userID, response.Pet.OwnerID, response.Pet.CuratorID, isOwner, isCurator)

	return isOwner || isCurator
}
