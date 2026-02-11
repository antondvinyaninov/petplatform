package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// DeletePollVoteHandler удаляет голос пользователя в опросе
func DeletePollVoteHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pollID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid poll ID", http.StatusBadRequest)
		return
	}

	// Получаем user из контекста
	user := r.Context().Value("user").(*User)
	if user == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	log.Printf("🗳️  [Polls] Deleting vote: poll_id=%d, user_id=%d", pollID, user.ID)

	// Удаляем голос пользователя
	result, err := db.Exec(`
		DELETE FROM poll_votes 
		WHERE poll_id = $1 AND user_id = $2
	`, pollID, user.ID)

	if err != nil {
		log.Printf("❌ [Polls] Failed to delete vote: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("⚠️  [Polls] Vote not found: poll_id=%d, user_id=%d", pollID, user.ID)
		respondError(w, "Vote not found", http.StatusNotFound)
		return
	}

	log.Printf("✅ [Polls] Vote deleted: poll_id=%d, user_id=%d", pollID, user.ID)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Vote deleted successfully",
	})
}

// VotePollHandler создает голос в опросе
func VotePollHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pollID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid poll ID", http.StatusBadRequest)
		return
	}

	// Получаем user из контекста
	user := r.Context().Value("user").(*User)
	if user == nil {
		respondError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Парсим тело запроса
	var req struct {
		OptionID int `json:"option_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [Polls] Failed to decode vote request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.OptionID == 0 {
		respondError(w, "Option ID is required", http.StatusBadRequest)
		return
	}

	log.Printf("🗳️  [Polls] Creating vote: poll_id=%d, option_id=%d, user_id=%d", pollID, req.OptionID, user.ID)

	// Проверяем что опрос существует и не истек
	var expiresAt *string
	var multipleChoice bool
	err = db.QueryRow(`
		SELECT expires_at, multiple_choice 
		FROM polls 
		WHERE id = $1
	`, pollID).Scan(&expiresAt, &multipleChoice)

	if err != nil {
		log.Printf("❌ [Polls] Poll not found: poll_id=%d", pollID)
		respondError(w, "Poll not found", http.StatusNotFound)
		return
	}

	// Проверяем что вариант ответа существует
	var optionExists bool
	err = db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM poll_options WHERE id = $1 AND poll_id = $2)
	`, req.OptionID, pollID).Scan(&optionExists)

	if err != nil || !optionExists {
		log.Printf("❌ [Polls] Option not found: option_id=%d, poll_id=%d", req.OptionID, pollID)
		respondError(w, "Option not found", http.StatusNotFound)
		return
	}

	// Если опрос не поддерживает множественный выбор, удаляем предыдущий голос
	if !multipleChoice {
		_, err = db.Exec(`
			DELETE FROM poll_votes 
			WHERE poll_id = $1 AND user_id = $2
		`, pollID, user.ID)

		if err != nil {
			log.Printf("❌ [Polls] Failed to delete previous vote: %v", err)
		}
	}

	// Создаем голос
	_, err = db.Exec(`
		INSERT INTO poll_votes (poll_id, option_id, user_id, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (poll_id, option_id, user_id) DO NOTHING
	`, pollID, req.OptionID, user.ID)

	if err != nil {
		log.Printf("❌ [Polls] Failed to create vote: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Обновляем счетчик голосов
	_, err = db.Exec(`
		UPDATE poll_options 
		SET votes_count = (
			SELECT COUNT(*) 
			FROM poll_votes 
			WHERE option_id = $1
		)
		WHERE id = $1
	`, req.OptionID)

	if err != nil {
		log.Printf("⚠️  [Polls] Failed to update votes count: %v", err)
	}

	log.Printf("✅ [Polls] Vote created: poll_id=%d, option_id=%d, user_id=%d", pollID, req.OptionID, user.ID)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Vote created successfully",
	})
}
