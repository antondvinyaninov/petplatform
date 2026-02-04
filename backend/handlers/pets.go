package handlers

import (
	"backend/models"
	"backend/db"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func UserPetsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Извлекаем ID пользователя из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/pets/user/")
	userID, err := strconv.Atoi(path)
	if err != nil {
		log.Printf("❌ UserPetsHandler: Неверный ID пользователя в URL: %s", path)
		sendErrorResponse(w, "Неверный ID пользователя", http.StatusBadRequest)
		return
	}

	log.Printf("📥 UserPetsHandler: GET /api/pets/user/%d", userID)
	getUserPets(w, r, userID)
}

// CuratedPetsHandler возвращает питомцев, которых курирует пользователь
func CuratedPetsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Извлекаем ID пользователя из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/pets/curated/")
	userID, err := strconv.Atoi(path)
	if err != nil {
		log.Printf("❌ CuratedPetsHandler: Неверный ID пользователя в URL: %s", path)
		sendErrorResponse(w, "Неверный ID пользователя", http.StatusBadRequest)
		return
	}

	log.Printf("📥 CuratedPetsHandler: GET /api/pets/curated/%d", userID)
	getCuratedPets(w, r, userID)
}

func PetsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		createPet(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func PetHandler(w http.ResponseWriter, r *http.Request) {
	// Извлекаем ID из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/pets/")
	id, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID питомца", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		getPet(w, r, id)
	case http.MethodDelete:
		deletePet(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// PetHandlerWithConditionalAuth применяет авторизацию только для DELETE запросов
func PetHandlerWithConditionalAuth(authMiddleware func(http.HandlerFunc) http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			// Для DELETE требуется авторизация
			authMiddleware(PetHandler).ServeHTTP(w, r)
		} else {
			// GET запросы публичные
			PetHandler(w, r)
		}
	}
}

func getUserPets(w http.ResponseWriter, _ *http.Request, userID int) {
	log.Printf("🐾 getUserPets: Запрос питомцев для user_id=%d", userID)

	query := `SELECT id, user_id, name, species, photo, created_at FROM pets WHERE user_id = ? ORDER BY created_at DESC`

	rows, err := db.DB.Query(ConvertPlaceholders(query), userID)
	if err != nil {
		log.Printf("❌ getUserPets: Ошибка запроса к БД для user_id=%d: %v", userID, err)
		sendErrorResponse(w, "Ошибка получения питомцев: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var pets []models.Pet
	for rows.Next() {
		var pet models.Pet
		err := rows.Scan(&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Photo, &pet.CreatedAt)
		if err != nil {
			log.Printf("❌ getUserPets: Ошибка чтения строки для user_id=%d: %v", userID, err)
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}
		pets = append(pets, pet)
	}

	if pets == nil {
		pets = []models.Pet{}
	}

	log.Printf("✅ getUserPets: Найдено %d питомцев для user_id=%d", len(pets), userID)
	sendSuccessResponse(w, pets)
}

// getCuratedPets возвращает питомцев, которых курирует пользователь
func getCuratedPets(w http.ResponseWriter, _ *http.Request, userID int) {
	log.Printf("🐾 getCuratedPets: Запрос курируемых питомцев для user_id=%d", userID)

	query := `SELECT id, user_id, name, species, photo, created_at FROM pets WHERE curator_id = ? ORDER BY created_at DESC`

	rows, err := db.DB.Query(ConvertPlaceholders(query), userID)
	if err != nil {
		log.Printf("❌ getCuratedPets: Ошибка запроса к БД для user_id=%d: %v", userID, err)
		sendErrorResponse(w, "Ошибка получения курируемых питомцев: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var pets []models.Pet
	for rows.Next() {
		var pet models.Pet
		err := rows.Scan(&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Photo, &pet.CreatedAt)
		if err != nil {
			log.Printf("❌ getCuratedPets: Ошибка чтения строки для user_id=%d: %v", userID, err)
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}
		pets = append(pets, pet)
	}

	if pets == nil {
		pets = []models.Pet{}
	}

	log.Printf("✅ getCuratedPets: Найдено %d курируемых питомцев для user_id=%d", len(pets), userID)
	sendSuccessResponse(w, pets)
}

func getPet(w http.ResponseWriter, _ *http.Request, petID int) {
	query := `SELECT id, user_id, name, species, photo, created_at FROM pets WHERE id = ?`

	var pet models.Pet
	err := db.DB.QueryRow(ConvertPlaceholders(query), petID).Scan(&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Photo, &pet.CreatedAt)
	if err != nil {
		sendErrorResponse(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	sendSuccessResponse(w, pet)
}

func createPet(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	var req models.CreatePetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		sendErrorResponse(w, "Имя питомца не может быть пустым", http.StatusBadRequest)
		return
	}

	query := ConvertPlaceholders(`INSERT INTO pets (user_id, name, species, photo) VALUES (?, ?, ?, ?) RETURNING id`)
	var id int64
	var err error
	err = db.DB.QueryRow(query, userID, req.Name, req.Species, req.Photo).Scan(&id)
	if err != nil {
		sendErrorResponse(w, "Ошибка добавления питомца: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Получаем созданного питомца
	var pet models.Pet
	query = ConvertPlaceholders(`SELECT id, user_id, name, species, photo, created_at FROM pets WHERE id = ?`)
	err = db.DB.QueryRow(query, id).Scan(&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Photo, &pet.CreatedAt)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения питомца", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, pet)
}

func deletePet(w http.ResponseWriter, r *http.Request, petID int) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Проверяем, что питомец принадлежит пользователю
	var ownerID int
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT user_id FROM pets WHERE id = ?"), petID).Scan(&ownerID)
	if err != nil {
		sendErrorResponse(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		sendErrorResponse(w, "Нет прав на удаление этого питомца", http.StatusForbidden)
		return
	}

	_, err = db.DB.Exec(ConvertPlaceholders("DELETE FROM pets WHERE id = ?"), petID)
	if err != nil {
		sendErrorResponse(w, "Ошибка удаления питомца: "+err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, map[string]string{"message": "Питомец удален"})
}
