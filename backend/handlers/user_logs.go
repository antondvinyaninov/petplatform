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

// UserLog представляет лог действия пользователя
type UserLog struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	ActionType    string    `json:"action_type"`
	ActionDetails string    `json:"action_details"`
	IPAddress     string    `json:"ip_address"`
	UserAgent     string    `json:"user_agent"`
	CreatedAt     time.Time `json:"created_at"`
}

// CreateUserLog создаёт запись в логе пользователя
func CreateUserLog(db *sql.DB, userID int, actionType, actionDetails, ipAddress, userAgent string) error {
	_, err := db.Exec(ConvertPlaceholders(`
		INSERT INTO user_logs (user_id, action_type, action_details, ip_address, user_agent)
		VALUES (?, ?, ?, ?, ?)
	`), userID, actionType, actionDetails, ipAddress, userAgent)

	return err
}

// GetUserLogsHandler возвращает логи действий пользователя
func GetUserLogsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем user_id из URL: /api/users/logs/{id}
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

		// Параметры пагинации
		limitStr := r.URL.Query().Get("limit")
		limit := 100 // По умолчанию
		if limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
				limit = l
			}
		}

		// Получаем логи
		query := `
			SELECT id, user_id, action_type, action_details, ip_address, user_agent, created_at
			FROM user_logs
			WHERE user_id = ?
			ORDER BY created_at DESC
			LIMIT ?
		`

		rows, err := db.Query(query, userID, limit)
		if err != nil {
			log.Printf("❌ Error fetching user logs: %v", err)
			http.Error(w, "Failed to fetch logs", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		logs := []UserLog{}
		for rows.Next() {
			var userLog UserLog
			if err := rows.Scan(
				&userLog.ID,
				&userLog.UserID,
				&userLog.ActionType,
				&userLog.ActionDetails,
				&userLog.IPAddress,
				&userLog.UserAgent,
				&userLog.CreatedAt,
			); err != nil {
				log.Printf("❌ Error scanning log: %v", err)
				continue
			}
			logs = append(logs, userLog)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    logs,
		})
	}
}

// GetUserStorageStatsHandler возвращает статистику использования хранилища пользователем
func GetUserStorageStatsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем user_id из URL: /api/users/storage/{id}
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

		stats := make(map[string]interface{})

		// Количество постов
		var postsCount int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM posts WHERE user_id = ?"), userID).Scan(&postsCount)
		stats["posts_count"] = postsCount

		// Количество комментариев
		var commentsCount int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM comments WHERE user_id = ?"), userID).Scan(&commentsCount)
		stats["comments_count"] = commentsCount

		// Количество медиа файлов и их размер
		var mediaCount int
		var mediaSize int64
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*), COALESCE(SUM(file_size), 0) FROM user_media WHERE user_id = ?"), userID).Scan(&mediaCount, &mediaSize)
		stats["media_count"] = mediaCount
		stats["media_size_bytes"] = mediaSize
		stats["media_size_mb"] = float64(mediaSize) / 1024 / 1024

		// Количество питомцев
		var petsCount int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM pets WHERE user_id = ?"), userID).Scan(&petsCount)
		stats["pets_count"] = petsCount

		// Количество друзей
		var friendsCount int
		db.QueryRow(ConvertPlaceholders(`
			SELECT COUNT(*) FROM friendships 
			WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
		`), userID, userID).Scan(&friendsCount)
		stats["friends_count"] = friendsCount

		// Количество организаций
		var orgsCount int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM organization_members WHERE user_id = ?"), userID).Scan(&orgsCount)
		stats["organizations_count"] = orgsCount

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    stats,
		})
	}
}
