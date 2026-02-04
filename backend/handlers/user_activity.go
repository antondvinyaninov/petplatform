package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// UpdateUserActivity обновляет активность пользователя (вспомогательная функция)
func UpdateUserActivity(db *sql.DB, userID int, ipAddress, userAgent string) error {
	_, err := db.Exec(ConvertPlaceholders(`
		INSERT INTO user_activity (user_id, last_seen, ip_address, user_agent)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			last_seen = excluded.last_seen,
			ip_address = excluded.ip_address,
			user_agent = excluded.user_agent
	`), userID, time.Now(), ipAddress, userAgent)

	return err
}

// UpdateUserActivityHandler обновляет время последней активности пользователя
func UpdateUserActivityHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(int)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ipAddress := r.RemoteAddr
		userAgent := r.Header.Get("User-Agent")

		if err := UpdateUserActivity(db, userID, ipAddress, userAgent); err != nil {
			log.Printf("❌ Error updating user activity: %v", err)
			http.Error(w, "Failed to update activity", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
		})
	}
}

// GetOnlineUsersCountHandler возвращает количество пользователей онлайн
func GetOnlineUsersCountHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Пользователь считается онлайн, если был активен в последние 5 минут
		fiveMinutesAgo := time.Now().Add(-5 * time.Minute)

		var onlineCount int
		err := db.QueryRow(ConvertPlaceholders(`
			SELECT COUNT(DISTINCT user_id) 
			FROM user_activity 
			WHERE last_seen >= ?
		`), fiveMinutesAgo).Scan(&onlineCount)

		if err != nil {
			log.Printf("❌ Error getting online users count: %v", err)
			http.Error(w, "Failed to get online users", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"online_count": onlineCount,
			},
		})
	}
}

// GetUserActivityStatsHandler возвращает детальную статистику активности
func GetUserActivityStatsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := make(map[string]interface{})

		// Онлайн сейчас (последние 5 минут)
		fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
		var onlineNow int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM user_activity WHERE last_seen >= ?"), fiveMinutesAgo).Scan(&onlineNow)
		stats["online_now"] = onlineNow

		// Активны за последний час
		oneHourAgo := time.Now().Add(-1 * time.Hour)
		var activeLastHour int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM user_activity WHERE last_seen >= ?"), oneHourAgo).Scan(&activeLastHour)
		stats["active_last_hour"] = activeLastHour

		// Активны за последние 24 часа
		oneDayAgo := time.Now().Add(-24 * time.Hour)
		var activeLast24h int
		db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM user_activity WHERE last_seen >= ?"), oneDayAgo).Scan(&activeLast24h)
		stats["active_last_24h"] = activeLast24h

		// Всего пользователей
		var totalUsers int
		db.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)
		stats["total_users"] = totalUsers

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    stats,
		})
	}
}
