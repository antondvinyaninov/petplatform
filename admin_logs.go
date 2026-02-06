package main

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"
)

// GetAdminLogsHandler возвращает список логов администраторов
func GetAdminLogsHandler(w http.ResponseWriter, r *http.Request) {
	// Получаем параметр limit из query
	limitStr := r.URL.Query().Get("limit")
	limit := 100 // По умолчанию
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 1000 {
				limit = 1000 // Максимум 1000
			}
		}
	}

	query := `
		SELECT 
			al.id,
			al.admin_id,
			a.email as admin_email,
			al.action_type,
			al.target_type,
			al.target_id,
			al.target_name,
			al.details,
			al.ip_address,
			al.created_at
		FROM admin_logs al
		LEFT JOIN users a ON al.admin_id = a.id
		ORDER BY al.created_at DESC
		LIMIT $1
	`

	rows, err := db.Query(query, limit)
	if err != nil {
		log.Printf("❌ Failed to get admin logs: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	logs := []map[string]interface{}{}
	for rows.Next() {
		var id, adminID, targetID int
		var adminEmail, actionType, targetType sql.NullString
		var targetName, details, ipAddress sql.NullString
		var createdAt time.Time

		err := rows.Scan(&id, &adminID, &adminEmail, &actionType, &targetType,
			&targetID, &targetName, &details, &ipAddress, &createdAt)
		if err != nil {
			log.Printf("❌ Failed to scan admin log: %v", err)
			continue
		}

		logEntry := map[string]interface{}{
			"id":         id,
			"admin_id":   adminID,
			"target_id":  targetID,
			"created_at": createdAt,
		}

		if adminEmail.Valid {
			logEntry["admin_email"] = adminEmail.String
		} else {
			logEntry["admin_email"] = nil
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

		if targetName.Valid {
			logEntry["target_name"] = targetName.String
		} else {
			logEntry["target_name"] = nil
		}

		if details.Valid {
			logEntry["details"] = details.String
		} else {
			logEntry["details"] = nil
		}

		if ipAddress.Valid {
			logEntry["ip_address"] = ipAddress.String
		} else {
			logEntry["ip_address"] = nil
		}

		logs = append(logs, logEntry)
	}

	log.Printf("✅ Returning %d admin logs", len(logs))
	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    logs,
	})
}

// GetAdminLogsStatsHandler возвращает статистику логов администраторов
func GetAdminLogsStatsHandler(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{}

	// Общее количество логов
	var totalLogs int
	err := db.QueryRow("SELECT COUNT(*) FROM admin_logs").Scan(&totalLogs)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get total logs: %v", err)
	}
	stats["total_logs"] = totalLogs

	// Логи за последние 24 часа
	var logsLast24h int
	err = db.QueryRow(`
		SELECT COUNT(*) 
		FROM admin_logs 
		WHERE created_at > NOW() - INTERVAL '24 hours'
	`).Scan(&logsLast24h)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get logs last 24h: %v", err)
	}
	stats["logs_last_24h"] = logsLast24h

	// Логи за последние 7 дней
	var logsLast7days int
	err = db.QueryRow(`
		SELECT COUNT(*) 
		FROM admin_logs 
		WHERE created_at > NOW() - INTERVAL '7 days'
	`).Scan(&logsLast7days)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("❌ Failed to get logs last 7 days: %v", err)
	}
	stats["logs_last_7days"] = logsLast7days

	// Группировка по типу действия
	rows, err := db.Query(`
		SELECT action_type, COUNT(*) as count
		FROM admin_logs
		WHERE action_type IS NOT NULL
		GROUP BY action_type
		ORDER BY count DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("❌ Failed to get logs by action type: %v", err)
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

	// Топ админов по активности
	rows, err = db.Query(`
		SELECT 
			al.admin_id,
			u.email as admin_email,
			COUNT(*) as count
		FROM admin_logs al
		LEFT JOIN users u ON al.admin_id = u.id
		GROUP BY al.admin_id, u.email
		ORDER BY count DESC
		LIMIT 10
	`)
	if err != nil {
		log.Printf("❌ Failed to get top admins: %v", err)
	} else {
		defer rows.Close()
		topAdmins := []map[string]interface{}{}
		for rows.Next() {
			var adminID, count int
			var adminEmail sql.NullString
			if err := rows.Scan(&adminID, &adminEmail, &count); err != nil {
				log.Printf("❌ Failed to scan top admin: %v", err)
				continue
			}
			admin := map[string]interface{}{
				"admin_id": adminID,
				"count":    count,
			}
			if adminEmail.Valid {
				admin["admin_email"] = adminEmail.String
			} else {
				admin["admin_email"] = nil
			}
			topAdmins = append(topAdmins, admin)
		}
		stats["top_admins"] = topAdmins
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"data":    stats,
	})
}
