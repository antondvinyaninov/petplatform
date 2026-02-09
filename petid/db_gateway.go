package petid

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"reflect"
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
	query := `
		SELECT 
			p.id,
			p.name,
			p.birth_date,
			p.age_type,
			p.approximate_years,
			p.approximate_months,
			p.gender,
			p.description,
			p.relationship,
			p.created_at,
			s.name as species_name,
			s.id as species_id,
			b.name as breed_name,
			b.id as breed_id,
			u.name as owner_name,
			u.id as owner_id
		FROM pets p
		LEFT JOIN species s ON p.species_id = s.id
		LEFT JOIN breeds b ON p.breed_id = b.id
		LEFT JOIN users u ON p.user_id = u.id
		WHERE 1=1`

	args := []interface{}{}
	argIndex := 1

	// Добавляем фильтр по species_id
	if speciesIDStr != "" {
		query += fmt.Sprintf(" AND p.species_id = $%d", argIndex)
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
		var birthDate sql.NullTime
		var ageType sql.NullString
		var approximateYears sql.NullInt64
		var approximateMonths sql.NullInt64
		var gender sql.NullString
		var description sql.NullString
		var relationship sql.NullString
		var createdAt time.Time
		var speciesName sql.NullString
		var speciesID sql.NullInt64
		var breedName sql.NullString
		var breedID sql.NullInt64
		var ownerName sql.NullString
		var ownerID sql.NullInt64

		err := rows.Scan(
			&id, &name, &birthDate, &ageType, &approximateYears, &approximateMonths,
			&gender, &description, &relationship, &createdAt,
			&speciesName, &speciesID, &breedName, &breedID,
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

		if birthDate.Valid {
			pet["birth_date"] = birthDate.Time
		}
		if ageType.Valid {
			pet["age_type"] = ageType.String
		}
		if approximateYears.Valid {
			pet["approximate_years"] = approximateYears.Int64
		}
		if approximateMonths.Valid {
			pet["approximate_months"] = approximateMonths.Int64
		}
		if gender.Valid {
			pet["gender"] = gender.String
		}
		if description.Valid {
			pet["description"] = description.String
		}
		if relationship.Valid {
			pet["relationship"] = relationship.String
		}
		if speciesName.Valid {
			pet["species_name"] = speciesName.String
		}
		if speciesID.Valid {
			pet["species_id"] = speciesID.Int64
		}
		if breedName.Valid {
			pet["breed_name"] = breedName.String
		}
		if breedID.Valid {
			pet["breed_id"] = breedID.Int64
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
		countQuery += fmt.Sprintf(" AND species_id = $%d", countArgIndex)
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
	// Используем type assertion к структуре с полем ID
	var userID int
	switch v := contextUser.(type) {
	case interface{ GetID() int }:
		userID = v.GetID()
	default:
		// Используем рефлексию для получения поля ID
		val := reflect.ValueOf(contextUser)
		if val.Kind() == reflect.Ptr {
			val = val.Elem()
		}
		if idField := val.FieldByName("ID"); idField.IsValid() && idField.CanInt() {
			userID = int(idField.Int())
		}
	}

	if userID == 0 {
		log.Printf("❌ [PetID] Failed to extract user_id from context")
		respondError(w, "Invalid user context", http.StatusUnauthorized)
		return
	}

	log.Printf("🔍 [PetID] Creating new pet for user_id=%d", userID)

	// Парсим тело запроса
	var req struct {
		Name              string  `json:"name"`
		SpeciesID         int     `json:"species_id"`
		BreedID           *int    `json:"breed_id"`
		BirthDate         *string `json:"birth_date"`
		AgeType           *string `json:"age_type"`
		ApproximateYears  *int    `json:"approximate_years"`
		ApproximateMonths *int    `json:"approximate_months"`
		Gender            string  `json:"gender"`
		Description       *string `json:"description"`
		Relationship      *string `json:"relationship"`
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

	// Устанавливаем значения по умолчанию
	ageType := "exact"
	if req.AgeType != nil && *req.AgeType != "" {
		ageType = *req.AgeType
	}

	approximateYears := 0
	if req.ApproximateYears != nil {
		approximateYears = *req.ApproximateYears
	}

	approximateMonths := 0
	if req.ApproximateMonths != nil {
		approximateMonths = *req.ApproximateMonths
	}

	relationship := "owner"
	if req.Relationship != nil && *req.Relationship != "" {
		relationship = *req.Relationship
	}

	log.Printf("🔍 [PetID] Creating pet: name=%s, species_id=%d, breed_id=%v, gender=%s, relationship=%s",
		req.Name, req.SpeciesID, req.BreedID, req.Gender, relationship)

	// Проверяем, что species_id существует и получаем название
	var speciesName string
	err := db.QueryRow("SELECT name FROM species WHERE id = $1", req.SpeciesID).Scan(&speciesName)
	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Species not found: id=%d", req.SpeciesID)
		respondError(w, "Species not found", http.StatusBadRequest)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch species: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Проверяем, что breed_id существует и получаем название (если указан)
	var breedName sql.NullString
	if req.BreedID != nil {
		var name string
		err := db.QueryRow("SELECT name FROM breeds WHERE id = $1", *req.BreedID).Scan(&name)
		if err == sql.ErrNoRows {
			log.Printf("❌ [PetID] Breed not found: id=%d", *req.BreedID)
			respondError(w, "Breed not found", http.StatusBadRequest)
			return
		}
		if err != nil {
			log.Printf("❌ [PetID] Failed to fetch breed: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		breedName = sql.NullString{String: name, Valid: true}
	}

	// Вставляем нового питомца (заполняем и species_id, и species для обратной совместимости)
	query := `INSERT INTO pets (
		name, species_id, species, breed_id, breed, user_id, birth_date, 
		age_type, approximate_years, approximate_months,
		gender, description, relationship, created_at
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
	RETURNING id, name, species_id, breed_id, user_id, birth_date,
	          age_type, approximate_years, approximate_months,
	          gender, description, relationship, created_at`

	var id int
	var name string
	var speciesID int
	var breedID sql.NullInt64
	var returnedUserID int
	var birthDate sql.NullTime
	var returnedAgeType string
	var returnedApproximateYears int
	var returnedApproximateMonths int
	var gender string
	var description sql.NullString
	var returnedRelationship string
	var createdAt time.Time

	err = db.QueryRow(query,
		req.Name, req.SpeciesID, speciesName, req.BreedID, breedName, userID, req.BirthDate,
		ageType, approximateYears, approximateMonths,
		req.Gender, req.Description, relationship,
	).Scan(
		&id, &name, &speciesID, &breedID, &returnedUserID, &birthDate,
		&returnedAgeType, &returnedApproximateYears, &returnedApproximateMonths,
		&gender, &description, &returnedRelationship, &createdAt,
	)

	if err != nil {
		log.Printf("❌ [PetID] Failed to create pet: %v", err)
		respondError(w, "Failed to create pet", http.StatusInternalServerError)
		return
	}

	// Получаем дополнительную информацию (owner_name)
	detailQuery := `SELECT u.name as owner_name
		FROM pets p
		LEFT JOIN users u ON p.user_id = u.id
		WHERE p.id = $1`

	var ownerName sql.NullString
	err = db.QueryRow(detailQuery, id).Scan(&ownerName)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to fetch pet details: %v", err)
	}

	// Формируем ответ
	pet := map[string]interface{}{
		"id":                 id,
		"name":               name,
		"species_id":         speciesID,
		"species_name":       speciesName, // Уже получили выше
		"gender":             gender,
		"owner_id":           returnedUserID,
		"age_type":           returnedAgeType,
		"approximate_years":  returnedApproximateYears,
		"approximate_months": returnedApproximateMonths,
		"relationship":       returnedRelationship,
		"created_at":         createdAt,
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

	// Извлекаем user_id из контекста
	var userID int
	val := reflect.ValueOf(contextUser)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	if idField := val.FieldByName("ID"); idField.IsValid() && idField.CanInt() {
		userID = int(idField.Int())
	}

	if userID == 0 {
		log.Printf("❌ [PetID] Failed to extract user_id from context")
		respondError(w, "Invalid user context", http.StatusUnauthorized)
		return
	}

	// Получаем ID питомца из URL
	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Updating pet id=%s for user_id=%d", petID, userID)

	// Парсим тело запроса
	var req struct {
		Name              *string `json:"name"`
		SpeciesID         *int    `json:"species_id"`
		BreedID           *int    `json:"breed_id"`
		BirthDate         *string `json:"birth_date"`
		AgeType           *string `json:"age_type"`
		ApproximateYears  *int    `json:"approximate_years"`
		ApproximateMonths *int    `json:"approximate_months"`
		Gender            *string `json:"gender"`
		Description       *string `json:"description"`
		Relationship      *string `json:"relationship"`
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
		// Получаем название вида
		var speciesName string
		err := db.QueryRow("SELECT name FROM species WHERE id = $1", *req.SpeciesID).Scan(&speciesName)
		if err == sql.ErrNoRows {
			log.Printf("❌ [PetID] Species not found: id=%d", *req.SpeciesID)
			respondError(w, "Species not found", http.StatusBadRequest)
			return
		}
		if err != nil {
			log.Printf("❌ [PetID] Failed to fetch species: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		updates = append(updates, fmt.Sprintf("species_id = $%d", argIndex))
		args = append(args, *req.SpeciesID)
		argIndex++
		updates = append(updates, fmt.Sprintf("species = $%d", argIndex))
		args = append(args, speciesName)
		argIndex++
	}
	if req.BreedID != nil {
		// Получаем название породы
		var breedName string
		err := db.QueryRow("SELECT name FROM breeds WHERE id = $1", *req.BreedID).Scan(&breedName)
		if err == sql.ErrNoRows {
			log.Printf("❌ [PetID] Breed not found: id=%d", *req.BreedID)
			respondError(w, "Breed not found", http.StatusBadRequest)
			return
		}
		if err != nil {
			log.Printf("❌ [PetID] Failed to fetch breed: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
		updates = append(updates, fmt.Sprintf("breed_id = $%d", argIndex))
		args = append(args, *req.BreedID)
		argIndex++
		updates = append(updates, fmt.Sprintf("breed = $%d", argIndex))
		args = append(args, breedName)
		argIndex++
	}
	if req.BirthDate != nil {
		updates = append(updates, fmt.Sprintf("birth_date = $%d", argIndex))
		args = append(args, *req.BirthDate)
		argIndex++
	}
	if req.AgeType != nil {
		updates = append(updates, fmt.Sprintf("age_type = $%d", argIndex))
		args = append(args, *req.AgeType)
		argIndex++
	}
	if req.ApproximateYears != nil {
		updates = append(updates, fmt.Sprintf("approximate_years = $%d", argIndex))
		args = append(args, *req.ApproximateYears)
		argIndex++
	}
	if req.ApproximateMonths != nil {
		updates = append(updates, fmt.Sprintf("approximate_months = $%d", argIndex))
		args = append(args, *req.ApproximateMonths)
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
	if req.Relationship != nil {
		updates = append(updates, fmt.Sprintf("relationship = $%d", argIndex))
		args = append(args, *req.Relationship)
		argIndex++
	}

	if len(updates) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Добавляем updated_at
	updates = append(updates, "updated_at = NOW()")

	// Добавляем petID и userID в конец
	args = append(args, petID, userID)

	query := fmt.Sprintf(`UPDATE pets SET %s 
		WHERE id = $%d AND user_id = $%d
		RETURNING id, name, species_id, breed_id, user_id, birth_date,
		          age_type, approximate_years, approximate_months,
		          gender, description, relationship, created_at`,
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
	var ageType string
	var approximateYears int
	var approximateMonths int
	var gender string
	var description sql.NullString
	var relationship string
	var createdAt time.Time

	err := db.QueryRow(query, args...).Scan(
		&id, &name, &speciesID, &breedID, &returnedUserID, &birthDate,
		&ageType, &approximateYears, &approximateMonths,
		&gender, &description, &relationship, &createdAt,
	)
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
		"id":                 id,
		"name":               name,
		"species_id":         speciesID,
		"gender":             gender,
		"owner_id":           returnedUserID,
		"age_type":           ageType,
		"approximate_years":  approximateYears,
		"approximate_months": approximateMonths,
		"relationship":       relationship,
		"created_at":         createdAt,
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

	// Извлекаем user_id из контекста
	var userID int
	val := reflect.ValueOf(contextUser)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	if idField := val.FieldByName("ID"); idField.IsValid() && idField.CanInt() {
		userID = int(idField.Int())
	}

	if userID == 0 {
		log.Printf("❌ [PetID] Failed to extract user_id from context")
		respondError(w, "Invalid user context", http.StatusUnauthorized)
		return
	}

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
