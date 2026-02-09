package petid

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type QueryRequest struct {
	Query string        `json:"query"`
	Args  []interface{} `json:"args"`
}

type QueryResponse struct {
	Success bool                     `json:"success"`
	Rows    []map[string]interface{} `json:"rows,omitempty"`
	Error   string                   `json:"error,omitempty"`
}

type ExecRequest struct {
	Query string        `json:"query"`
	Args  []interface{} `json:"args"`
}

type ExecResponse struct {
	Success      bool   `json:"success"`
	LastInsertID int64  `json:"last_insert_id,omitempty"`
	RowsAffected int64  `json:"rows_affected,omitempty"`
	Error        string `json:"error,omitempty"`
}

var db *sql.DB

// SetDB устанавливает подключение к базе данных
func SetDB(database *sql.DB) {
	db = database
}

// DBQueryHandler обрабатывает SELECT запросы
func DBQueryHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем user из контекста (установлен в AuthMiddleware)
	user := r.Context().Value("user")
	if user == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req QueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode query request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Executing query: %s with args: %v", req.Query, req.Args)

	// Выполняем запрос
	rows, err := db.Query(req.Query, req.Args...)
	if err != nil {
		log.Printf("❌ [PetID] Query failed: %v", err)
		respondError(w, "Query execution failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Получаем названия колонок
	columns, err := rows.Columns()
	if err != nil {
		log.Printf("❌ [PetID] Failed to get columns: %v", err)
		respondError(w, "Failed to process results", http.StatusInternalServerError)
		return
	}

	// Читаем результаты
	var results []map[string]interface{}
	for rows.Next() {
		// Создаем слайс для сканирования значений
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			log.Printf("❌ [PetID] Failed to scan row: %v", err)
			continue
		}

		// Создаем map для строки
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			// Конвертируем []byte в string
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Query executed successfully, returned %d rows in %v", len(results), duration)

	respondJSON(w, QueryResponse{
		Success: true,
		Rows:    results,
	})
}

// DBExecHandler обрабатывает INSERT/UPDATE/DELETE запросы
func DBExecHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем user из контекста
	user := r.Context().Value("user")
	if user == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode exec request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Executing command: %s with args: %v", req.Query, req.Args)

	// Выполняем команду
	result, err := db.Exec(req.Query, req.Args...)
	if err != nil {
		log.Printf("❌ [PetID] Exec failed: %v", err)
		respondError(w, "Command execution failed", http.StatusInternalServerError)
		return
	}

	// Получаем результаты
	lastInsertID, _ := result.LastInsertId()
	rowsAffected, _ := result.RowsAffected()

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Command executed successfully, affected %d rows in %v", rowsAffected, duration)

	respondJSON(w, ExecResponse{
		Success:      true,
		LastInsertID: lastInsertID,
		RowsAffected: rowsAffected,
	})
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	respondJSON(w, map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

// GetBreedsHandler возвращает список пород
func GetBreedsHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("🔍 [PetID] Fetching breeds from database")

	// Выполняем запрос к базе данных с JOIN
	query := `SELECT breeds.*, species.name as species_name
	          FROM breeds
	          LEFT JOIN species ON breeds.species_id = species.id
	          ORDER BY breeds.name`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch breeds: %v", err)
		respondError(w, "Failed to fetch breeds", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Получаем названия колонок
	columns, err := rows.Columns()
	if err != nil {
		log.Printf("❌ [PetID] Failed to get columns: %v", err)
		respondError(w, "Failed to process results", http.StatusInternalServerError)
		return
	}

	// Читаем результаты
	var breeds []map[string]interface{}
	for rows.Next() {
		// Создаем слайс для сканирования значений
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			log.Printf("❌ [PetID] Failed to scan breed row: %v", err)
			continue
		}

		// Создаем map для строки
		breed := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			// Конвертируем []byte в string
			if b, ok := val.([]byte); ok {
				breed[col] = string(b)
			} else {
				breed[col] = val
			}
		}

		breeds = append(breeds, breed)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d breeds in %v", len(breeds), duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"breeds":  breeds,
		"count":   len(breeds),
	})
}

// DeleteBreedHandler удаляет породу по ID
func DeleteBreedHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем ID из URL
	vars := mux.Vars(r)
	breedID := vars["id"]

	log.Printf("🔍 [PetID] Deleting breed with ID: %s", breedID)

	// Удаляем породу
	query := `DELETE FROM breeds WHERE id = $1 RETURNING id`

	var deletedID int
	err := db.QueryRow(query, breedID).Scan(&deletedID)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Breed not found: %s", breedID)
		respondError(w, "Порода не найдена", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to delete breed: %v", err)
		respondError(w, "Failed to delete breed", http.StatusInternalServerError)
		return
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Breed deleted successfully (id=%d) in %v", deletedID, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Порода удалена",
	})
}

// UpdateBreedHandler обновляет породу по ID
func UpdateBreedHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем ID из URL
	vars := mux.Vars(r)
	breedID := vars["id"]

	log.Printf("🔍 [PetID] Updating breed with ID: %s", breedID)

	// Парсим тело запроса
	var req struct {
		Name        *string `json:"name"`
		SpeciesID   *int    `json:"species_id"`
		Description *string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode update request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Name != nil && *req.Name == "" {
		respondError(w, "Name cannot be empty", http.StatusBadRequest)
		return
	}

	// Проверяем, что species_id существует (если передан)
	if req.SpeciesID != nil {
		var speciesExists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM species WHERE id = $1)", *req.SpeciesID).Scan(&speciesExists)
		if err != nil {
			log.Printf("❌ [PetID] Failed to check species existence: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		if !speciesExists {
			log.Printf("❌ [PetID] Species not found: id=%d", *req.SpeciesID)
			respondError(w, "Species not found", http.StatusBadRequest)
			return
		}
	}

	// Строим динамический SQL запрос
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.SpeciesID != nil {
		updates = append(updates, fmt.Sprintf("species_id = $%d", argIndex))
		args = append(args, *req.SpeciesID)
		argIndex++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *req.Description)
		argIndex++
	}

	if len(updates) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Добавляем ID в конец аргументов
	args = append(args, breedID)

	// Формируем запрос
	query := fmt.Sprintf("UPDATE breeds SET %s WHERE id = $%d RETURNING id, name, species_id, description, created_at",
		strings.Join(updates, ", "), argIndex)

	log.Printf("🔍 [PetID] SQL Query: %s", query)
	log.Printf("🔍 [PetID] SQL Args: %v", args)

	// Выполняем запрос
	var id int
	var name string
	var speciesID int
	var description sql.NullString
	var createdAt time.Time

	err := db.QueryRow(query, args...).Scan(&id, &name, &speciesID, &description, &createdAt)
	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Breed not found: %s", breedID)
		respondError(w, "Порода не найдена", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to update breed: %v", err)
		// Проверяем на дубликат
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			respondError(w, "Breed with this name already exists", http.StatusConflict)
			return
		}
		respondError(w, "Failed to update breed", http.StatusInternalServerError)
		return
	}

	// Получаем название вида
	var speciesName string
	err = db.QueryRow("SELECT name FROM species WHERE id = $1", speciesID).Scan(&speciesName)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to fetch species name: %v", err)
		speciesName = ""
	}

	// Формируем ответ
	breed := map[string]interface{}{
		"id":         id,
		"name":       name,
		"species_id": speciesID,
		"species":    speciesName,
		"created_at": createdAt,
	}
	if description.Valid {
		breed["description"] = description.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Breed updated successfully (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"breed":   breed,
	})
}

// CreateBreedHandler создает новую породу
func CreateBreedHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("🔍 [PetID] Creating new breed")

	// Парсим тело запроса
	var req struct {
		Name        string  `json:"name"`
		SpeciesID   int     `json:"species_id"`
		Description *string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode create breed request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Name == "" {
		respondError(w, "Name is required", http.StatusBadRequest)
		return
	}
	if req.SpeciesID == 0 {
		respondError(w, "Species ID is required", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Creating breed: name=%s, species_id=%d", req.Name, req.SpeciesID)

	// Проверяем, что species_id существует
	var speciesExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM species WHERE id = $1)", req.SpeciesID).Scan(&speciesExists)
	if err != nil {
		log.Printf("❌ [PetID] Failed to check species existence: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !speciesExists {
		log.Printf("❌ [PetID] Species not found: id=%d", req.SpeciesID)
		respondError(w, "Species not found", http.StatusBadRequest)
		return
	}

	// Вставляем новую породу
	query := `INSERT INTO breeds (name, species_id, description, created_at)
	          VALUES ($1, $2, $3, NOW())
	          RETURNING id, name, species_id, description, created_at`

	var id int
	var name string
	var speciesID int
	var description sql.NullString
	var createdAt time.Time

	err = db.QueryRow(query, req.Name, req.SpeciesID, req.Description).
		Scan(&id, &name, &speciesID, &description, &createdAt)

	if err != nil {
		log.Printf("❌ [PetID] Failed to create breed: %v", err)
		// Проверяем на дубликат
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			respondError(w, "Breed with this name already exists", http.StatusConflict)
			return
		}
		respondError(w, "Failed to create breed", http.StatusInternalServerError)
		return
	}

	// Получаем название вида
	var speciesName string
	err = db.QueryRow("SELECT name FROM species WHERE id = $1", speciesID).Scan(&speciesName)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to fetch species name: %v", err)
		speciesName = ""
	}

	// Формируем ответ
	breed := map[string]interface{}{
		"id":         id,
		"name":       name,
		"species_id": speciesID,
		"species":    speciesName,
		"created_at": createdAt,
	}
	if description.Valid {
		breed["description"] = description.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Breed created successfully (id=%d, name=%s) in %v", id, name, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"breed":   breed,
	})
}

// GetSpeciesHandler возвращает список видов животных
func GetSpeciesHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	log.Printf("🔍 [PetID] Fetching species from database")

	// Выполняем запрос к базе данных
	query := `SELECT id, name, description, created_at 
	          FROM species 
	          ORDER BY name ASC`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch species: %v", err)
		respondError(w, "Failed to fetch species", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Читаем результаты
	var speciesList []map[string]interface{}
	for rows.Next() {
		var id int
		var name, description sql.NullString
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &name, &description, &createdAt); err != nil {
			log.Printf("❌ [PetID] Failed to scan species row: %v", err)
			continue
		}

		species := map[string]interface{}{
			"id": id,
		}

		if name.Valid {
			species["name"] = name.String
		}
		if description.Valid {
			species["description"] = description.String
		}
		if createdAt.Valid {
			species["created_at"] = createdAt.Time
		}

		speciesList = append(speciesList, species)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d species in %v", len(speciesList), duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"species": speciesList,
		"count":   len(speciesList),
	})
}

// GetPetsHandler возвращает список питомцев с информацией о владельцах, породах и видах
func GetPetsHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем query параметры
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	speciesIDStr := r.URL.Query().Get("species_id")
	userIDStr := r.URL.Query().Get("user_id")

	// Устанавливаем значения по умолчанию
	limit := 100
	offset := 0

	// Парсим limit
	if limitStr != "" {
		if _, err := fmt.Sscanf(limitStr, "%d", &limit); err != nil {
			respondError(w, "Invalid limit parameter", http.StatusBadRequest)
			return
		}
	}

	// Парсим offset
	if offsetStr != "" {
		if _, err := fmt.Sscanf(offsetStr, "%d", &offset); err != nil {
			respondError(w, "Invalid offset parameter", http.StatusBadRequest)
			return
		}
	}

	log.Printf("🔍 [PetID] Fetching pets: limit=%d, offset=%d, species_id=%s, user_id=%s",
		limit, offset, speciesIDStr, userIDStr)

	// Строим SQL запрос с фильтрами
	// ВАЖНО: Таблица pets использует текстовые поля species и breed вместо ID
	query := `
		SELECT 
			p.id,
			p.name,
			p.created_at,
			p.gender,
			p.species,
			p.breed,
			p.age,
			u.name as owner_name,
			u.id as owner_id
		FROM pets p
		LEFT JOIN users u ON p.user_id = u.id
		WHERE 1=1`

	args := []interface{}{}
	argIndex := 1

	// Добавляем фильтр по species (текстовое поле)
	if speciesIDStr != "" {
		query += fmt.Sprintf(" AND p.species = $%d", argIndex)
		args = append(args, speciesIDStr)
		argIndex++
	}

	// Добавляем фильтр по user_id
	if userIDStr != "" {
		query += fmt.Sprintf(" AND p.user_id = $%d", argIndex)
		args = append(args, userIDStr)
		argIndex++
	}

	// Добавляем сортировку и пагинацию
	query += fmt.Sprintf(" ORDER BY p.id DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	log.Printf("🔍 [PetID] SQL Query: %s", query)
	log.Printf("🔍 [PetID] SQL Args: %v", args)

	// Выполняем запрос
	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch pets: %v", err)
		log.Printf("❌ [PetID] Query: %s", query)
		log.Printf("❌ [PetID] Args: %v", args)
		respondError(w, fmt.Sprintf("Failed to fetch pets: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Инициализируем пустой массив (чтобы вернуть [] вместо null)
	pets := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int
		var name string
		var createdAt time.Time
		var gender sql.NullString
		var species sql.NullString
		var breed sql.NullString
		var age sql.NullInt64
		var ownerName sql.NullString
		var ownerID sql.NullInt64

		err := rows.Scan(
			&id, &name, &createdAt, &gender,
			&species, &breed, &age,
			&ownerName, &ownerID,
		)
		if err != nil {
			log.Printf("❌ [PetID] Failed to scan pet row: %v", err)
			continue
		}

		pet := map[string]interface{}{
			"id":         id,
			"name":       name,
			"created_at": createdAt,
		}

		if gender.Valid {
			pet["gender"] = gender.String
		}
		if species.Valid {
			pet["species"] = species.String
		}
		if breed.Valid {
			pet["breed"] = breed.String
		}
		if age.Valid {
			pet["age"] = age.Int64
		}
		if ownerName.Valid {
			pet["owner_name"] = ownerName.String
		}
		if ownerID.Valid {
			pet["owner_id"] = ownerID.Int64
		}

		pets = append(pets, pet)
	}

	// Получаем общее количество питомцев (для пагинации)
	countQuery := "SELECT COUNT(*) FROM pets WHERE 1=1"
	countArgs := []interface{}{}
	countArgIndex := 1

	if speciesIDStr != "" {
		countQuery += fmt.Sprintf(" AND species = $%d", countArgIndex)
		countArgs = append(countArgs, speciesIDStr)
		countArgIndex++
	}

	if userIDStr != "" {
		countQuery += fmt.Sprintf(" AND user_id = $%d", countArgIndex)
		countArgs = append(countArgs, userIDStr)
	}

	var total int
	err = db.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to get total count: %v", err)
		total = len(pets)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d pets (total: %d) in %v", len(pets), total, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"pets":    pets,
		"total":   total,
	})
}

// CreatePetHandler создает нового питомца
func CreatePetHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем user из контекста
	contextUser := r.Context().Value("user")
	if contextUser == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Извлекаем user_id из контекста
	type User struct {
		ID int `json:"id"`
	}
	user := contextUser.(*User)
	userID := user.ID

	log.Printf("🔍 [PetID] Creating new pet for user_id=%d", userID)

	// Парсим тело запроса
	var req struct {
		Name        string  `json:"name"`
		SpeciesID   int     `json:"species_id"`
		BreedID     *int    `json:"breed_id"`
		BirthDate   *string `json:"birth_date"`
		Gender      string  `json:"gender"`
		Description *string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode create pet request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Name == "" {
		respondError(w, "Name is required", http.StatusBadRequest)
		return
	}
	if req.SpeciesID == 0 {
		respondError(w, "Species ID is required", http.StatusBadRequest)
		return
	}
	if req.Gender != "male" && req.Gender != "female" {
		respondError(w, "Gender must be 'male' or 'female'", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Creating pet: name=%s, species_id=%d, breed_id=%v, gender=%s",
		req.Name, req.SpeciesID, req.BreedID, req.Gender)

	// Проверяем, что species_id существует
	var speciesExists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM species WHERE id = $1)", req.SpeciesID).Scan(&speciesExists)
	if err != nil {
		log.Printf("❌ [PetID] Failed to check species existence: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	if !speciesExists {
		log.Printf("❌ [PetID] Species not found: id=%d", req.SpeciesID)
		respondError(w, "Species not found", http.StatusBadRequest)
		return
	}

	// Проверяем, что breed_id существует (если указан)
	if req.BreedID != nil {
		var breedExists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM breeds WHERE id = $1)", *req.BreedID).Scan(&breedExists)
		if err != nil {
			log.Printf("❌ [PetID] Failed to check breed existence: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		if !breedExists {
			log.Printf("❌ [PetID] Breed not found: id=%d", *req.BreedID)
			respondError(w, "Breed not found", http.StatusBadRequest)
			return
		}
	}

	// Вставляем нового питомца
	query := `INSERT INTO pets (name, species_id, breed_id, user_id, birth_date, gender, description, created_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	          RETURNING id, name, species_id, breed_id, user_id, birth_date, gender, description, created_at`

	var id int
	var name string
	var speciesID int
	var breedID sql.NullInt64
	var returnedUserID int
	var birthDate sql.NullTime
	var gender string
	var description sql.NullString
	var createdAt time.Time

	err = db.QueryRow(query, req.Name, req.SpeciesID, req.BreedID, userID, req.BirthDate, req.Gender, req.Description).
		Scan(&id, &name, &speciesID, &breedID, &returnedUserID, &birthDate, &gender, &description, &createdAt)

	if err != nil {
		log.Printf("❌ [PetID] Failed to create pet: %v", err)
		respondError(w, "Failed to create pet", http.StatusInternalServerError)
		return
	}

	// Получаем дополнительную информацию (species_name, breed_name, owner_name)
	detailQuery := `
		SELECT 
			s.name as species_name,
			b.name as breed_name,
			u.name as owner_name
		FROM pets p
		LEFT JOIN species s ON p.species_id = s.id
		LEFT JOIN breeds b ON p.breed_id = b.id
		LEFT JOIN users u ON p.user_id = u.id
		WHERE p.id = $1`

	var speciesName, breedName, ownerName sql.NullString
	err = db.QueryRow(detailQuery, id).Scan(&speciesName, &breedName, &ownerName)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to fetch pet details: %v", err)
	}

	// Формируем ответ
	pet := map[string]interface{}{
		"id":         id,
		"name":       name,
		"species_id": speciesID,
		"gender":     gender,
		"owner_id":   returnedUserID,
		"created_at": createdAt,
	}

	if speciesName.Valid {
		pet["species_name"] = speciesName.String
	}
	if breedID.Valid {
		pet["breed_id"] = breedID.Int64
	}
	if breedName.Valid {
		pet["breed_name"] = breedName.String
	}
	if ownerName.Valid {
		pet["owner_name"] = ownerName.String
	}
	if birthDate.Valid {
		pet["birth_date"] = birthDate.Time
	}
	if description.Valid {
		pet["description"] = description.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Pet created successfully (id=%d, name=%s) in %v", id, name, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"pet":     pet,
	})
}

// UpdatePetHandler обновляет питомца
func UpdatePetHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем user из контекста
	contextUser := r.Context().Value("user")
	if contextUser == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	type User struct {
		ID int `json:"id"`
	}
	user := contextUser.(*User)
	userID := user.ID

	// Получаем ID питомца из URL
	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Updating pet id=%s for user_id=%d", petID, userID)

	// Парсим тело запроса
	var req struct {
		Name        *string `json:"name"`
		SpeciesID   *int    `json:"species_id"`
		BreedID     *int    `json:"breed_id"`
		BirthDate   *string `json:"birth_date"`
		Gender      *string `json:"gender"`
		Description *string `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode update pet request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Name != nil && *req.Name == "" {
		respondError(w, "Name cannot be empty", http.StatusBadRequest)
		return
	}
	if req.Gender != nil && *req.Gender != "male" && *req.Gender != "female" {
		respondError(w, "Gender must be 'male' or 'female'", http.StatusBadRequest)
		return
	}

	// Проверяем, что species_id существует (если указан)
	if req.SpeciesID != nil {
		var speciesExists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM species WHERE id = $1)", *req.SpeciesID).Scan(&speciesExists)
		if err != nil {
			log.Printf("❌ [PetID] Failed to check species existence: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		if !speciesExists {
			log.Printf("❌ [PetID] Species not found: id=%d", *req.SpeciesID)
			respondError(w, "Species not found", http.StatusBadRequest)
			return
		}
	}

	// Проверяем, что breed_id существует (если указан)
	if req.BreedID != nil {
		var breedExists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM breeds WHERE id = $1)", *req.BreedID).Scan(&breedExists)
		if err != nil {
			log.Printf("❌ [PetID] Failed to check breed existence: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		if !breedExists {
			log.Printf("❌ [PetID] Breed not found: id=%d", *req.BreedID)
			respondError(w, "Breed not found", http.StatusBadRequest)
			return
		}
	}

	// Строим динамический SQL запрос (обновляем только переданные поля)
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.SpeciesID != nil {
		updates = append(updates, fmt.Sprintf("species_id = $%d", argIndex))
		args = append(args, *req.SpeciesID)
		argIndex++
	}
	if req.BreedID != nil {
		updates = append(updates, fmt.Sprintf("breed_id = $%d", argIndex))
		args = append(args, *req.BreedID)
		argIndex++
	}
	if req.BirthDate != nil {
		updates = append(updates, fmt.Sprintf("birth_date = $%d", argIndex))
		args = append(args, *req.BirthDate)
		argIndex++
	}
	if req.Gender != nil {
		updates = append(updates, fmt.Sprintf("gender = $%d", argIndex))
		args = append(args, *req.Gender)
		argIndex++
	}
	if req.Description != nil {
		updates = append(updates, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *req.Description)
		argIndex++
	}

	if len(updates) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Добавляем petID и userID в конец аргументов
	args = append(args, petID, userID)

	// Формируем запрос с проверкой владельца
	query := fmt.Sprintf(`UPDATE pets SET %s 
		WHERE id = $%d AND user_id = $%d
		RETURNING id, name, species_id, breed_id, user_id, birth_date, gender, description, created_at`,
		strings.Join(updates, ", "), argIndex, argIndex+1)

	log.Printf("🔍 [PetID] SQL Query: %s", query)
	log.Printf("🔍 [PetID] SQL Args: %v", args)

	// Выполняем запрос
	var id int
	var name string
	var speciesID int
	var breedID sql.NullInt64
	var returnedUserID int
	var birthDate sql.NullTime
	var gender string
	var description sql.NullString
	var createdAt time.Time

	err := db.QueryRow(query, args...).Scan(&id, &name, &speciesID, &breedID, &returnedUserID, &birthDate, &gender, &description, &createdAt)
	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Pet not found or access denied: id=%s, user_id=%d", petID, userID)
		respondError(w, "Питомец не найден или у вас нет прав", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to update pet: %v", err)
		respondError(w, "Failed to update pet", http.StatusInternalServerError)
		return
	}

	// Получаем дополнительную информацию
	detailQuery := `
		SELECT 
			s.name as species_name,
			b.name as breed_name,
			u.name as owner_name
		FROM pets p
		LEFT JOIN species s ON p.species_id = s.id
		LEFT JOIN breeds b ON p.breed_id = b.id
		LEFT JOIN users u ON p.user_id = u.id
		WHERE p.id = $1`

	var speciesName, breedName, ownerName sql.NullString
	err = db.QueryRow(detailQuery, id).Scan(&speciesName, &breedName, &ownerName)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to fetch pet details: %v", err)
	}

	// Формируем ответ
	pet := map[string]interface{}{
		"id":         id,
		"name":       name,
		"species_id": speciesID,
		"gender":     gender,
		"owner_id":   returnedUserID,
		"created_at": createdAt,
	}

	if speciesName.Valid {
		pet["species_name"] = speciesName.String
	}
	if breedID.Valid {
		pet["breed_id"] = breedID.Int64
	}
	if breedName.Valid {
		pet["breed_name"] = breedName.String
	}
	if ownerName.Valid {
		pet["owner_name"] = ownerName.String
	}
	if birthDate.Valid {
		pet["birth_date"] = birthDate.Time
	}
	if description.Valid {
		pet["description"] = description.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Pet updated successfully (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"pet":     pet,
	})
}

// DeletePetHandler удаляет питомца
func DeletePetHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем user из контекста
	contextUser := r.Context().Value("user")
	if contextUser == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	type User struct {
		ID int `json:"id"`
	}
	user := contextUser.(*User)
	userID := user.ID

	// Получаем ID питомца из URL
	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Deleting pet id=%s for user_id=%d", petID, userID)

	// Удаляем питомца с проверкой владельца
	query := `DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING id`

	var deletedID int
	err := db.QueryRow(query, petID, userID).Scan(&deletedID)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Pet not found or access denied: id=%s, user_id=%d", petID, userID)
		respondError(w, "Питомец не найден или у вас нет прав", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to delete pet: %v", err)
		respondError(w, "Failed to delete pet", http.StatusInternalServerError)
		return
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Pet deleted successfully (id=%d) in %v", deletedID, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Питомец удален",
	})
}
