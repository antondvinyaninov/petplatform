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
