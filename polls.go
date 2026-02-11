package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// PollOption представляет вариант ответа в опросе
type PollOption struct {
	ID         int                      `json:"id"`
	OptionText string                   `json:"option_text"`
	VotesCount int                      `json:"votes_count"`
	Percentage float64                  `json:"percentage"`
	Voters     []map[string]interface{} `json:"voters,omitempty"`
}

// Poll представляет опрос
type Poll struct {
	ID               int          `json:"id"`
	PostID           int          `json:"post_id"`
	Question         string       `json:"question"`
	Options          []PollOption `json:"options"`
	MultipleChoice   bool         `json:"multiple_choice"`
	AllowVoteChanges bool         `json:"allow_vote_changes"`
	IsAnonymous      bool         `json:"is_anonymous"`
	ExpiresAt        *time.Time   `json:"expires_at,omitempty"`
	TotalVoters      int          `json:"total_voters"`
	UserVoted        bool         `json:"user_voted"`
	UserVotes        []int        `json:"user_votes"`
	IsExpired        bool         `json:"is_expired"`
}

// GetPollByPostIDHandler возвращает опрос для поста (публичный endpoint)
func GetPollByPostIDHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.Atoi(vars["post_id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	// Получаем user из контекста (может быть nil для публичного доступа)
	var userID int
	if user := r.Context().Value("user"); user != nil {
		userID = user.(*User).ID
	}

	log.Printf("🗳️  [Polls] Getting poll for post_id=%d, user_id=%d", postID, userID)

	poll, err := getPollByPostID(postID, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			respondError(w, "Poll not found", http.StatusNotFound)
			return
		}
		log.Printf("❌ [Polls] Failed to get poll: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    poll,
	})
}

// VotePollHandler создает голос в опросе (поддержка множественного выбора)
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
		OptionIDs []int `json:"option_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ [Polls] Failed to decode vote request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация: option_ids не должен быть пустым
	if len(req.OptionIDs) == 0 {
		respondError(w, "option_ids cannot be empty", http.StatusBadRequest)
		return
	}

	log.Printf("🗳️  [Polls] Creating vote: poll_id=%d, option_ids=%v, user_id=%d", pollID, req.OptionIDs, user.ID)

	// Получаем информацию об опросе
	var postID int
	var expiresAt sql.NullTime
	var multipleChoice bool
	err = db.QueryRow(`
		SELECT post_id, expires_at, COALESCE(multiple_choice, false) as multiple_choice
		FROM polls 
		WHERE id = $1
	`, pollID).Scan(&postID, &expiresAt, &multipleChoice)

	if err == sql.ErrNoRows {
		log.Printf("❌ [Polls] Poll not found: poll_id=%d", pollID)
		respondError(w, "Poll not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [Polls] Database error: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Пытаемся получить allow_vote_changes если поле существует
	var allowVoteChanges bool = true // По умолчанию разрешаем изменения
	var allowVoteChangesNull sql.NullBool
	db.QueryRow(`
		SELECT CASE WHEN EXISTS(
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'polls' AND column_name = 'allow_vote_changes'
		) THEN (SELECT allow_vote_changes FROM polls WHERE id = $1)
		ELSE NULL END
	`, pollID).Scan(&allowVoteChangesNull)

	if allowVoteChangesNull.Valid {
		allowVoteChanges = allowVoteChangesNull.Bool
	}

	// Проверка что опрос не истек
	if expiresAt.Valid && expiresAt.Time.Before(time.Now()) {
		log.Printf("⚠️  [Polls] Poll expired: poll_id=%d, expires_at=%v", pollID, expiresAt.Time)
		respondError(w, "Poll has expired", http.StatusBadRequest)
		return
	}

	// Проверка множественного выбора
	if !multipleChoice && len(req.OptionIDs) > 1 {
		respondError(w, "Multiple choice is not allowed for this poll", http.StatusBadRequest)
		return
	}

	// Проверка что пользователь еще не голосовал (если изменения запрещены)
	if !allowVoteChanges {
		var hasVoted bool
		err = db.QueryRow(`
			SELECT EXISTS(SELECT 1 FROM poll_votes WHERE poll_id = $1 AND user_id = $2)
		`, pollID, user.ID).Scan(&hasVoted)

		if err == nil && hasVoted {
			respondError(w, "You have already voted and changes are not allowed", http.StatusBadRequest)
			return
		}
	}

	// Проверяем что все варианты ответа существуют
	for _, optionID := range req.OptionIDs {
		var optionExists bool
		err = db.QueryRow(`
			SELECT EXISTS(SELECT 1 FROM poll_options WHERE id = $1 AND poll_id = $2)
		`, optionID, pollID).Scan(&optionExists)

		if err != nil || !optionExists {
			log.Printf("❌ [Polls] Option not found: option_id=%d, poll_id=%d", optionID, pollID)
			respondError(w, "Invalid option_id", http.StatusBadRequest)
			return
		}
	}

	// Начинаем транзакцию
	tx, err := db.Begin()
	if err != nil {
		log.Printf("❌ [Polls] Failed to begin transaction: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Удаляем предыдущие голоса пользователя
	_, err = tx.Exec(`
		DELETE FROM poll_votes 
		WHERE poll_id = $1 AND user_id = $2
	`, pollID, user.ID)

	if err != nil {
		log.Printf("❌ [Polls] Failed to delete previous votes: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Создаем новые голоса
	for _, optionID := range req.OptionIDs {
		_, err = tx.Exec(`
			INSERT INTO poll_votes (poll_id, option_id, user_id, created_at)
			VALUES ($1, $2, $3, NOW())
		`, pollID, optionID, user.ID)

		if err != nil {
			log.Printf("❌ [Polls] Failed to create vote: %v", err)
			respondError(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	// Обновляем счетчики голосов для всех опций этого опроса
	_, err = tx.Exec(`
		UPDATE poll_options 
		SET votes_count = (
			SELECT COUNT(*) 
			FROM poll_votes 
			WHERE option_id = poll_options.id
		)
		WHERE poll_id = $1
	`, pollID)

	if err != nil {
		log.Printf("⚠️  [Polls] Failed to update votes count: %v", err)
	}

	// Коммитим транзакцию
	if err = tx.Commit(); err != nil {
		log.Printf("❌ [Polls] Failed to commit transaction: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ [Polls] Vote created: poll_id=%d, option_ids=%v, user_id=%d", pollID, req.OptionIDs, user.ID)

	// Возвращаем обновленный опрос
	poll, err := getPollByPostID(postID, user.ID)
	if err != nil {
		log.Printf("⚠️  [Polls] Failed to get updated poll: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": true,
			"message": "Vote created successfully",
		})
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    poll,
	})
}

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

	// Получаем post_id для возврата обновленного опроса
	var postID int
	err = db.QueryRow(`
		SELECT post_id
		FROM polls 
		WHERE id = $1
	`, pollID).Scan(&postID)

	if err == sql.ErrNoRows {
		respondError(w, "Poll not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ [Polls] Database error: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Пытаемся получить allow_vote_changes если поле существует
	var allowVoteChanges bool = true // По умолчанию разрешаем изменения
	var allowVoteChangesNull sql.NullBool
	db.QueryRow(`
		SELECT CASE WHEN EXISTS(
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'polls' AND column_name = 'allow_vote_changes'
		) THEN (SELECT allow_vote_changes FROM polls WHERE id = $1)
		ELSE NULL END
	`, pollID).Scan(&allowVoteChangesNull)

	if allowVoteChangesNull.Valid {
		allowVoteChanges = allowVoteChangesNull.Bool
	}

	// Проверка что изменения разрешены
	if !allowVoteChanges {
		respondError(w, "Vote changes are not allowed for this poll", http.StatusBadRequest)
		return
	}

	// Начинаем транзакцию
	tx, err := db.Begin()
	if err != nil {
		log.Printf("❌ [Polls] Failed to begin transaction: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Удаляем голос пользователя
	result, err := tx.Exec(`
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

	// Обновляем счетчики голосов
	_, err = tx.Exec(`
		UPDATE poll_options 
		SET votes_count = (
			SELECT COUNT(*) 
			FROM poll_votes 
			WHERE option_id = poll_options.id
		)
		WHERE poll_id = $1
	`, pollID)

	if err != nil {
		log.Printf("⚠️  [Polls] Failed to update votes count: %v", err)
	}

	// Коммитим транзакцию
	if err = tx.Commit(); err != nil {
		log.Printf("❌ [Polls] Failed to commit transaction: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ [Polls] Vote deleted: poll_id=%d, user_id=%d", pollID, user.ID)

	// Возвращаем обновленный опрос
	poll, err := getPollByPostID(postID, user.ID)
	if err != nil {
		log.Printf("⚠️  [Polls] Failed to get updated poll: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": true,
			"message": "Vote deleted successfully",
		})
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    poll,
	})
}

// getPollByPostID возвращает опрос для поста с полной информацией
func getPollByPostID(postID int, userID int) (*Poll, error) {
	poll := &Poll{}

	// Получаем информацию об опросе
	// Используем только поля которые точно существуют
	var expiresAt sql.NullTime
	err := db.QueryRow(`
		SELECT id, post_id, question, 
		       COALESCE(multiple_choice, false) as multiple_choice,
		       expires_at
		FROM polls 
		WHERE post_id = $1
	`, postID).Scan(
		&poll.ID, &poll.PostID, &poll.Question,
		&poll.MultipleChoice, &expiresAt,
	)

	if err != nil {
		return nil, err
	}

	// Устанавливаем значения по умолчанию для полей которых может не быть
	poll.AllowVoteChanges = true // По умолчанию разрешаем изменять голос
	poll.IsAnonymous = false     // По умолчанию опросы не анонимные

	// Пытаемся получить дополнительные поля если они есть
	var allowVoteChanges sql.NullBool
	var isAnonymous sql.NullBool
	db.QueryRow(`
		SELECT 
			CASE WHEN EXISTS(
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'polls' AND column_name = 'allow_vote_changes'
			) THEN (SELECT allow_vote_changes FROM polls WHERE id = $1)
			ELSE NULL END as allow_vote_changes,
			CASE WHEN EXISTS(
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'polls' AND column_name = 'is_anonymous'
			) THEN (SELECT is_anonymous FROM polls WHERE id = $1)
			ELSE NULL END as is_anonymous
	`, poll.ID).Scan(&allowVoteChanges, &isAnonymous)

	if allowVoteChanges.Valid {
		poll.AllowVoteChanges = allowVoteChanges.Bool
	}
	if isAnonymous.Valid {
		poll.IsAnonymous = isAnonymous.Bool
	}

	if expiresAt.Valid {
		poll.ExpiresAt = &expiresAt.Time
		poll.IsExpired = expiresAt.Time.Before(time.Now())
	}

	// Получаем варианты ответа
	rows, err := db.Query(`
		SELECT id, option_text, COALESCE(votes_count, 0) as votes_count
		FROM poll_options
		WHERE poll_id = $1
		ORDER BY id
	`, poll.ID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Подсчитываем общее количество голосов
	var totalVotes int
	for rows.Next() {
		var option PollOption
		if err := rows.Scan(&option.ID, &option.OptionText, &option.VotesCount); err != nil {
			continue
		}
		totalVotes += option.VotesCount
		poll.Options = append(poll.Options, option)
	}

	// Подсчитываем проценты и загружаем проголосовавших
	for i := range poll.Options {
		if totalVotes > 0 {
			poll.Options[i].Percentage = float64(poll.Options[i].VotesCount) / float64(totalVotes) * 100
		}

		// Загружаем список проголосовавших (если не анонимный опрос)
		if !poll.IsAnonymous {
			votersRows, err := db.Query(`
				SELECT u.id, u.name, u.avatar
				FROM poll_votes pv
				JOIN users u ON pv.user_id = u.id
				WHERE pv.option_id = $1
				ORDER BY pv.created_at DESC
			`, poll.Options[i].ID)

			if err == nil {
				defer votersRows.Close()
				for votersRows.Next() {
					var voterID int
					var voterName string
					var voterAvatar sql.NullString

					if err := votersRows.Scan(&voterID, &voterName, &voterAvatar); err == nil {
						voter := map[string]interface{}{
							"id":   voterID,
							"name": voterName,
						}
						if voterAvatar.Valid {
							voter["avatar"] = voterAvatar.String
						}
						poll.Options[i].Voters = append(poll.Options[i].Voters, voter)
					}
				}
			}
		}
	}

	// Подсчитываем уникальных проголосовавших
	err = db.QueryRow(`
		SELECT COUNT(DISTINCT user_id)
		FROM poll_votes
		WHERE poll_id = $1
	`, poll.ID).Scan(&poll.TotalVoters)

	if err != nil {
		poll.TotalVoters = 0
	}

	// Проверяем голосовал ли текущий пользователь
	if userID > 0 {
		var hasVoted bool
		err = db.QueryRow(`
			SELECT EXISTS(SELECT 1 FROM poll_votes WHERE poll_id = $1 AND user_id = $2)
		`, poll.ID, userID).Scan(&hasVoted)

		if err == nil {
			poll.UserVoted = hasVoted
		}

		// Получаем варианты за которые проголосовал пользователь
		if hasVoted {
			voteRows, err := db.Query(`
				SELECT option_id
				FROM poll_votes
				WHERE poll_id = $1 AND user_id = $2
			`, poll.ID, userID)

			if err == nil {
				defer voteRows.Close()
				for voteRows.Next() {
					var optionID int
					if err := voteRows.Scan(&optionID); err == nil {
						poll.UserVotes = append(poll.UserVotes, optionID)
					}
				}
			}
		}
	}

	return poll, nil
}
