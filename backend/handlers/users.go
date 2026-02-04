package handlers

import (
	"backend/models"
	"backend/db"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// convertPlaceholdersUsers converts ? to $1, $2, $3 for PostgreSQL
func convertPlaceholdersUsers(query string) string {
	if os.Getenv("ENVIRONMENT") == "production" {
		result := ""
		paramNum := 1
		for _, char := range query {
			if char == '?' {
				result += fmt.Sprintf("$%d", paramNum)
				paramNum++
			} else {
				result += string(char)
			}
		}
		return result
	}
	return query
}

func UsersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		handleGetUsers(w, r)
	case http.MethodPost:
		handleCreateUser(w, r)
	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func UserHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("🔍 UserHandler: Received %s request to %s", r.Method, r.URL.Path)
	w.Header().Set("Content-Type", "application/json")

	id := extractID(r.URL.Path)
	log.Printf("🔍 UserHandler: Extracted ID: %d", id)

	if id == 0 {
		sendError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		log.Printf("🔍 UserHandler: Calling handleGetUser for id=%d", id)
		// GET публичный - можно просматривать профили без авторизации
		handleGetUser(w, r, id)
	case http.MethodPut:
		// PUT требует авторизации - проверяем токен
		userID, ok := r.Context().Value("userID").(int)
		if !ok {
			sendError(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		// Можно редактировать только свой профиль
		if userID != id {
			sendError(w, "Forbidden", http.StatusForbidden)
			return
		}
		handleUpdateUser(w, r, id)
	case http.MethodDelete:
		// DELETE требует авторизации
		userID, ok := r.Context().Value("userID").(int)
		if !ok {
			sendError(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		// Можно удалить только свой профиль
		if userID != id {
			sendError(w, "Forbidden", http.StatusForbidden)
			return
		}
		handleDeleteUser(w, r, id)
	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleGetUsers(w http.ResponseWriter, _ *http.Request) {
	rows, err := db.DB.Query("SELECT id, name, last_name, email, avatar, created_at, verified, verified_at FROM users")
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		var lastName, avatar sql.NullString
		var verified sql.NullBool
		var verifiedAt sql.NullString

		if err := rows.Scan(&user.ID, &user.Name, &lastName, &user.Email, &avatar, &user.CreatedAt, &verified, &verifiedAt); err != nil {
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Конвертируем NULL значения
		if lastName.Valid {
			user.LastName = lastName.String
		}
		if avatar.Valid {
			user.Avatar = avatar.String
		}
		if verified.Valid {
			user.Verified = verified.Bool
		}
		if verifiedAt.Valid {
			verifiedAtStr := verifiedAt.String
			user.VerifiedAt = &verifiedAtStr
		}

		users = append(users, user)
	}

	sendSuccess(w, users)
}

func handleGetUser(w http.ResponseWriter, _ *http.Request, id int) {
	// Helper для конвертации ? в $1 для PostgreSQL
	convertPlaceholders := func(query string) string {
		if os.Getenv("ENVIRONMENT") == "production" {
			result := ""
			paramNum := 1
			for _, char := range query {
				if char == '?' {
					result += fmt.Sprintf("$%d", paramNum)
					paramNum++
				} else {
					result += string(char)
				}
			}
			return result
		}
		return query
	}

	// Получаем данные пользователя из локальной БД Main Backend
	var user models.User
	query := `SELECT u.id, u.name, u.last_name, u.email, u.bio, u.phone, u.location, u.avatar, u.cover_photo,
	          u.profile_visibility, u.show_phone, u.show_email, u.allow_messages, u.show_online, 
	          u.verified, u.verified_at, u.created_at,
	          ua.last_seen
	          FROM users u
	          LEFT JOIN user_activity ua ON u.id = ua.user_id
	          WHERE u.id = ?`

	query = convertPlaceholders(query)

	var lastSeenTime sql.NullString
	var bio, phone, location, avatar, coverPhoto sql.NullString
	var profileVisibility, showPhone, showEmail, allowMessages, showOnline sql.NullString
	var verified sql.NullBool
	var verifiedAt, createdAt sql.NullString

	err := db.DB.QueryRow(query, id).Scan(
		&user.ID, &user.Name, &user.LastName, &user.Email, &bio, &phone,
		&location, &avatar, &coverPhoto,
		&profileVisibility, &showPhone, &showEmail, &allowMessages, &showOnline,
		&verified, &verifiedAt, &createdAt,
		&lastSeenTime,
	)

	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			sendError(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("❌ Database error: %v", err)
		sendError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Заполняем NULL-able поля
	if bio.Valid {
		user.Bio = bio.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}
	if location.Valid {
		user.Location = location.String
	}
	if avatar.Valid {
		user.Avatar = avatar.String
	}
	if coverPhoto.Valid {
		user.CoverPhoto = coverPhoto.String
	}
	if profileVisibility.Valid {
		user.ProfileVisibility = profileVisibility.String
	}
	if showPhone.Valid {
		user.ShowPhone = showPhone.String
	}
	if showEmail.Valid {
		user.ShowEmail = showEmail.String
	}
	if allowMessages.Valid {
		user.AllowMessages = allowMessages.String
	}
	if showOnline.Valid {
		user.ShowOnline = showOnline.String
	}
	if verified.Valid {
		user.Verified = verified.Bool
	}
	if verifiedAt.Valid {
		verifiedAtStr := verifiedAt.String
		user.VerifiedAt = &verifiedAtStr
	}
	if createdAt.Valid {
		user.CreatedAt = createdAt.String
	}

	// Устанавливаем LastSeen если есть
	if lastSeenTime.Valid {
		user.LastSeen = parseTime(lastSeenTime.String)
	}

	// Проверяем онлайн статус (активен в последние 5 минут)
	if user.LastSeen != nil {
		fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
		user.IsOnline = user.LastSeen.After(fiveMinutesAgo)
	}

	// Возвращаем данные пользователя
	sendSuccess(w, user)
	log.Printf("✅ User profile loaded from Main Backend: id=%d, name=%s, last_name=%s, is_online=%v", id, user.Name, user.LastName, user.IsOnline)
}

func handleCreateUser(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Email == "" {
		sendError(w, "Name and email are required", http.StatusBadRequest)
		return
	}

	query := convertPlaceholdersUsers("INSERT INTO users (name, email) VALUES (?, ?) RETURNING id")
	var id int64
	err := db.DB.QueryRow(query, req.Name, req.Email).Scan(&id)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]interface{}{"id": id, "name": req.Name, "email": req.Email})
}

func handleUpdateUser(w http.ResponseWriter, r *http.Request, id int) {
	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	query := convertPlaceholdersUsers("UPDATE users SET name = ?, email = ? WHERE id = ?")
	_, err := db.DB.Exec(query, req.Name, req.Email, id)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]interface{}{"id": id, "name": req.Name, "email": req.Email})
}

func handleDeleteUser(w http.ResponseWriter, _ *http.Request, id int) {
	query := convertPlaceholdersUsers("DELETE FROM users WHERE id = ?")
	_, err := db.DB.Exec(query, id)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]string{"message": "User deleted"})
}

func extractID(path string) int {
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		return 0
	}
	id, _ := strconv.Atoi(parts[3])
	return id
}

// GetUsersStatsHandler возвращает статистику пользователей (всего/онлайн) и контента
func GetUsersStatsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем общее количество пользователей
	var totalUsers int
	err := db.DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)
	if err != nil {
		log.Printf("❌ Error counting users: %v", err)
		sendError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Получаем количество онлайн пользователей (активны в последние 5 минут)
	fiveMinutesAgo := time.Now().Add(-5 * time.Minute).Format("2006-01-02 15:04:05")
	query := convertPlaceholdersUsers("SELECT COUNT(*) FROM user_activity WHERE last_seen > ?")

	var onlineUsers int
	err = db.DB.QueryRow(query, fiveMinutesAgo).Scan(&onlineUsers)
	if err != nil {
		log.Printf("❌ Error counting online users: %v", err)
		sendError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Получаем количество постов
	var totalPosts int
	err = db.DB.QueryRow("SELECT COUNT(*) FROM posts").Scan(&totalPosts)
	if err != nil {
		log.Printf("❌ Error counting posts: %v", err)
		totalPosts = 0 // Не критично, продолжаем
	}

	// Получаем количество лайков
	var totalLikes int
	err = db.DB.QueryRow("SELECT COUNT(*) FROM likes").Scan(&totalLikes)
	if err != nil {
		log.Printf("❌ Error counting likes: %v", err)
		totalLikes = 0 // Не критично, продолжаем
	}

	// Получаем количество комментариев
	var totalComments int
	err = db.DB.QueryRow("SELECT COUNT(*) FROM comments").Scan(&totalComments)
	if err != nil {
		log.Printf("❌ Error counting comments: %v", err)
		totalComments = 0 // Не критично, продолжаем
	}

	log.Printf("📊 Platform stats: users=%d, online=%d, posts=%d, likes=%d, comments=%d",
		totalUsers, onlineUsers, totalPosts, totalLikes, totalComments)

	sendSuccess(w, map[string]interface{}{
		"total":    totalUsers,
		"online":   onlineUsers,
		"posts":    totalPosts,
		"likes":    totalLikes,
		"comments": totalComments,
	})
}

func sendSuccess(w http.ResponseWriter, data interface{}) {
	json.NewEncoder(w).Encode(models.Response{Success: true, Data: data})
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(models.Response{Success: false, Error: message})
}
