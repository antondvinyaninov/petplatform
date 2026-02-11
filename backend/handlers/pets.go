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
		// Получаем параметры запроса и добавляем фильтр по curator_id
		// Показываем только питомцев, где текущий пользователь является куратором
		query := r.URL.Query()
		query.Set("curator_id", fmt.Sprintf("%d", userID))

		endpoint := fmt.Sprintf("/api/petid/pets?%s", query.Encode())

		fmt.Printf("📝 [Pets] Fetching pets for curator_id=%d (volunteer mode)\n", userID)
		data, err := client.Get(endpoint)

		// Логируем первые 500 символов ответа для отладки
		if len(data) > 0 {
			preview := string(data)
			if len(preview) > 500 {
				preview = preview[:500] + "..."
			}
			fmt.Printf("📦 [Pets] Gateway response preview: %s\n", preview)
		}

		// Фильтруем питомцев по relationship="curator" и owner_id
		// Так как PetID API не возвращает curator_id, используем owner_id + relationship
		if err == nil {
			data = filterPetsByCurator(data, userID)
		}

		proxyGatewayResponse(w, data, err)

	case http.MethodPost:
		// Создание нового питомца - автоматически привязываем к текущему пользователю как куратора
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		// Принудительно устанавливаем curator_id = текущий пользователь (волонтёр)
		body["curator_id"] = userID
		// owner_id оставляем NULL (питомец без владельца, под опекой волонтёра)
		body["owner_id"] = nil

		fmt.Printf("📝 [Pets] Creating pet for curator_id=%d (volunteer mode)\n", userID)
		fmt.Printf("📝 [Pets] Request body: %+v\n", body)

		data, err := client.Post("/api/petid/pets", body)
		if err != nil {
			fmt.Printf("❌ [Pets] Gateway error: %v\n", err)
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Printf("✅ [Pets] Pet created successfully\n")
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
		fmt.Printf("📝 [Pet] Fetching pet ID: %s for curator_id=%d (volunteer mode)\n", petID, userID)

		// Получаем питомца
		data, err := client.Get(endpoint)
		if err != nil {
			fmt.Printf("❌ [Pet] Gateway error: %v\n", err)
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Проверяем что пользователь является куратором этого питомца
		if !checkPetOwnership(data, userID) {
			sendError(w, "Доступ запрещен. Вы не являетесь куратором этого питомца", http.StatusForbidden)
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

		// Запрещаем менять owner_id и curator_id (только админ может это делать)
		delete(body, "owner_id")
		delete(body, "curator_id")

		fmt.Printf("📝 [Pet] Updating pet ID: %s by curator_id=%d\n", petID, userID)

		data, err = client.Put(endpoint, body)
		proxyGatewayResponse(w, data, err)

	case http.MethodDelete:
		// Сначала проверяем что пользователь является куратором
		data, err := client.Get(endpoint)
		if err != nil {
			sendError(w, "Питомец не найден", http.StatusNotFound)
			return
		}

		if !checkPetOwnership(data, userID) {
			sendError(w, "Доступ запрещен. Вы не являетесь куратором этого питомца", http.StatusForbidden)
			return
		}

		// Теперь удаляем
		data, err = client.Delete(endpoint)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// checkPetOwnership проверяет, является ли пользователь куратором питомца
// В режиме "Кабинет зоопомощника" проверяем relationship="curator" и owner_id
// Это временное решение, пока PetID API не вернёт поддержку curator_id
func checkPetOwnership(petData []byte, userID int) bool {
	var response struct {
		Success bool `json:"success"`
		Pet     struct {
			OwnerID      *int   `json:"owner_id"`
			Relationship string `json:"relationship"`
		} `json:"pet"`
	}

	if err := parseJSON(petData, &response); err != nil {
		fmt.Printf("❌ [checkPetOwnership] Failed to parse pet data: %v\n", err)
		return false
	}

	// В режиме волонтёра проверяем relationship="curator" И owner_id=userID
	isCurator := response.Pet.Relationship == "curator" &&
		response.Pet.OwnerID != nil &&
		*response.Pet.OwnerID == userID

	fmt.Printf("🔍 [checkPetOwnership] Volunteer mode: userID=%d, owner_id=%v, relationship=%s, isCurator=%v\n",
		userID, response.Pet.OwnerID, response.Pet.Relationship, isCurator)

	return isCurator
}

// filterPetsByCurator фильтрует список питомцев, оставляя только тех, где:
// - relationship = "curator" (питомец под опекой)
// - owner_id = userID (текущий пользователь)
// Это временное решение, пока PetID API не вернёт поддержку curator_id
func filterPetsByCurator(data []byte, userID int) []byte {
	var fullResponse map[string]interface{}
	if err := parseJSON(data, &fullResponse); err != nil {
		fmt.Printf("❌ [filterPetsByCurator] Failed to parse response: %v\n", err)
		return data
	}

	pets, ok := fullResponse["pets"].([]interface{})
	if !ok {
		fmt.Printf("⚠️ [filterPetsByCurator] No pets array found\n")
		return data
	}

	var filteredPets []interface{}

	for _, petInterface := range pets {
		pet, ok := petInterface.(map[string]interface{})
		if !ok {
			continue
		}

		// Проверяем relationship и owner_id
		relationship, hasRelationship := pet["relationship"].(string)
		ownerID, hasOwnerID := pet["owner_id"]

		fmt.Printf("🔍 [filterPetsByCurator] Pet ID=%v, relationship=%v, owner_id=%v\n",
			pet["id"], relationship, ownerID)

		// Фильтруем: relationship="curator" И owner_id=userID
		if hasRelationship && relationship == "curator" && hasOwnerID {
			var ownerIDInt int
			switch v := ownerID.(type) {
			case float64:
				ownerIDInt = int(v)
			case int:
				ownerIDInt = v
			default:
				fmt.Printf("⚠️ [filterPetsByCurator] Unknown owner_id type: %T\n", v)
				continue
			}

			if ownerIDInt == userID {
				fmt.Printf("✅ [filterPetsByCurator] Pet ID=%v matches (curator, owner_id=%d), adding\n",
					pet["id"], userID)
				filteredPets = append(filteredPets, pet)
			} else {
				fmt.Printf("❌ [filterPetsByCurator] Pet ID=%v owner_id=%d != userID=%d, skipping\n",
					pet["id"], ownerIDInt, userID)
			}
		} else {
			fmt.Printf("⚠️ [filterPetsByCurator] Pet ID=%v: relationship=%v (not curator), skipping\n",
				pet["id"], relationship)
		}
	}

	fmt.Printf("🔍 [filterPetsByCurator] Filtered %d pets from %d total for curator userID=%d\n",
		len(filteredPets), len(pets), userID)

	// Формируем новый ответ
	if len(filteredPets) == 0 {
		fullResponse["pets"] = []interface{}{}
	} else {
		fullResponse["pets"] = filteredPets
	}
	fullResponse["total"] = len(filteredPets)

	// Преобразуем обратно в JSON
	filteredData, err := json.Marshal(fullResponse)
	if err != nil {
		fmt.Printf("❌ [filterPetsByCurator] Failed to marshal filtered response: %v\n", err)
		return data
	}

	return filteredData
}

// PetMedicalRecordsHandler - медицинские записи питомца (с проверкой владения)
func PetMedicalRecordsHandler(w http.ResponseWriter, r *http.Request) {
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

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	// Проверяем владение питомцем
	petData, err := client.Get(fmt.Sprintf("/api/petid/pets/%s", petID))
	if err != nil {
		sendError(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	if !checkPetOwnership(petData, userID) {
		sendError(w, "Доступ запрещен. Вы не являетесь куратором этого питомца", http.StatusForbidden)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/pets/%s/medical-records", petID)

	switch r.Method {
	case http.MethodGet:
		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPost:
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}
		data, err := client.Post(endpoint, body)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// PetTreatmentsHandler - лечение питомца (с проверкой владения)
func PetTreatmentsHandler(w http.ResponseWriter, r *http.Request) {
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

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	// Проверяем владение питомцем
	petData, err := client.Get(fmt.Sprintf("/api/petid/pets/%s", petID))
	if err != nil {
		sendError(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	if !checkPetOwnership(petData, userID) {
		sendError(w, "Доступ запрещен. Вы не являетесь куратором этого питомца", http.StatusForbidden)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/pets/%s/treatments", petID)

	switch r.Method {
	case http.MethodGet:
		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPost:
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}
		data, err := client.Post(endpoint, body)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// PetVaccinationsHandler - вакцинации питомца (с проверкой владения)
func PetVaccinationsHandler(w http.ResponseWriter, r *http.Request) {
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

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	// Проверяем владение питомцем
	petData, err := client.Get(fmt.Sprintf("/api/petid/pets/%s", petID))
	if err != nil {
		sendError(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	if !checkPetOwnership(petData, userID) {
		sendError(w, "Доступ запрещен. Вы не являетесь куратором этого питомца", http.StatusForbidden)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/pets/%s/vaccinations", petID)

	switch r.Method {
	case http.MethodGet:
		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPost:
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}
		data, err := client.Post(endpoint, body)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// PetChangelogHandler - история изменений питомца (с проверкой владения)
func PetChangelogHandler(w http.ResponseWriter, r *http.Request) {
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

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	// Проверяем владение питомцем
	petData, err := client.Get(fmt.Sprintf("/api/petid/pets/%s", petID))
	if err != nil {
		sendError(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	if !checkPetOwnership(petData, userID) {
		sendError(w, "Доступ запрещен. Вы не являетесь куратором этого питомца", http.StatusForbidden)
		return
	}

	endpoint := fmt.Sprintf("/api/petid/pets/%s/changelog", petID)
	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}
