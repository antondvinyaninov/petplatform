package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"
)

// LogUserActivity логирует действие пользователя (асинхронно)
func LogUserActivity(userID int, actionType, targetType string, targetID int, metadata map[string]interface{}, ipAddress, userAgent string) {
	// Запускаем асинхронно, чтобы не блокировать основной поток
	go func() {
		metadataJSON, _ := json.Marshal(metadata)

		query := `
			INSERT INTO user_activity_logs 
			(user_id, action_type, target_type, target_id, metadata, ip_address, user_agent)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`

		_, err := db.Exec(query, userID, actionType, targetType, targetID, metadataJSON, ipAddress, userAgent)
		if err != nil {
			log.Printf("❌ Failed to log user activity: %v", err)
		}
	}()
}

// GetUserActivityLogsHandler возвращает логи активности пользователей
func GetUserActivityLogsHandler(w http.ResponseWriter, r *http.Request) {
	// Параметры фильтрации
	userIDStr := r.URL.Query().Get("user_id")
	actionType := r.URL.Query().Get("action_type")
	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")
	limitStr := r.URL.Query().Get("limit")

	limit := 100
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 1000 {
				limit = 1000
			}
		}
	}

	// Строим запрос с фильтрами
	query := `
		SELECT 
			ual.id,
			ual.user_id,
			u.name || ' ' || COALESCE(u.last_name, '') as user_name,
			u.email as user_email,
			ual.action_type,
			ual.target_type,
			ual.target_id,
			ual.metadata,
			ual.ip_address,
			ual.user_agent,
			ual.created_at
		FROM user_activity_logs ual
		LEFT JOIN users u ON ual.user_id = u.id
		WHERE 1=1
	`

	args := []interface{}{}
	argIndex := 1

	if userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			query += " AND ual.user_id = $" + strconv.Itoa(argIndex)
			args = append(args, userID)
			argIndex++
		}
	}

	if actionType != "" {
		query += " AND ual.action_type = $" + strconv.Itoa(argIndex)
		args = append(args, actionType)
		argIndex++
	}

	if dateFrom != "" {
		query += " AND ual.created_at >= $" + strconv.Itoa(argIndex)
		args = append(args, dateFrom)
		argIndex++
	}

	if dateTo != "" {
		query += " AND ual.created_at <= $" + strconv.Itoa(argIndex)
		args = append(args, dateTo)
		argIndex++
	}

	query += " ORDER BY ual.created_at DESC LIMIT $" + strconv.Itoa(argIndex)
	args = append(args, limit)

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ Failed to get user activity logs: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	logs := []map[string]interface{}{}
	for rows.Next() {
		var id, targetID int
		var userID sql.NullInt64
		var userName, userEmail, actionType, targetType sql.NullString
		var metadata, ipAddress, userAgent sql.NullString
		var createdAt time.Time

		err := rows.Scan(&id, &userID, &userName, &userEmail, &actionType,
			&targetType, &targetID, &metadata, &ipAddress, &userAgent, &createdAt)
		if err != nil {
			log.Printf("❌ Failed to scan user activity log: %v", err)
			continue
		}

		logEntry := map[string]interface{}{
			"id":         id,
			"target_id":  targetID,
			"created_at": createdAt,
		}

		if userID.Valid {
			logEntry["user_id"] = userID.Int64
		} else {
			logEntry["user_id"] = nil
		}

		if userEmail.Valid {
			logEntry["user_email"] = userEmail.String
		} else {
			logEntry["user_email"] = nil
		}

		if userName.Valid {
			logEntry["user_name"] = userName.String
		} else {
			logEntry["user_name"] = nil
		}

		if actionType.Valid {
			logEntry["action_type"] = actionType.String
		} else {
			logEntry["action_type"] = nil
		}

		if targetType.Valid {
			logEntry["target_type"] = targetType.String
		} else {
			logEntry["target_type"] = nil
		}

		if metadata.Valid {
			logEntry["metadata"] = metadata.String
		} else {
			logEntry["metadata"] = nil
		}

		if ipAddress.Valid {
			logEntry["ip_address"] = ipAddress.String
		} else {
			logEntry["ip_address"] = nil
		}

		if userAgent.Valid {
			logEntry["user_agent"] = userAgent.String
		} else {
			logEntry["user_agent"] = nil
		}

		logs = append(logs, logEntry)
	}

	log.Printf("✅ Returning %d user activity logs", len(logs))
	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    logs,
	})
}

// GetUserActivityStatsHandler возвращает статистику активности пользователей
func GetUserActivityStatsHandler(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{}

	// Общее количество действий
	var totalActions int
	err := db.QueryRow("SELECT COUNT(*) FROM user_activity_logs").Scan(&totalActions)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get total actions: %v", err)
	}
	stats["total_actions"] = totalActions

	// Действия за последние 24 часа
	var actionsLast24h int
	err = db.QueryRow(`
		SELECT COUNT(*) 
		FROM user_activity_logs 
		WHERE created_at > NOW() - INTERVAL '24 hours'
	`).Scan(&actionsLast24h)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get actions last 24h: %v", err)
	}
	stats["actions_last_24h"] = actionsLast24h

	// Действия за последние 7 дней
	var actionsLast7days int
	err = db.QueryRow(`
		SELECT COUNT(*) 
		FROM user_activity_logs 
		WHERE created_at > NOW() - INTERVAL '7 days'
	`).Scan(&actionsLast7days)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get actions last 7 days: %v", err)
	}
	stats["actions_last_7days"] = actionsLast7days

	// Группировка по типу действия
	rows, err := db.Query(`
		SELECT action_type, COUNT(*) as count
		FROM user_activity_logs
		WHERE action_type IS NOT NULL
		GROUP BY action_type
		ORDER BY count DESC
		LIMIT 20
	`)
	if err != nil {
		log.Printf("❌ Failed to get actions by type: %v", err)
	} else {
		defer rows.Close()
		byActionType := []map[string]interface{}{}
		for rows.Next() {
			var actionType string
			var count int
			if err := rows.Scan(&actionType, &count); err != nil {
				log.Printf("❌ Failed to scan action type: %v", err)
				continue
			}
			byActionType = append(byActionType, map[string]interface{}{
				"action_type": actionType,
				"count":       count,
			})
		}
		stats["by_action_type"] = byActionType
	}

	// Топ активных пользователей
	rows, err = db.Query(`
		SELECT 
			ual.user_id,
			u.email as user_email,
			u.name as user_name,
			COUNT(*) as count
		FROM user_activity_logs ual
		LEFT JOIN users u ON ual.user_id = u.id
		WHERE ual.user_id IS NOT NULL
		GROUP BY ual.user_id, u.email, u.name
		ORDER BY count DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("❌ Failed to get most active users: %v", err)
	} else {
		defer rows.Close()
		mostActiveUsers := []map[string]interface{}{}
		for rows.Next() {
			var userID, count int
			var userEmail, userName sql.NullString
			if err := rows.Scan(&userID, &userEmail, &userName, &count); err != nil {
				log.Printf("❌ Failed to scan active user: %v", err)
				continue
			}
			user := map[string]interface{}{
				"user_id": userID,
				"count":   count,
			}
			if userEmail.Valid {
				user["user_email"] = userEmail.String
			}
			if userName.Valid {
				user["user_name"] = userName.String
			}
			mostActiveUsers = append(mostActiveUsers, user)
		}
		stats["most_active_users"] = mostActiveUsers
	}

	// Распределение по часам (последние 24 часа)
	rows, err = db.Query(`
		SELECT 
			EXTRACT(HOUR FROM created_at) as hour,
			COUNT(*) as count
		FROM user_activity_logs
		WHERE created_at > NOW() - INTERVAL '24 hours'
		GROUP BY hour
		ORDER BY hour
	`)
	if err != nil {
		log.Printf("❌ Failed to get hourly distribution: %v", err)
	} else {
		defer rows.Close()
		hourlyDistribution := []map[string]interface{}{}
		for rows.Next() {
			var hour, count int
			if err := rows.Scan(&hour, &count); err != nil {
				log.Printf("❌ Failed to scan hourly data: %v", err)
				continue
			}
			hourlyDistribution = append(hourlyDistribution, map[string]interface{}{
				"hour":  hour,
				"count": count,
			})
		}
		stats["hourly_distribution"] = hourlyDistribution
	}

	respondJSON(w, stats)
}

// GetUserActivityByUserIDHandler возвращает историю активности конкретного пользователя
func GetUserActivityByUserIDHandler(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.URL.Query().Get("id")
	if userIDStr == "" {
		respondError(w, "User ID is required", http.StatusBadRequest)
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		respondError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 1000 {
				limit = 1000
			}
		}
	}

	query := `
		SELECT 
			id,
			action_type,
			target_type,
			target_id,
			metadata,
			ip_address,
			user_agent,
			created_at
		FROM user_activity_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := db.Query(query, userID, limit)
	if err != nil {
		log.Printf("❌ Failed to get user activity: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	logs := []map[string]interface{}{}
	for rows.Next() {
		var id, targetID int
		var actionType, targetType sql.NullString
		var metadata, ipAddress, userAgent sql.NullString
		var createdAt time.Time

		err := rows.Scan(&id, &actionType, &targetType, &targetID,
			&metadata, &ipAddress, &userAgent, &createdAt)
		if err != nil {
			log.Printf("❌ Failed to scan user activity: %v", err)
			continue
		}

		logEntry := map[string]interface{}{
			"id":         id,
			"target_id":  targetID,
			"created_at": createdAt,
		}

		if actionType.Valid {
			logEntry["action_type"] = actionType.String
		}
		if targetType.Valid {
			logEntry["target_type"] = targetType.String
		}
		if metadata.Valid {
			logEntry["metadata"] = metadata.String
		}
		if ipAddress.Valid {
			logEntry["ip_address"] = ipAddress.String
		}
		if userAgent.Valid {
			logEntry["user_agent"] = userAgent.String
		}

		logs = append(logs, logEntry)
	}

	log.Printf("✅ Returning %d activity logs for user %d", len(logs), userID)
	respondJSON(w, logs)
}
