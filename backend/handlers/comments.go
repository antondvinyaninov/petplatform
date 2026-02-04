package handlers

import (
	"backend/models"
	"backend/db"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// CommentsHandler - получение и создание комментариев к посту
func CommentsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getComments(w, r)
	case http.MethodPost:
		createComment(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getComments(w http.ResponseWriter, r *http.Request) {
	// Извлекаем post_id из URL: /api/comments/post/123
	path := strings.TrimPrefix(r.URL.Path, "/api/comments/post/")
	postID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID поста", http.StatusBadRequest)
		return
	}

	query := ConvertPlaceholders(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, c.parent_id, c.reply_to_user_id,
		       u.name, u.email, u.avatar,
		       ru.name, ru.email, ru.avatar
		FROM comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN users ru ON c.reply_to_user_id = ru.id
		WHERE c.post_id = ?
		ORDER BY c.created_at ASC
	`)

	rows, err := db.DB.Query(query, postID)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения комментариев: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allComments []*models.Comment
	commentsMap := make(map[int]*models.Comment)

	for rows.Next() {
		var comment models.Comment
		var user models.User
		var parentID, replyToUserID sql.NullInt64
		var replyToName, replyToEmail, replyToAvatar sql.NullString

		err := rows.Scan(
			&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.CreatedAt,
			&parentID, &replyToUserID,
			&user.Name, &user.Email, &user.Avatar,
			&replyToName, &replyToEmail, &replyToAvatar,
		)
		if err != nil {
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}

		user.ID = comment.UserID
		comment.User = &user

		if parentID.Valid {
			pid := int(parentID.Int64)
			comment.ParentID = &pid
		}

		if replyToUserID.Valid && replyToName.Valid {
			ruid := int(replyToUserID.Int64)
			comment.ReplyToUserID = &ruid
			comment.ReplyToUser = &models.User{
				ID:     ruid,
				Name:   replyToName.String,
				Email:  replyToEmail.String,
				Avatar: replyToAvatar.String,
			}
		}

		commentsMap[comment.ID] = &comment
		allComments = append(allComments, &comment)
	}

	// Строим дерево комментариев (только 1 уровень вложенности)
	var rootComments []*models.Comment
	for _, comment := range allComments {
		if comment.ParentID == nil {
			// Это корневой комментарий
			rootComments = append(rootComments, comment)
		} else {
			// Это ответ на комментарий
			if parent, ok := commentsMap[*comment.ParentID]; ok {
				if parent.Replies == nil {
					parent.Replies = []*models.Comment{}
				}
				parent.Replies = append(parent.Replies, comment)
			}
		}
	}

	if rootComments == nil {
		rootComments = []*models.Comment{}
	}

	sendSuccessResponse(w, rootComments)
}

func createComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Извлекаем post_id из URL: /api/comments/post/123
	path := strings.TrimPrefix(r.URL.Path, "/api/comments/post/")
	postID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID поста", http.StatusBadRequest)
		return
	}

	var req models.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		sendErrorResponse(w, "Содержимое комментария не может быть пустым", http.StatusBadRequest)
		return
	}

	// Создаем комментарий с поддержкой ответов (PostgreSQL использует RETURNING вместо LastInsertId)
	query := ConvertPlaceholders(`INSERT INTO comments (post_id, user_id, content, parent_id, reply_to_user_id) VALUES (?, ?, ?, ?, ?) RETURNING id`)
	var id int64
	err = db.DB.QueryRow(query, postID, userID, req.Content, req.ParentID, req.ReplyToUserID).Scan(&id)
	if err != nil {
		sendErrorResponse(w, "Ошибка создания комментария: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ✅ Увеличиваем счетчик комментариев
	_, err = db.DB.Exec(ConvertPlaceholders("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?"), postID)
	if err != nil {
		sendErrorResponse(w, "Ошибка обновления счетчика: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Получаем созданный комментарий с данными пользователя
	var comment models.Comment
	var user models.User
	var parentID, replyToUserID sql.NullInt64
	var replyToName, replyToEmail, replyToAvatar sql.NullString

	query = ConvertPlaceholders(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, c.parent_id, c.reply_to_user_id,
		       u.name, u.email, u.avatar,
		       ru.name, ru.email, ru.avatar
		FROM comments c
		JOIN users u ON c.user_id = u.id
		LEFT JOIN users ru ON c.reply_to_user_id = ru.id
		WHERE c.id = ?
	`)
	err = db.DB.QueryRow(query, id).Scan(
		&comment.ID, &comment.PostID, &comment.UserID, &comment.Content, &comment.CreatedAt,
		&parentID, &replyToUserID,
		&user.Name, &user.Email, &user.Avatar,
		&replyToName, &replyToEmail, &replyToAvatar,
	)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения комментария", http.StatusInternalServerError)
		return
	}

	user.ID = comment.UserID
	comment.User = &user

	if parentID.Valid {
		pid := int(parentID.Int64)
		comment.ParentID = &pid
	}

	if replyToUserID.Valid && replyToName.Valid {
		ruid := int(replyToUserID.Int64)
		comment.ReplyToUserID = &ruid
		comment.ReplyToUser = &models.User{
			ID:     ruid,
			Name:   replyToName.String,
			Email:  replyToEmail.String,
			Avatar: replyToAvatar.String,
		}
	}

	// Создаем уведомление для автора поста
	var postAuthorID int
	var commenterLastName sql.NullString
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT p.author_id, u.last_name 
		FROM posts p 
		JOIN users u ON u.id = ? 
		WHERE p.id = ?
	`), userID, postID).Scan(&postAuthorID, &commenterLastName)

	if err == nil && postAuthorID != userID {
		// Формируем имя комментатора
		fullName := user.Name
		if commenterLastName.Valid && commenterLastName.String != "" {
			fullName += " " + commenterLastName.String
		}

		// Создаем уведомление
		notifHandler := &NotificationsHandler{DB: db.DB}
		notifHandler.NotifyComment(postAuthorID, userID, postID, fullName)
	}

	// Логируем создание комментария
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	CreateUserLog(db.DB, userID, "comment_create", "Создан комментарий к посту", ipAddress, userAgent)

	sendSuccessResponse(w, comment)
}

// DeleteCommentHandler - удаление комментария
func DeleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Извлекаем comment_id из URL: /api/comments/123
	path := strings.TrimPrefix(r.URL.Path, "/api/comments/")
	commentID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID комментария", http.StatusBadRequest)
		return
	}

	// Проверяем, что комментарий принадлежит пользователю
	var ownerID, postID int
	err = db.DB.QueryRow(ConvertPlaceholders("SELECT user_id, post_id FROM comments WHERE id = ?"), commentID).Scan(&ownerID, &postID)
	if err != nil {
		sendErrorResponse(w, "Комментарий не найден", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		sendErrorResponse(w, "Нет прав на удаление этого комментария", http.StatusForbidden)
		return
	}

	_, err = db.DB.Exec(ConvertPlaceholders("DELETE FROM comments WHERE id = ?"), commentID)
	if err != nil {
		sendErrorResponse(w, "Ошибка удаления комментария: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ✅ Уменьшаем счетчик комментариев
	_, err = db.DB.Exec(ConvertPlaceholders("UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?"), postID)
	if err != nil {
		sendErrorResponse(w, "Ошибка обновления счетчика: "+err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, map[string]string{"message": "Комментарий удален"})
}
