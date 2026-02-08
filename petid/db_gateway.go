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

// UpdateBreedHandler обновляет породу по ID
func UpdateBreedHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Получаем ID из URL
	vars := mux.Vars(r)
	breedID := vars["id"]

	log.Printf("🔍 [PetID] Updating breed with ID: %s", breedID)

	// Парсим тело запроса
	var updateData map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		log.Printf("❌ [PetID] Failed to decode update request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Проверяем, что есть данные для обновления
	if len(updateData) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Строим динамический SQL запрос
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	// Разрешенные поля для обновления
	allowedFields := map[string]bool{
		"name":        true,
		"species_id":  true,
		"description": true,
		"image_url":   true,
	}

	for field, value := range updateData {
		if allowedFields[field] {
			updates = append(updates, fmt.Sprintf("%s = $%d", field, argIndex))
			args = append(args, value)
			argIndex++
		}
	}

	if len(updates) == 0 {
		respondError(w, "No valid fields to update", http.StatusBadRequest)
		return
	}

	// Добавляем ID в конец аргументов
	args = append(args, breedID)

	// Формируем запрос
	query := fmt.Sprintf("UPDATE breeds SET %s WHERE id = $%d RETURNING id, name, species_id, description, image_url",
		strings.Join(updates, ", "), argIndex)

	log.Printf("🔍 [PetID] SQL Query: %s", query)
	log.Printf("🔍 [PetID] SQL Args: %v", args)

	// Выполняем запрос
	var id int
	var name string
	var speciesID sql.NullInt64
	var description, imageURL sql.NullString

	err := db.QueryRow(query, args...).Scan(&id, &name, &speciesID, &description, &imageURL)
	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Breed not found: %s", breedID)
		respondError(w, "Breed not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to update breed: %v", err)
		respondError(w, "Failed to update breed", http.StatusInternalServerError)
		return
	}

	// Формируем ответ
	breed := map[string]interface{}{
		"id":   id,
		"name": name,
	}
	if speciesID.Valid {
		breed["species_id"] = speciesID.Int64
	}
	if description.Valid {
		breed["description"] = description.String
	}
	if imageURL.Valid {
		breed["image_url"] = imageURL.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Breed updated successfully (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Breed updated successfully",
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
