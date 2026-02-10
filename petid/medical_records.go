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
// MEDICAL RECORDS (Медицинские записи)
// ============================================

// GetPetMedicalRecordsHandler возвращает все медицинские записи питомца
func GetPetMedicalRecordsHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Fetching medical records for pet_id=%s", petID)

	query := `
		SELECT 
			id, pet_id, clinic_id, record_date, record_type, title,
			diagnosis, treatment, medications, notes, cost, created_at
		FROM medical_records
		WHERE pet_id = $1
		ORDER BY record_date DESC`

	rows, err := db.Query(query, petID)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch medical records: %v", err)
		respondError(w, "Failed to fetch medical records", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	records := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, petID, clinicID sql.NullInt64
		var recordDate sql.NullTime
		var recordType, title, diagnosis, treatment, medications, notes sql.NullString
		var cost sql.NullFloat64
		var createdAt time.Time

		err := rows.Scan(&id, &petID, &clinicID, &recordDate, &recordType, &title,
			&diagnosis, &treatment, &medications, &notes, &cost, &createdAt)
		if err != nil {
			log.Printf("❌ [PetID] Failed to scan medical record: %v", err)
			continue
		}

		record := map[string]interface{}{
			"id":         id.Int64,
			"pet_id":     petID.Int64,
			"created_at": createdAt,
		}

		if clinicID.Valid {
			record["clinic_id"] = clinicID.Int64
		}
		if recordDate.Valid {
			record["record_date"] = recordDate.Time
		}
		if recordType.Valid {
			record["record_type"] = recordType.String
		}
		if title.Valid {
			record["title"] = title.String
		}
		if diagnosis.Valid {
			record["diagnosis"] = diagnosis.String
		}
		if treatment.Valid {
			record["treatment"] = treatment.String
		}
		if medications.Valid {
			record["medications"] = medications.String
		}
		if notes.Valid {
			record["notes"] = notes.String
		}
		if cost.Valid {
			record["cost"] = cost.Float64
		}

		records = append(records, record)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d medical records in %v", len(records), duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"records": records,
		"count":   len(records),
	})
}

// CreateMedicalRecordHandler создает новую медицинскую запись
func CreateMedicalRecordHandler(w http.ResponseWriter, r *http.Request) {
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
		ClinicID    *int     `json:"clinic_id"`
		RecordDate  string   `json:"record_date"`
		RecordType  string   `json:"record_type"`
		Title       *string  `json:"title"`
		Diagnosis   *string  `json:"diagnosis"`
		Treatment   *string  `json:"treatment"`
		Medications *string  `json:"medications"`
		Notes       *string  `json:"notes"`
		Cost        *float64 `json:"cost"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode medical record request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.RecordDate == "" || req.RecordType == "" {
		respondError(w, "Record_date and record_type are required", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 [PetID] Creating medical record for pet_id=%s: %s", petID, req.RecordType)

	query := `
		INSERT INTO medical_records (
			pet_id, clinic_id, record_date, record_type, title,
			diagnosis, treatment, medications, notes, cost
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at`

	var id int
	var createdAt time.Time

	err := db.QueryRow(query, petID, req.ClinicID, req.RecordDate, req.RecordType, req.Title,
		req.Diagnosis, req.Treatment, req.Medications, req.Notes, req.Cost).
		Scan(&id, &createdAt)

	if err != nil {
		log.Printf("❌ [PetID] Failed to create medical record: %v", err)
		respondError(w, "Failed to create medical record", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := fmt.Sprintf("Добавлена медицинская запись: %s", req.RecordType)
	if req.Title != nil {
		description = fmt.Sprintf("Добавлена медицинская запись: %s", *req.Title)
	}
	logPetChange(petID, userID, "medical_record", "", "", "", description)

	record := map[string]interface{}{
		"id":          id,
		"pet_id":      petID,
		"record_date": req.RecordDate,
		"record_type": req.RecordType,
		"created_at":  createdAt,
	}

	if req.ClinicID != nil {
		record["clinic_id"] = *req.ClinicID
	}
	if req.Title != nil {
		record["title"] = *req.Title
	}
	if req.Diagnosis != nil {
		record["diagnosis"] = *req.Diagnosis
	}
	if req.Treatment != nil {
		record["treatment"] = *req.Treatment
	}
	if req.Medications != nil {
		record["medications"] = *req.Medications
	}
	if req.Notes != nil {
		record["notes"] = *req.Notes
	}
	if req.Cost != nil {
		record["cost"] = *req.Cost
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Medical record created (id=%d) in %v", id, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"record":  record,
	})
}

// UpdateMedicalRecordHandler обновляет медицинскую запись
func UpdateMedicalRecordHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	recordID := vars["id"]

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
		ClinicID    *int     `json:"clinic_id"`
		RecordDate  *string  `json:"record_date"`
		RecordType  *string  `json:"record_type"`
		Title       *string  `json:"title"`
		Diagnosis   *string  `json:"diagnosis"`
		Treatment   *string  `json:"treatment"`
		Medications *string  `json:"medications"`
		Notes       *string  `json:"notes"`
		Cost        *float64 `json:"cost"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [PetID] Failed to decode update medical record request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Строим динамический UPDATE
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.ClinicID != nil {
		updates = append(updates, fmt.Sprintf("clinic_id = $%d", argIndex))
		args = append(args, *req.ClinicID)
		argIndex++
	}
	if req.RecordDate != nil {
		updates = append(updates, fmt.Sprintf("record_date = $%d", argIndex))
		args = append(args, *req.RecordDate)
		argIndex++
	}
	if req.RecordType != nil {
		updates = append(updates, fmt.Sprintf("record_type = $%d", argIndex))
		args = append(args, *req.RecordType)
		argIndex++
	}
	if req.Title != nil {
		updates = append(updates, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, *req.Title)
		argIndex++
	}
	if req.Diagnosis != nil {
		updates = append(updates, fmt.Sprintf("diagnosis = $%d", argIndex))
		args = append(args, *req.Diagnosis)
		argIndex++
	}
	if req.Treatment != nil {
		updates = append(updates, fmt.Sprintf("treatment = $%d", argIndex))
		args = append(args, *req.Treatment)
		argIndex++
	}
	if req.Medications != nil {
		updates = append(updates, fmt.Sprintf("medications = $%d", argIndex))
		args = append(args, *req.Medications)
		argIndex++
	}
	if req.Notes != nil {
		updates = append(updates, fmt.Sprintf("notes = $%d", argIndex))
		args = append(args, *req.Notes)
		argIndex++
	}
	if req.Cost != nil {
		updates = append(updates, fmt.Sprintf("cost = $%d", argIndex))
		args = append(args, *req.Cost)
		argIndex++
	}

	if len(updates) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	args = append(args, recordID)

	query := fmt.Sprintf(`
		UPDATE medical_records 
		SET %s 
		WHERE id = $%d
		RETURNING id, pet_id, clinic_id, record_date, record_type, title,
		          diagnosis, treatment, medications, notes, cost, created_at`,
		strings.Join(updates, ", "), argIndex)

	log.Printf("🔍 [PetID] Updating medical record id=%s", recordID)

	var id, petID, clinicID sql.NullInt64
	var recordDate sql.NullTime
	var recordType, title, diagnosis, treatment, medications, notes sql.NullString
	var cost sql.NullFloat64
	var createdAt time.Time

	err := db.QueryRow(query, args...).Scan(&id, &petID, &clinicID, &recordDate, &recordType, &title,
		&diagnosis, &treatment, &medications, &notes, &cost, &createdAt)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Medical record not found: id=%s", recordID)
		respondError(w, "Medical record not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to update medical record: %v", err)
		respondError(w, "Failed to update medical record", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := "Обновлена медицинская запись"
	if title.Valid {
		description = fmt.Sprintf("Обновлена медицинская запись: %s", title.String)
	}
	logPetChange(fmt.Sprintf("%d", petID.Int64), userID, "medical_record", "", "", "", description)

	record := map[string]interface{}{
		"id":         id.Int64,
		"pet_id":     petID.Int64,
		"created_at": createdAt,
	}

	if clinicID.Valid {
		record["clinic_id"] = clinicID.Int64
	}
	if recordDate.Valid {
		record["record_date"] = recordDate.Time
	}
	if recordType.Valid {
		record["record_type"] = recordType.String
	}
	if title.Valid {
		record["title"] = title.String
	}
	if diagnosis.Valid {
		record["diagnosis"] = diagnosis.String
	}
	if treatment.Valid {
		record["treatment"] = treatment.String
	}
	if medications.Valid {
		record["medications"] = medications.String
	}
	if notes.Valid {
		record["notes"] = notes.String
	}
	if cost.Valid {
		record["cost"] = cost.Float64
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Medical record updated (id=%d) in %v", id.Int64, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"record":  record,
	})
}

// DeleteMedicalRecordHandler удаляет медицинскую запись
func DeleteMedicalRecordHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	recordID := vars["id"]

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

	log.Printf("🔍 [PetID] Deleting medical record id=%s", recordID)

	// Сначала получаем информацию о записи для логирования
	var petID int
	var title sql.NullString
	err := db.QueryRow("SELECT pet_id, title FROM medical_records WHERE id = $1", recordID).
		Scan(&petID, &title)

	if err == sql.ErrNoRows {
		log.Printf("❌ [PetID] Medical record not found: id=%s", recordID)
		respondError(w, "Medical record not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch medical record: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Удаляем запись
	query := `DELETE FROM medical_records WHERE id = $1 RETURNING id`
	var deletedID int
	err = db.QueryRow(query, recordID).Scan(&deletedID)

	if err != nil {
		log.Printf("❌ [PetID] Failed to delete medical record: %v", err)
		respondError(w, "Failed to delete medical record", http.StatusInternalServerError)
		return
	}

	// Логируем в историю
	description := "Удалена медицинская запись"
	if title.Valid {
		description = fmt.Sprintf("Удалена медицинская запись: %s", title.String)
	}
	logPetChange(fmt.Sprintf("%d", petID), userID, "medical_record", "", "", "", description)

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Medical record deleted (id=%d) in %v", deletedID, duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Medical record deleted",
	})
}

// ============================================
// CHANGELOG (История изменений)
// ============================================

// GetPetChangelogHandler возвращает историю изменений питомца
func GetPetChangelogHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	vars := mux.Vars(r)
	petID := vars["id"]

	log.Printf("🔍 [PetID] Fetching changelog for pet_id=%s", petID)

	query := `
		SELECT 
			cl.id, cl.change_type, cl.field_name, cl.old_value, cl.new_value, 
			cl.description, cl.created_at,
			u.name as user_name, u.avatar as user_avatar
		FROM pet_change_log cl
		LEFT JOIN users u ON cl.user_id = u.id
		WHERE cl.pet_id = $1
		ORDER BY cl.created_at DESC`

	rows, err := db.Query(query, petID)
	if err != nil {
		log.Printf("❌ [PetID] Failed to fetch changelog: %v", err)
		respondError(w, "Failed to fetch changelog", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	changes := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int
		var changeType, fieldName, oldValue, newValue, description sql.NullString
		var createdAt time.Time
		var userName, userAvatar sql.NullString

		err := rows.Scan(&id, &changeType, &fieldName, &oldValue, &newValue,
			&description, &createdAt, &userName, &userAvatar)
		if err != nil {
			log.Printf("❌ [PetID] Failed to scan changelog entry: %v", err)
			continue
		}

		change := map[string]interface{}{
			"id":         id,
			"created_at": createdAt,
		}

		if changeType.Valid {
			change["change_type"] = changeType.String
		}
		if fieldName.Valid {
			change["field_name"] = fieldName.String
		}
		if oldValue.Valid {
			change["old_value"] = oldValue.String
		}
		if newValue.Valid {
			change["new_value"] = newValue.String
		}
		if description.Valid {
			change["description"] = description.String
		}
		if userName.Valid {
			change["user_name"] = userName.String
		}
		if userAvatar.Valid {
			change["user_avatar"] = userAvatar.String
		}

		changes = append(changes, change)
	}

	duration := time.Since(startTime)
	log.Printf("✅ [PetID] Fetched %d changelog entries in %v", len(changes), duration)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"changes": changes,
		"count":   len(changes),
	})
}
