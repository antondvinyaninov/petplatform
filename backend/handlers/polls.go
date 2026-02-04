package handlers

import (
	"backend/models"
	"backend/db"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// createPollForPost создает опрос для поста
func createPollForPost(postID int, pollReq *models.CreatePollRequest) error {
	// Валидация
	if pollReq.Question == "" {
		return nil // Опрос не создается, если нет вопроса
	}

	if len(pollReq.Options) < 2 {
		return nil // Минимум 2 варианта
	}

	if len(pollReq.Options) > 10 {
		return nil // Максимум 10 вариантов
	}

	// Создаем опрос
	query := ConvertPlaceholders(`INSERT INTO polls (post_id, question, multiple_choice, allow_vote_changes, expires_at) 
	          VALUES (?, ?, ?, ?, ?) RETURNING id`)

	var pollID int64
	err := db.DB.QueryRow(query, postID, pollReq.Question, pollReq.MultipleChoice, pollReq.AllowVoteChanges, pollReq.ExpiresAt).Scan(&pollID)
	if err != nil {
		return err
	}

	// Создаем варианты ответов
	for i, optionText := range pollReq.Options {
		if optionText == "" {
			continue // Пропускаем пустые варианты
		}

		_, err := db.DB.Exec(ConvertPlaceholders("INSERT INTO poll_options (poll_id, option_text, option_order) VALUES (?, ?, ?)"),
			pollID, optionText, i,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// loadPollForPost загружает опрос для поста
func loadPollForPost(postID int, userID int) (*models.Poll, error) {
	var poll models.Poll

	// Загружаем опрос
	query := ConvertPlaceholders(`SELECT id, post_id, question, multiple_choice, allow_vote_changes, expires_at, created_at 
	          FROM polls WHERE post_id = ?`)
	err := db.DB.QueryRow(query, postID).Scan(
		&poll.ID, &poll.PostID, &poll.Question, &poll.MultipleChoice,
		&poll.AllowVoteChanges, &poll.ExpiresAt, &poll.CreatedAt,
	)
	if err != nil {
		return nil, err // Опрос не найден
	}

	// Проверяем, истек ли опрос
	poll.IsExpired = isPollExpired(&poll)

	// Загружаем варианты ответов
	optionsQuery := ConvertPlaceholders(`SELECT id, poll_id, option_text, votes_count, option_order 
	                 FROM poll_options WHERE poll_id = ? ORDER BY option_order`)
	rows, err := db.DB.Query(optionsQuery, poll.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var options []models.PollOption
	totalVotes := 0

	for rows.Next() {
		var option models.PollOption
		err := rows.Scan(&option.ID, &option.PollID, &option.OptionText, &option.VotesCount, &option.OptionOrder)
		if err != nil {
			continue
		}
		totalVotes += option.VotesCount
		options = append(options, option)
	}

	poll.Options = options

	// Подсчитываем общее количество проголосовавших
	var totalVoters int
	db.DB.QueryRow(ConvertPlaceholders("SELECT COUNT(DISTINCT user_id) FROM poll_votes WHERE poll_id = ?"), poll.ID).Scan(&totalVoters)
	poll.TotalVoters = totalVoters

	// Проверяем, голосовал ли пользователь
	if userID > 0 {
		var voted int
		db.DB.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM poll_votes WHERE poll_id = ? AND user_id = ?"), poll.ID, userID).Scan(&voted)
		poll.UserVoted = voted > 0

		// Если пользователь голосовал, загружаем его голоса
		if poll.UserVoted {
			votesQuery := ConvertPlaceholders(`SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?`)
			voteRows, err := db.DB.Query(votesQuery, poll.ID, userID)
			if err == nil {
				defer voteRows.Close()
				var userVotes []int
				for voteRows.Next() {
					var optionID int
					voteRows.Scan(&optionID)
					userVotes = append(userVotes, optionID)
				}
				poll.UserVotes = userVotes
			}
		}
	}

	// Вычисляем проценты (только если пользователь голосовал или опрос истек)
	if poll.UserVoted || poll.IsExpired {
		for i := range poll.Options {
			if totalVoters > 0 {
				poll.Options[i].Percentage = float64(poll.Options[i].VotesCount) / float64(totalVoters) * 100
			} else {
				poll.Options[i].Percentage = 0
			}
		}
	}

	// Загружаем список проголосовавших для открытых опросов
	// Примечание: anonymous_voting удалено из схемы БД, показываем всех проголосовавших
	if poll.UserVoted || poll.IsExpired {
		// Загружаем всех проголосовавших
		votersQuery := ConvertPlaceholders(`
			SELECT DISTINCT pv.user_id, u.name, u.avatar
			FROM poll_votes pv
			LEFT JOIN users u ON pv.user_id = u.id
			WHERE pv.poll_id = ?
		`)
		votersRows, err := db.DB.Query(votersQuery, poll.ID)
		if err == nil {
			defer votersRows.Close()
			var allVoters []models.PollVoter
			for votersRows.Next() {
				var voter models.PollVoter
				var avatar *string
				votersRows.Scan(&voter.UserID, &voter.UserName, &avatar)
				if avatar != nil {
					voter.Avatar = *avatar
				}
				allVoters = append(allVoters, voter)
			}
			poll.Voters = allVoters
		}

		// Загружаем проголосовавших для каждого варианта
		for i := range poll.Options {
			optionVotersQuery := ConvertPlaceholders(`
				SELECT pv.user_id, u.name, u.avatar
				FROM poll_votes pv
				LEFT JOIN users u ON pv.user_id = u.id
				WHERE pv.poll_id = ? AND pv.option_id = ?
			`)
			optionVotersRows, err := db.DB.Query(optionVotersQuery, poll.ID, poll.Options[i].ID)
			if err == nil {
				defer optionVotersRows.Close()
				var optionVoters []models.PollVoter
				for optionVotersRows.Next() {
					var voter models.PollVoter
					var avatar *string
					optionVotersRows.Scan(&voter.UserID, &voter.UserName, &avatar)
					if avatar != nil {
						voter.Avatar = *avatar
					}
					optionVoters = append(optionVoters, voter)
				}
				poll.Options[i].Voters = optionVoters
			}
		}
	}

	return &poll, nil
}

// isPollExpired проверяет, истек ли опрос
func isPollExpired(poll *models.Poll) bool {
	if poll.ExpiresAt == nil {
		return false
	}

	expiresAt, err := time.Parse(time.RFC3339, *poll.ExpiresAt)
	if err != nil {
		return false
	}

	return time.Now().After(expiresAt)
}

// VoteHandler обрабатывает голосование
func VoteHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Извлекаем poll_id из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/polls/")
	path = strings.TrimSuffix(path, "/vote")
	pollID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID опроса", http.StatusBadRequest)
		return
	}

	// DELETE - отмена голоса
	if r.Method == http.MethodDelete {
		handleUnvote(w, pollID, userID)
		return
	}

	// POST - голосование
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Парсим запрос
	var req models.VoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	// Загружаем опрос
	var poll models.Poll
	query := ConvertPlaceholders(`SELECT id, post_id, question, multiple_choice, allow_vote_changes, expires_at 
	          FROM polls WHERE id = ?`)
	err = db.DB.QueryRow(query, pollID).Scan(
		&poll.ID, &poll.PostID, &poll.Question, &poll.MultipleChoice,
		&poll.AllowVoteChanges, &poll.ExpiresAt,
	)
	if err != nil {
		sendErrorResponse(w, "Опрос не найден", http.StatusNotFound)
		return
	}

	// Проверяем, не истек ли опрос
	if isPollExpired(&poll) {
		sendErrorResponse(w, "Опрос завершен", http.StatusBadRequest)
		return
	}

	// Проверяем, голосовал ли пользователь ранее
	var previousVotes int
	db.DB.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM poll_votes WHERE poll_id = ? AND user_id = ?"), pollID, userID).Scan(&previousVotes)

	if previousVotes > 0 && !poll.AllowVoteChanges {
		sendErrorResponse(w, "Вы уже проголосовали", http.StatusBadRequest)
		return
	}

	// Валидация: для single choice только один вариант
	if !poll.MultipleChoice && len(req.OptionIDs) > 1 {
		sendErrorResponse(w, "Можно выбрать только один вариант", http.StatusBadRequest)
		return
	}

	// Если пользователь уже голосовал и разрешено изменение, удаляем старые голоса
	if previousVotes > 0 && poll.AllowVoteChanges {
		// Уменьшаем счетчики для старых вариантов
		db.DB.Exec(ConvertPlaceholders(`UPDATE poll_options 
		                  SET votes_count = votes_count - 1 
		                  WHERE id IN (SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?)`),
			pollID, userID)

		// Удаляем старые голоса
		db.DB.Exec(ConvertPlaceholders("DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?"), pollID, userID)
	}

	// Добавляем новые голоса
	for _, optionID := range req.OptionIDs {
		// Проверяем, что вариант существует
		var exists int
		db.DB.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM poll_options WHERE id = ? AND poll_id = ?"), optionID, pollID).Scan(&exists)
		if exists == 0 {
			continue
		}

		// Добавляем голос
		_, err := db.DB.Exec(ConvertPlaceholders("INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)"),
			pollID, optionID, userID)
		if err != nil {
			continue
		}

		// Увеличиваем счетчик голосов
		db.DB.Exec(ConvertPlaceholders("UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = ?"), optionID)
	}

	// Загружаем обновленный опрос
	updatedPoll, err := loadPollForPost(poll.PostID, userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка загрузки опроса", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, updatedPoll)
}

// handleUnvote обрабатывает отмену голоса
func handleUnvote(w http.ResponseWriter, pollID int, userID int) {
	// Загружаем опрос
	var poll models.Poll
	query := ConvertPlaceholders(`SELECT id, post_id, question, multiple_choice, allow_vote_changes, expires_at 
	          FROM polls WHERE id = ?`)
	err := db.DB.QueryRow(query, pollID).Scan(
		&poll.ID, &poll.PostID, &poll.Question, &poll.MultipleChoice,
		&poll.AllowVoteChanges, &poll.ExpiresAt,
	)
	if err != nil {
		sendErrorResponse(w, "Опрос не найден", http.StatusNotFound)
		return
	}

	// Проверяем, не истек ли опрос
	if isPollExpired(&poll) {
		sendErrorResponse(w, "Опрос завершен", http.StatusBadRequest)
		return
	}

	// Проверяем, голосовал ли пользователь
	var previousVotes int
	db.DB.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM poll_votes WHERE poll_id = ? AND user_id = ?"), pollID, userID).Scan(&previousVotes)

	if previousVotes == 0 {
		sendErrorResponse(w, "Вы не голосовали в этом опросе", http.StatusBadRequest)
		return
	}

	// Уменьшаем счетчики для вариантов
	db.DB.Exec(ConvertPlaceholders(`UPDATE poll_options 
	                  SET votes_count = votes_count - 1 
	                  WHERE id IN (SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?)`),
		pollID, userID)

	// Удаляем голоса
	db.DB.Exec(ConvertPlaceholders("DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?"), pollID, userID)

	// Загружаем обновленный опрос
	updatedPoll, err := loadPollForPost(poll.PostID, userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка загрузки опроса", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, updatedPoll)
}

// GetPollByPostHandler возвращает опрос для поста (lazy loading)
// GET /api/polls/post/:post_id
func GetPollByPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Извлекаем post_id из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/polls/post/")
	postID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID поста", http.StatusBadRequest)
		return
	}

	// Получаем userID если пользователь авторизован (опционально)
	userID := 0
	if uid, ok := r.Context().Value("userID").(int); ok {
		userID = uid
	}

	// Загружаем опрос
	poll, err := loadPollForPost(postID, userID)
	if err != nil {
		// Опрос не найден - это нормально, не все посты имеют опросы
		sendErrorResponse(w, "Опрос не найден", http.StatusNotFound)
		return
	}

	sendSuccessResponse(w, poll)
}
