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

// ActivityStats возвращает статистику активности пользователей
func ActivityStatsHandler(w http.ResponseWriter, r *http.Request) {
	var stats struct {
		OnlineNow      int `json:"online_now"`
		ActiveLastHour int `json:"active_last_hour"`
		ActiveLast24h  int `json:"active_last_24h"`
	}

	// Online now (последние 5 минут)
	err := db.QueryRow(`
		SELECT COUNT(DISTINCT user_id) 
		FROM user_activity 
		WHERE last_seen > NOW() - INTERVAL '5 minutes'
	`).Scan(&stats.OnlineNow)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get online_now: %v", err)
	}

	// Active last hour
	err = db.QueryRow(`
		SELECT COUNT(DISTINCT user_id) 
		FROM user_activity 
		WHERE last_seen > NOW() - INTERVAL '1 hour'
	`).Scan(&stats.ActiveLastHour)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get active_last_hour: %v", err)
	}

	// Active last 24h
	err = db.QueryRow(`
		SELECT COUNT(DISTINCT user_id) 
		FROM user_activity 
		WHERE last_seen > NOW() - INTERVAL '24 hours'
	`).Scan(&stats.ActiveLast24h)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get active_last_24h: %v", err)
	}

	respondJSON(w, stats)
}

// GetUsersHandler возвращает список всех пользователей
func GetUsersHandler(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT u.id, u.email, u.name, u.last_name, u.avatar, 
		       u.verified, u.created_at, COALESCE(ur.role, 'user') as role
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
		ORDER BY u.created_at DESC
		LIMIT 100
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ Failed to get users: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var email, name string
		var lastName, avatar sql.NullString
		var verified bool
		var createdAt time.Time
		var role string

		err := rows.Scan(&id, &email, &name, &lastName, &avatar, &verified, &createdAt, &role)
		if err != nil {
			log.Printf("❌ Failed to scan user: %v", err)
			continue
		}

		user := map[string]interface{}{
			"id":         id,
			"email":      email,
			"name":       name,
			"verified":   verified,
			"created_at": createdAt,
			"role":       role,
		}

		if lastName.Valid {
			user["last_name"] = lastName.String
		}
		if avatar.Valid {
			user["avatar"] = avatar.String
		}

		users = append(users, user)
	}

	respondJSON(w, users)
}

// GetUserByIDHandler возвращает данные пользователя по ID
func GetUserByIDHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var user User
	var lastName, bio, phone, location, avatar, coverPhoto sql.NullString

	query := `
		SELECT u.id, u.email, u.name, u.last_name,
		       u.bio, u.phone, u.location, u.avatar, u.cover_photo,
		       u.profile_visibility, u.show_phone, u.show_email,
		       u.allow_messages, u.show_online, u.verified, u.created_at,
		       COALESCE(ur.role, 'user') as role
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
		WHERE u.id = $1
		LIMIT 1`

	err = db.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.Name, &lastName,
		&bio, &phone, &location, &avatar,
		&coverPhoto, &user.ProfileVisibility, &user.ShowPhone,
		&user.ShowEmail, &user.AllowMessages, &user.ShowOnline,
		&user.Verified, &user.CreatedAt, &user.Role,
	)

	if err == sql.ErrNoRows {
		respondError(w, "User not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ Failed to get user: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Конвертируем NULL значения
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if bio.Valid {
		user.Bio = &bio.String
	}
	if phone.Valid {
		user.Phone = &phone.String
	}
	if location.Valid {
		user.Location = &location.String
	}
	if avatar.Valid {
		user.Avatar = &avatar.String
	}
	if coverPhoto.Valid {
		user.CoverPhoto = &coverPhoto.String
	}

	respondJSON(w, user)
}

// VerifyUserHandler верифицирует пользователя
func VerifyUserHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID int `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec("UPDATE users SET verified = true WHERE id = $1", req.UserID)
	if err != nil {
		log.Printf("❌ Failed to verify user: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "User verified successfully",
	})
}

// UnverifyUserHandler снимает верификацию с пользователя
func UnverifyUserHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID int `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec("UPDATE users SET verified = false WHERE id = $1", req.UserID)
	if err != nil {
		log.Printf("❌ Failed to unverify user: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "User verification removed successfully",
	})
}

// GetUserRolesHandler возвращает роли пользователя
func GetUserRolesHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	rows, err := db.Query(`
		SELECT role, is_active, granted_at, granted_by
		FROM user_roles
		WHERE user_id = $1
		ORDER BY granted_at DESC
	`, userID)
	if err != nil {
		log.Printf("❌ Failed to get user roles: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	roles := []map[string]interface{}{}
	for rows.Next() {
		var role string
		var isActive bool
		var grantedAt time.Time
		var grantedBy sql.NullInt64

		err := rows.Scan(&role, &isActive, &grantedAt, &grantedBy)
		if err != nil {
			log.Printf("❌ Failed to scan role: %v", err)
			continue
		}

		roleData := map[string]interface{}{
			"role":       role,
			"is_active":  isActive,
			"granted_at": grantedAt,
		}

		if grantedBy.Valid {
			roleData["granted_by"] = grantedBy.Int64
		}

		roles = append(roles, roleData)
	}

	respondJSON(w, roles)
}

// GetAvailableRolesHandler возвращает список доступных ролей
func GetAvailableRolesHandler(w http.ResponseWriter, r *http.Request) {
	roles := []string{"user", "moderator", "admin", "superadmin"}
	respondJSON(w, roles)
}

// GrantRoleHandler выдает роль пользователю
func GrantRoleHandler(w http.ResponseWriter, r *http.Request) {
	contextUser := r.Context().Value("user").(*User)

	var req struct {
		UserID int    `json:"user_id"`
		Role   string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Проверяем, что роль валидна
	validRoles := map[string]bool{
		"user": true, "moderator": true, "admin": true, "superadmin": true,
	}
	if !validRoles[req.Role] {
		respondError(w, "Invalid role", http.StatusBadRequest)
		return
	}

	// Деактивируем старые роли
	_, err := db.Exec("UPDATE user_roles SET is_active = false WHERE user_id = $1", req.UserID)
	if err != nil {
		log.Printf("❌ Failed to deactivate old roles: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Добавляем новую роль
	_, err = db.Exec(`
		INSERT INTO user_roles (user_id, role, granted_by, is_active)
		VALUES ($1, $2, $3, true)
	`, req.UserID, req.Role, contextUser.ID)
	if err != nil {
		log.Printf("❌ Failed to grant role: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Role granted successfully",
	})
}

// RevokeRoleHandler отзывает роль у пользователя
func RevokeRoleHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID int    `json:"user_id"`
		Role   string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	_, err := db.Exec(`
		UPDATE user_roles 
		SET is_active = false 
		WHERE user_id = $1 AND role = $2
	`, req.UserID, req.Role)
	if err != nil {
		log.Printf("❌ Failed to revoke role: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Role revoked successfully",
	})
}

// GetAllPostsHandler возвращает список всех постов для админки
func GetAllPostsHandler(w http.ResponseWriter, r *http.Request) {
	// Сначала проверим, есть ли вообще посты
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM posts").Scan(&count)
	if err != nil {
		log.Printf("❌ Failed to count posts: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	log.Printf("📊 Total posts in database: %d", count)

	// Упрощенный запрос - только основные поля из posts
	query := `
		SELECT p.id, p.user_id, p.content, p.created_at
		FROM posts p
		ORDER BY p.created_at DESC
		LIMIT 100
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ Failed to get posts: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	posts := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var userID sql.NullInt64 // Изменено: поддержка NULL значений
		var content string
		var createdAt time.Time

		err := rows.Scan(&id, &userID, &content, &createdAt)
		if err != nil {
			log.Printf("❌ Failed to scan post: %v", err)
			continue
		}

		post := map[string]interface{}{
			"id":         id,
			"content":    content,
			"created_at": createdAt,
		}

		// Добавляем user_id только если он не NULL
		if userID.Valid {
			post["user_id"] = userID.Int64
		} else {
			post["user_id"] = nil
		}

		posts = append(posts, post)
	}

	log.Printf("✅ Returning %d posts", len(posts))
	respondJSON(w, posts)
}

// DeletePostHandler удаляет пост
func DeletePostHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("DELETE FROM posts WHERE id = $1", postID)
	if err != nil {
		log.Printf("❌ Failed to delete post: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Post deleted successfully",
	})
}

// GetUserPetsHandler возвращает питомцев пользователя
func GetUserPetsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT id, user_id, name, species, breed, age, gender, 
		       avatar, description, created_at
		FROM pets
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := db.Query(query, userID)
	if err != nil {
		log.Printf("❌ Failed to get pets: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	pets := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var petUserID sql.NullInt64 // Изменено: поддержка NULL значений
		var name, species string
		var breed, gender, avatar, description sql.NullString
		var age sql.NullInt64
		var createdAt time.Time

		err := rows.Scan(&id, &petUserID, &name, &species, &breed, &age, &gender,
			&avatar, &description, &createdAt)
		if err != nil {
			log.Printf("❌ Failed to scan pet: %v", err)
			continue
		}

		pet := map[string]interface{}{
			"id":         id,
			"name":       name,
			"species":    species,
			"created_at": createdAt,
		}

		// Добавляем user_id только если он не NULL
		if petUserID.Valid {
			pet["user_id"] = petUserID.Int64
		} else {
			pet["user_id"] = nil
		}

		if breed.Valid {
			pet["breed"] = breed.String
		}
		if age.Valid {
			pet["age"] = age.Int64
		}
		if gender.Valid {
			pet["gender"] = gender.String
		}
		if avatar.Valid {
			pet["avatar"] = avatar.String
		}
		if description.Valid {
			pet["description"] = description.String
		}

		pets = append(pets, pet)
	}

	respondJSON(w, pets)
}
