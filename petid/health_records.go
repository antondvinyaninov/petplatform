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
// VACCINATIONS (Прививки)
// ============================================

// GetPetVaccinationsHandler возвращает все прививки питомца
func GetPetVaccinationsHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Fetching vaccinations for pet_id=%s", petID)

	query := `
		SELECT 
			id, pet_id, date, vaccine_name, vaccine_type, 
			next_date, veterinarian, clinic, notes, 
			created_at, updated_at, created_by
		FROM pet_vaccinations
		WHERE pet_id = $1
		ORDER BY date DESC`

	rows, err := db.Query(query, petID)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch vaccinations: %v", err)
		respondError(w, "Failed to fetch vaccinations", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	vaccinations := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, petID, createdBy sql.NullInt64
		var date, nextDate sql.NullTime
		var vaccineName, vaccineType, veterinarian, clinic, notes sql.NullString
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &petID, &date, &vaccineName, &vaccineType,
			&nextDate, &veterinarian, &clinic, &notes,
			&createdAt, &updatedAt, &createdBy)
		if err != nil {
			log.Printf("❌ [PetID] Failed to scan vaccination: %v", err)
			continue
		}

		vaccination := map[string]interface{}{
			"id":         id.Int64,
			"pet_id":     petID.Int64,
			"created_at": createdAt,
			"updated_at": updatedAt,
		}

		if date.Valid {
			vaccination["date"] = date.Time
		}
		if vaccineName.Valid {
			vaccination["vaccine_name"] = vaccineName.String
		}
		if vaccineType.Valid {
			vaccination["vaccine_type"] = vaccineType.String
		}
		if nextDate.Valid {
			vaccination["next_date"] = nextDate.Time
		}
		if veterinarian.Valid {
			vaccination["veterinarian"] = veterinarian.String
		}
		if clinic.Valid {
			vaccination["clinic"] = clinic.String
		}
		if notes.Valid {
			vaccination["notes"] = notes.String
		}
		if createdBy.Valid {
			vaccination["created_by"] = createdBy.Int64
		}

		vaccinations = append(vaccinations, vaccination)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d vaccinations in %v", len(vaccinations), duration)

	respondJSON(w, map[string]interface{}{
		"success":      true,
		"vaccinations": vaccinations,
		"count":        len(vaccinations),
	})
}

// CreateVaccinationHandler создает новую прививку
func CreateVaccinationHandler(w http.ResponseWriter, r *http.Request) {
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
		Date         string  `json:"date"`
		VaccineName  string  `json:"vaccine_name"`
		VaccineType  string  `json:"vaccine_type"`
		NextDate     *string `json:"next_date"`
		Veterinarian *string `json:"veterinarian"`
		Clinic       *string `json:"clinic"`
		Notes        *string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode vaccination request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Date == "" || req.VaccineName == "" || req.VaccineType == "" {
		respondError(w, "Date, vaccine_name and vaccine_type are required", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Creating vaccination for pet_id=%s: %s (%s)", petID, req.VaccineName, req.VaccineType)

	query := `
		INSERT INTO pet_vaccinations (
			pet_id, date, vaccine_name, vaccine_type, next_date, 
			veterinarian, clinic, notes, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	var id int
	var createdAt, updatedAt time.Time

	err := db.QueryRow(query, petID, req.Date, req.VaccineName, req.VaccineType,
		req.NextDate, req.Veterinarian, req.Clinic, req.Notes, userID).
		Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		log.Printf("❌ [PetID] Failed to create vaccination: %v", err)
		respondError(w, "Failed to create vaccination", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Добавлена прививка: %s (%s)", req.VaccineName, req.VaccineType)
	logPetChange(petID, userID, "vaccination", "", "", "", description)

	vaccination := map[string]interface{}{
		"id":           id,
		"pet_id":       petID,
		"date":         req.Date,
		"vaccine_name": req.VaccineName,
		"vaccine_type": req.VaccineType,
		"created_at":   createdAt,
		"updated_at":   updatedAt,
		"created_by":   userID,
	}

	if req.NextDate != nil {
		vaccination["next_date"] = *req.NextDate
	}
	if req.Veterinarian != nil {
		vaccination["veterinarian"] = *req.Veterinarian
	}
	if req.Clinic != nil {
		vaccination["clinic"] = *req.Clinic
	}
	if req.Notes != nil {
		vaccination["notes"] = *req.Notes
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Vaccination created (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success":     true,
		"vaccination": vaccination,
	})
}

// UpdateVaccinationHandler обновляет прививку
func UpdateVaccinationHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	vaccinationID := vars["id"]

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
		Date         *string `json:"date"`
		VaccineName  *string `json:"vaccine_name"`
		VaccineType  *string `json:"vaccine_type"`
		NextDate     *string `json:"next_date"`
		Veterinarian *string `json:"veterinarian"`
		Clinic       *string `json:"clinic"`
		Notes        *string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode update vaccination request: %v", err)
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
	if req.VaccineName != nil {
		updates = append(updates, fmt.Sprintf("vaccine_name = $%d", argIndex))
		args = append(args, *req.VaccineName)
		argIndex++
	}
	if req.VaccineType != nil {
		updates = append(updates, fmt.Sprintf("vaccine_type = $%d", argIndex))
		args = append(args, *req.VaccineType)
		argIndex++
	}
	if req.NextDate != nil {
		updates = append(updates, fmt.Sprintf("next_date = $%d", argIndex))
		args = append(args, *req.NextDate)
		argIndex++
	}
	if req.Veterinarian != nil {
		updates = append(updates, fmt.Sprintf("veterinarian = $%d", argIndex))
		args = append(args, *req.Veterinarian)
		argIndex++
	}
	if req.Clinic != nil {
		updates = append(updates, fmt.Sprintf("clinic = $%d", argIndex))
		args = append(args, *req.Clinic)
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
	args = append(args, vaccinationID)

	query := fmt.Sprintf(`
		UPDATE pet_vaccinations 
		SET %s 
		WHERE id = $%d
		RETURNING id, pet_id, date, vaccine_name, vaccine_type, next_date, 
		          veterinarian, clinic, notes, created_at, updated_at`,
		strings.Join(updates, ", "), argIndex)

	log.Printf("🔍 [PetID] Updating vaccination id=%s", vaccinationID)

	var id, petID int
	var date, nextDate sql.NullTime
	var vaccineName, vaccineType, veterinarian, clinic, notes sql.NullString
	var createdAt, updatedAt time.Time

	err := db.QueryRow(query, args...).Scan(&id, &petID, &date, &vaccineName, &vaccineType,
		&nextDate, &veterinarian, &clinic, &notes, &createdAt, &updatedAt)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Vaccination not found: id=%s", vaccinationID)
		respondError(w, "Vaccination not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to update vaccination: %v", err)
		respondError(w, "Failed to update vaccination", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Обновлена прививка: %s", vaccineName.String)
	logPetChange(fmt.Sprintf("%d", petID), userID, "vaccination", "", "", "", description)

	vaccination := map[string]interface{}{
		"id":         id,
		"pet_id":     petID,
		"created_at": createdAt,
		"updated_at": updatedAt,
	}

	if date.Valid {
		vaccination["date"] = date.Time
	}
	if vaccineName.Valid {
		vaccination["vaccine_name"] = vaccineName.String
	}
	if vaccineType.Valid {
		vaccination["vaccine_type"] = vaccineType.String
	}
	if nextDate.Valid {
		vaccination["next_date"] = nextDate.Time
	}
	if veterinarian.Valid {
		vaccination["veterinarian"] = veterinarian.String
	}
	if clinic.Valid {
		vaccination["clinic"] = clinic.String
	}
	if notes.Valid {
		vaccination["notes"] = notes.String
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Vaccination updated (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success":     true,
		"vaccination": vaccination,
	})
}

// DeleteVaccinationHandler удаляет прививку
func DeleteVaccinationHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	vaccinationID := vars["id"]

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

	log.Printf("🔍 [PetID] Deleting vaccination id=%s", vaccinationID)

	// Сначала получаем информацию о прививке для логирования
	var petID int
	var vaccineName string
	err := db.QueryRow("SELECT pet_id, vaccine_name FROM pet_vaccinations WHERE id = $1", vaccinationID).
		Scan(&petID, &vaccineName)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Vaccination not found: id=%s", vaccinationID)
		respondError(w, "Vaccination not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch vaccination: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Удаляем прививку
	query := `DELETE FROM pet_vaccinations WHERE id = $1 RETURNING id`
	var deletedID int
	err = db.QueryRow(query, vaccinationID).Scan(&deletedID)

	if err != nil {
		log.Printf("❌ [PetID] Failed to delete vaccination: %v", err)
		respondError(w, "Failed to delete vaccination", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Удалена прививка: %s", vaccineName)
	logPetChange(fmt.Sprintf("%d", petID), userID, "vaccination", "", "", "", description)

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Vaccination deleted (id=%d) in %v", deletedID, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Vaccination deleted",
	})
}

// logPetChange логирует изменение в историю питомца
func logPetChange(petID string, userID int, changeType, fieldName, oldValue, newValue, description string) {
	query := `
		INSERT INTO pet_change_log (pet_id, user_id, change_type, field_name, old_value, new_value, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := db.Exec(query, petID, userID, changeType, fieldName, oldValue, newValue, description)
	if err != nil {
		log.Printf("⚠️  [PetID] Failed to log pet change: %v", err)
	}
}
