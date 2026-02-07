package petid

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
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
