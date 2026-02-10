package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

// UploadPetPhotoHandler обрабатывает загрузку фото питомца
func UploadPetPhotoHandler(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Проверяем авторизацию
	user := r.Context().Value("user")
	if user == nil {
		log.Printf("❌ [Media] Unauthorized upload attempt")
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Парсим multipart form (максимум 10MB в памяти)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("❌ [Media] Failed to parse multipart form: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "Failed to parse form data",
		})
		return
	}

	// Получаем параметры
	petIDStr := r.FormValue("pet_id")
	userIDStr := r.FormValue("user_id")

	if petIDStr == "" || userIDStr == "" {
		log.Printf("❌ [Media] Missing required parameters: pet_id=%s, user_id=%s", petIDStr, userIDStr)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "Missing required parameters: pet_id and user_id",
		})
		return
	}

	// Конвертируем в int
	petID, err := strconv.Atoi(petIDStr)
	if err != nil {
		log.Printf("❌ [Media] Invalid pet_id: %s", petIDStr)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "Invalid pet_id",
		})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		log.Printf("❌ [Media] Invalid user_id: %s", userIDStr)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "Invalid user_id",
		})
		return
	}

	// Получаем файл
	file, header, err := r.FormFile("photo")
	if err != nil {
		log.Printf("❌ [Media] No file uploaded: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "No photo file provided",
		})
		return
	}
	defer file.Close()

	log.Printf("🔍 [Media] Uploading pet photo: pet_id=%d, user_id=%d, filename=%s, size=%d bytes",
		petID, userID, header.Filename, header.Size)

	// Проверяем что питомец принадлежит пользователю
	var ownerID int
	err = db.QueryRow("SELECT user_id FROM pets WHERE id = $1", petID).Scan(&ownerID)
	if err != nil {
		log.Printf("❌ [Media] Pet not found: pet_id=%d", petID)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "Pet not found",
		})
		return
	}

	if ownerID != userID {
		log.Printf("❌ [Media] Access denied: pet_id=%d belongs to user_id=%d, not %d", petID, ownerID, userID)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": "You don't have permission to upload photos for this pet",
		})
		return
	}

	// Загружаем в S3
	photoURL, err := UploadPetPhoto(file, header, petID, userID)
	if err != nil {
		log.Printf("❌ [Media] Failed to upload photo: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"message": fmt.Sprintf("Failed to upload photo: %v", err),
		})
		return
	}

	duration := time.Since(startTime)
	log.Printf("✅ [Media] Pet photo uploaded successfully: pet_id=%d, url=%s, duration=%v",
		petID, photoURL, duration)

	// Возвращаем успешный ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"photo_url": photoURL,
		"message":   "Фото успешно загружено",
	})
}
