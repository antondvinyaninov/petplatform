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

// ============================================
// TREATMENTS (Обработки)
// ============================================

// GetPetTreatmentsHandler возвращает все обработки питомца
func GetPetTreatmentsHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Fetching treatments for pet_id=%s", petID)

	query := `
		SELECT 
			id, pet_id, date, treatment_type, product_name, 
			next_date, dosage, notes, 
			created_at, updated_at, created_by
		FROM pet_treatments
		WHERE pet_id = $1
		ORDER BY date DESC`

	rows, err := db.Query(query, petID)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch treatments: %v", err)
		respondError(w, "Failed to fetch treatments", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	treatments := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, petID, createdBy sql.NullInt64
		var date, nextDate sql.NullTime
		var treatmentType, productName, dosage, notes sql.NullString
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &petID, &date, &treatmentType, &productName,
			&nextDate, &dosage, &notes,
			&createdAt, &updatedAt, &createdBy)
		if err != nil {
			log.Printf("❌ [PetID] Failed to scan treatment: %v", err)
			continue
		}

		treatment := map[string]interface{}{
			"id":         id.Int64,
			"pet_id":     petID.Int64,
			"created_at": createdAt,
			"updated_at": updatedAt,
		}

		if date.Valid {
			treatment["date"] = date.Time
		}
		if treatmentType.Valid {
			treatment["treatment_type"] = treatmentType.String
		}
		if productName.Valid {
			treatment["product_name"] = productName.String
		}
		if nextDate.Valid {
			treatment["next_date"] = nextDate.Time
		}
		if dosage.Valid {
			treatment["dosage"] = dosage.String
		}
		if notes.Valid {
			treatment["notes"] = notes.String
		}
		if createdBy.Valid {
			treatment["created_by"] = createdBy.Int64
		}

		treatments = append(treatments, treatment)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d treatments in %v", len(treatments), duration)

	respondJSON(w, map[string]interface{}{
		"success":    true,
		"treatments": treatments,
		"count":      len(treatments),
	})
}

// CreateTreatmentHandler создает новую обработку
func CreateTreatmentHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	petID := vars["id"]

	// Получаем user_id из контекста
	contextUser := r.Context().Value("user")
	if contextUser == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var userID int
	val := reflect.ValueOf(contextUser)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	if idField := val.FieldByName("ID"); idField.IsValid() && idField.CanInt() {
		userID = int(idField.Int())
	}

	var req struct {
		Date          string  `json:"date"`
		TreatmentType string  `json:"treatment_type"`
		ProductName   string  `json:"product_name"`
		NextDate      *string `json:"next_date"`
		Dosage        *string `json:"dosage"`
		Notes         *string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode treatment request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Date == "" || req.TreatmentType == "" || req.ProductName == "" {
		respondError(w, "Date, treatment_type and product_name are required", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Creating treatment for pet_id=%s: %s (%s)", petID, req.ProductName, req.TreatmentType)

	query := `
		INSERT INTO pet_treatments (
			pet_id, date, treatment_type, product_name, next_date, 
			dosage, notes, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	var id int
	var createdAt, updatedAt time.Time

	err := db.QueryRow(query, petID, req.Date, req.TreatmentType, req.ProductName,
		req.NextDate, req.Dosage, req.Notes, userID).
		Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		log.Printf("❌ [PetID] Failed to create treatment: %v", err)
		respondError(w, "Failed to create treatment", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Добавлена обработка: %s (%s)", req.ProductName, req.TreatmentType)
	logPetChange(petID, userID, "treatment", "", "", "", description)

	treatment := map[string]interface{}{
		"id":             id,
		"pet_id":         petID,
		"date":           req.Date,
		"treatment_type": req.TreatmentType,
		"product_name":   req.ProductName,
		"created_at":     createdAt,
		"updated_at":     updatedAt,
		"created_by":     userID,
	}

	if req.NextDate != nil {
		treatment["next_date"] = *req.NextDate
	}
	if req.Dosage != nil {
		treatment["dosage"] = *req.Dosage
	}
	if req.Notes != nil {
		treatment["notes"] = *req.Notes
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Treatment created (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success":   true,
		"treatment": treatment,
	})
}

// UpdateTreatmentHandler обновляет обработку
func UpdateTreatmentHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	treatmentID := vars["id"]

	// Получаем user_id из контекста
	contextUser := r.Context().Value("user")
	if contextUser == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var userID int
	val := reflect.ValueOf(contextUser)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	if idField := val.FieldByName("ID"); idField.IsValid() && idField.CanInt() {
		userID = int(idField.Int())
	}

	var req struct {
		Date          *string `json:"date"`
		TreatmentType *string `json:"treatment_type"`
		ProductName   *string `json:"product_name"`
		NextDate      *string `json:"next_date"`
		Dosage        *string `json:"dosage"`
		Notes         *string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode update treatment request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Строим динамический UPDATE
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Date != nil {
		updates = append(updates, fmt.Sprintf("date = $%d", argIndex))
		args = append(args, *req.Date)
		argIndex++
	}
	if req.TreatmentType != nil {
		updates = append(updates, fmt.Sprintf("treatment_type = $%d", argIndex))
		args = append(args, *req.TreatmentType)
		argIndex++
	}
	if req.ProductName != nil {
		updates = append(updates, fmt.Sprintf("product_name = $%d", argIndex))
		args = append(args, *req.ProductName)
		argIndex++
	}
	if req.NextDate != nil {
		updates = append(updates, fmt.Sprintf("next_date = $%d", argIndex))
		args = append(args, *req.NextDate)
		argIndex++
	}
	if req.Dosage != nil {
		updates = append(updates, fmt.Sprintf("dosage = $%d", argIndex))
		args = append(args, *req.Dosage)
		argIndex++
	}
	if req.Notes != nil {
		updates = append(updates, fmt.Sprintf("notes = $%d", argIndex))
		args = append(args, *req.Notes)
		argIndex++
	}

	if len(updates) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, treatmentID)

	query := fmt.Sprintf(`
		UPDATE pet_treatments 
		SET %s 
		WHERE id = $%d
		RETURNING id, pet_id, date, treatment_type, product_name, next_date, 
		          dosage, notes, created_at, updated_at`,
		strings.Join(updates, ", "), argIndex)

	log.Printf("🔍 [PetID] Updating treatment id=%s", treatmentID)

	var id, petID int
	var date, nextDate sql.NullTime
	var treatmentType, productName, dosage, notes sql.NullString
	var createdAt, updatedAt time.Time

	err := db.QueryRow(query, args...).Scan(&id, &petID, &date, &treatmentType, &productName,
		&nextDate, &dosage, &notes, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Treatment not found: id=%s", treatmentID)
		respondError(w, "Treatment not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to update treatment: %v", err)
		respondError(w, "Failed to update treatment", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Обновлена обработка: %s", productName.String)
	logPetChange(fmt.Sprintf("%d", petID), userID, "treatment", "", "", "", description)

	treatment := map[string]interface{}{
		"id":         id,
		"pet_id":     petID,
		"created_at": createdAt,
		"updated_at": updatedAt,
	}

	if date.Valid {
		treatment["date"] = date.Time
	}
	if treatmentType.Valid {
		treatment["treatment_type"] = treatmentType.String
	}
	if productName.Valid {
		treatment["product_name"] = productName.String
	}
	if nextDate.Valid {
		treatment["next_date"] = nextDate.Time
	}
	if dosage.Valid {
		treatment["dosage"] = dosage.String
	}
	if notes.Valid {
		treatment["notes"] = notes.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Treatment updated (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success":   true,
		"treatment": treatment,
	})
}

// DeleteTreatmentHandler удаляет обработку
func DeleteTreatmentHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	treatmentID := vars["id"]

	// Получаем user_id из контекста
	contextUser := r.Context().Value("user")
	if contextUser == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var userID int
	val := reflect.ValueOf(contextUser)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}
	if idField := val.FieldByName("ID"); idField.IsValid() && idField.CanInt() {
		userID = int(idField.Int())
	}

	log.Printf("🔍 [PetID] Deleting treatment id=%s", treatmentID)

	// Сначала получаем информацию о обработке для логирования
	var petID int
	var productName string
	err := db.QueryRow("SELECT pet_id, product_name FROM pet_treatments WHERE id = $1", treatmentID).
		Scan(&petID, &productName)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Treatment not found: id=%s", treatmentID)
		respondError(w, "Treatment not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch treatment: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Удаляем обработку
	query := `DELETE FROM pet_treatments WHERE id = $1 RETURNING id`
	var deletedID int
	err = db.QueryRow(query, treatmentID).Scan(&deletedID)

	if err != nil {
		log.Printf("❌ [PetID] Failed to delete treatment: %v", err)
		respondError(w, "Failed to delete treatment", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Удалена обработка: %s", productName)
	logPetChange(fmt.Sprintf("%d", petID), userID, "treatment", "", "", "", description)

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Treatment deleted (id=%d) in %v", deletedID, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Treatment deleted",
	})
}
