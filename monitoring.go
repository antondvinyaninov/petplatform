package main

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"
)

// GetErrorLogsHandler возвращает последние ошибки из error_logs
func GetErrorLogsHandler(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 500 {
				limit = 500
			}
		}
	}

	query := `
		SELECT 
			id, 
			service, 
			endpoint, 
			method, 
			error_message, 
			user_id, 
			ip_address, 
			user_agent, 
			created_at
		FROM error_logs
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := db.Query(query, limit)
	if err != nil {
		log.Printf("❌ Failed to get error logs: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"error":   "Database error",
		})
		return
	}
	defer rows.Close()

	errors := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var service, endpoint, method, errorMessage string
		var userID sql.NullInt64
		var ipAddress, userAgent sql.NullString
		var createdAt time.Time

		err := rows.Scan(&id, &service, &endpoint, &method, &errorMessage,
			&userID, &ipAddress, &userAgent, &createdAt)
		if err != nil {
			log.Printf("❌ Failed to scan error log: %v", err)
			continue
		}

		errorLog := map[string]interface{}{
			"id":            id,
			"service":       service,
			"endpoint":      endpoint,
			"method":        method,
			"error_message": errorMessage,
			"created_at":    createdAt,
		}

		if userID.Valid {
			errorLog["user_id"] = userID.Int64
		} else {
			errorLog["user_id"] = nil
		}

		if ipAddress.Valid {
			errorLog["ip_address"] = ipAddress.String
		} else {
			errorLog["ip_address"] = nil
		}

		if userAgent.Valid {
			errorLog["user_agent"] = userAgent.String
		} else {
			errorLog["user_agent"] = nil
		}

		errors = append(errors, errorLog)
	}

	log.Printf("✅ Returning %d error logs", len(errors))
	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    errors,
	})
}

// GetMetricsHandler возвращает системные метрики
func GetMetricsHandler(w http.ResponseWriter, r *http.Request) {
	metrics := map[string]interface{}{
		"total_requests":       0,
		"total_errors":         0,
		"error_rate":           0,
		"avg_response_time_ms": 0,
	}

	// Активные пользователи (последние 15 минут)
	var activeUsers int
	err := db.QueryRow(`
		SELECT COUNT(DISTINCT user_id) 
		FROM user_activity 
		WHERE last_seen > NOW() - INTERVAL '15 minutes'
	`).Scan(&activeUsers)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get active users: %v", err)
		activeUsers = 0
	}
	metrics["active_users"] = activeUsers

	// Размер базы данных
	var dbSizeMB float64
	err = db.QueryRow(`
		SELECT pg_database_size(current_database()) / 1024.0 / 1024.0
	`).Scan(&dbSizeMB)
	if err != nil {
		log.Printf("❌ Failed to get database size: %v", err)
		dbSizeMB = 0
	}
	metrics["database_size_mb"] = dbSizeMB

	// Ошибки за последний час
	var lastHourErrors int
	err = db.QueryRow(`
		SELECT COUNT(*) 
		FROM error_logs 
		WHERE created_at > NOW() - INTERVAL '1 hour'
	`).Scan(&lastHourErrors)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get last hour errors: %v", err)
		lastHourErrors = 0
	}
	metrics["last_hour_errors"] = lastHourErrors

	// Ошибки за последние 24 часа
	var last24HourErrors int
	err = db.QueryRow(`
		SELECT COUNT(*) 
		FROM error_logs 
		WHERE created_at > NOW() - INTERVAL '24 hours'
	`).Scan(&last24HourErrors)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get last 24 hour errors: %v", err)
		last24HourErrors = 0
	}
	metrics["last_24hour_errors"] = last24HourErrors

	// Общее количество ошибок
	var totalErrors int
	err = db.QueryRow("SELECT COUNT(*) FROM error_logs").Scan(&totalErrors)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get total errors: %v", err)
	} else {
		metrics["total_errors"] = totalErrors
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    metrics,
	})
}

// GetErrorStatsHandler возвращает статистику ошибок по сервисам
func GetErrorStatsHandler(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT service, COUNT(*) as count
		FROM error_logs
		WHERE created_at > NOW() - INTERVAL '24 hours'
		GROUP BY service
		ORDER BY count DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ Failed to get error stats: %v", err)
		respondJSON(w, map[string]interface{}{
			"success": false,
			"error":   "Database error",
		})
		return
	}
	defer rows.Close()

	stats := map[string]int{}
	for rows.Next() {
		var service string
		var count int

		err := rows.Scan(&service, &count)
		if err != nil {
			log.Printf("❌ Failed to scan error stat: %v", err)
			continue
		}

		stats[service] = count
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    stats,
	})
}
