package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// VerifyUserHandler верифицирует пользователя (только для модераторов и суперадминов)
func VerifyUserHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		currentUserID := r.Context().Value("userID").(int)

		// Проверяем права (только moderator или superadmin)
		if !hasModeratorRights(db, currentUserID) {
			http.Error(w, "Access denied: insufficient permissions", http.StatusForbidden)
			return
		}

		var req struct {
			UserID int `json:"user_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.UserID == 0 {
			http.Error(w, "User ID is required", http.StatusBadRequest)
			return
		}

		// Проверяем, существует ли пользователь
		userExists, err := userExists(db, req.UserID)
		if err != nil || !userExists {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Проверяем, не верифицирован ли уже
		var alreadyVerified bool
		err = db.QueryRow(ConvertPlaceholders("SELECT verified FROM users WHERE id = ?"), req.UserID).Scan(&alreadyVerified)
		if err != nil {
			log.Printf("❌ Error checking verification status: %v", err)
			http.Error(w, "Failed to check verification status", http.StatusInternalServerError)
			return
		}

		if alreadyVerified {
			http.Error(w, "User is already verified", http.StatusConflict)
			return
		}

		// Верифицируем пользователя
		now := time.Now()
		_, err = db.Exec(ConvertPlaceholders(`
			UPDATE users 
			SET verified = TRUE, verified_at = ?, verified_by = ?
			WHERE id = ?
		`), now, currentUserID, req.UserID)

		if err != nil {
			log.Printf("❌ Error verifying user: %v", err)
			http.Error(w, "Failed to verify user", http.StatusInternalServerError)
			return
		}

		log.Printf("✅ User verified: user %d verified by moderator %d", req.UserID, currentUserID)

		// Получаем email администратора и имя пользователя для лога
		var adminEmail, userName string
		db.QueryRow(ConvertPlaceholders("SELECT email FROM users WHERE id = ?"), currentUserID).Scan(&adminEmail)
		db.QueryRow(ConvertPlaceholders("SELECT name FROM users WHERE id = ?"), req.UserID).Scan(&userName)

		// Создаём лог
		ipAddress := r.RemoteAddr
		userAgent := r.Header.Get("User-Agent")
		CreateAdminLog(
			currentUserID,
			adminEmail,
			"verify_user",
			"user",
			req.UserID,
			userName,
			"User verified",
			ipAddress,
			userAgent,
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "User verified successfully",
		})
	}
}

// UnverifyUserHandler снимает верификацию с пользователя
func UnverifyUserHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		currentUserID := r.Context().Value("userID").(int)

		// Проверяем права (только moderator или superadmin)
		if !hasModeratorRights(db, currentUserID) {
			http.Error(w, "Access denied: insufficient permissions", http.StatusForbidden)
			return
		}

		var req struct {
			UserID int `json:"user_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.UserID == 0 {
			http.Error(w, "User ID is required", http.StatusBadRequest)
			return
		}

		// Снимаем верификацию
		_, err := db.Exec(ConvertPlaceholders(`
			UPDATE users 
			SET verified = FALSE, verified_at = NULL, verified_by = NULL
			WHERE id = ?
		`), req.UserID)

		if err != nil {
			log.Printf("❌ Error unverifying user: %v", err)
			http.Error(w, "Failed to unverify user", http.StatusInternalServerError)
			return
		}

		log.Printf("✅ User unverified: user %d unverified by moderator %d", req.UserID, currentUserID)

		// Получаем email администратора и имя пользователя для лога
		var adminEmail, userName string
		db.QueryRow(ConvertPlaceholders("SELECT email FROM users WHERE id = ?"), currentUserID).Scan(&adminEmail)
		db.QueryRow(ConvertPlaceholders("SELECT name FROM users WHERE id = ?"), req.UserID).Scan(&userName)

		// Создаём лог
		ipAddress := r.RemoteAddr
		userAgent := r.Header.Get("User-Agent")
		CreateAdminLog(
			currentUserID,
			adminEmail,
			"unverify_user",
			"user",
			req.UserID,
			userName,
			"User unverified",
			ipAddress,
			userAgent,
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "User unverified successfully",
		})
	}
}

// GetVerifiedUsersHandler возвращает список верифицированных пользователей
func GetVerifiedUsersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем параметры фильтрации
		verifiedOnly := r.URL.Query().Get("verified") == "true"

		query := `
			SELECT 
				id, email, name, last_name, avatar, cover_photo, bio, 
				location, phone, created_at, verified, verified_at
			FROM users
		`

		if verifiedOnly {
			query += " WHERE verified = TRUE"
		}

		query += " ORDER BY created_at DESC"

		rows, err := db.Query(query)
		if err != nil {
			log.Printf("❌ Error fetching users: %v", err)
			http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var users []map[string]interface{}
		for rows.Next() {
			var user struct {
				ID         int
				Email      string
				Name       string
				LastName   sql.NullString
				Avatar     sql.NullString
				CoverPhoto sql.NullString
				Bio        sql.NullString
				Location   sql.NullString
				Phone      sql.NullString
				CreatedAt  string
				Verified   bool
				VerifiedAt sql.NullString
			}

			err := rows.Scan(
				&user.ID, &user.Email, &user.Name, &user.LastName,
				&user.Avatar, &user.CoverPhoto, &user.Bio,
				&user.Location, &user.Phone, &user.CreatedAt,
				&user.Verified, &user.VerifiedAt,
			)

			if err != nil {
				log.Printf("❌ Error scanning user: %v", err)
				continue
			}

			userMap := map[string]interface{}{
				"id":          user.ID,
				"email":       user.Email,
				"name":        user.Name,
				"last_name":   user.LastName.String,
				"avatar":      user.Avatar.String,
				"cover_photo": user.CoverPhoto.String,
				"bio":         user.Bio.String,
				"location":    user.Location.String,
				"phone":       user.Phone.String,
				"created_at":  user.CreatedAt,
				"verified":    user.Verified,
			}

			if user.VerifiedAt.Valid {
				userMap["verified_at"] = user.VerifiedAt.String
			}

			users = append(users, userMap)
		}

		if users == nil {
			users = []map[string]interface{}{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

// GetUserVerificationStatusHandler возвращает статус верификации пользователя
func GetUserVerificationStatusHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем user_id из URL
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) < 5 {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}
		userID, err := strconv.Atoi(pathParts[4])
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		var verified bool
		var verifiedAt sql.NullString
		var verifiedBy sql.NullInt64

		err = db.QueryRow(ConvertPlaceholders(`
			SELECT verified, verified_at, verified_by
			FROM users
			WHERE id = ?
		`), userID).Scan(&verified, &verifiedAt, &verifiedBy)

		if err != nil {
			if err == sql.ErrNoRows {
				http.Error(w, "User not found", http.StatusNotFound)
				return
			}
			log.Printf("❌ Error fetching verification status: %v", err)
			http.Error(w, "Failed to fetch verification status", http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"verified": verified,
		}

		if verifiedAt.Valid {
			response["verified_at"] = verifiedAt.String
		}

		if verifiedBy.Valid {
			response["verified_by"] = verifiedBy.Int64
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// Вспомогательные функции

func hasModeratorRights(db *sql.DB, userID int) bool {
	// Проверяем, есть ли у пользователя роль moderator или superadmin
	var count int
	err := db.QueryRow(ConvertPlaceholders(`
		SELECT COUNT(*) FROM user_roles 
		WHERE user_id = ? 
		AND (role = 'moderator' OR role = 'superadmin')
		AND is_active = 1
		AND (expires_at IS NULL OR expires_at > ?)
	`), userID, time.Now()).Scan(&count)

	return err == nil && count > 0
}
