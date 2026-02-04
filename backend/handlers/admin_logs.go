package handlers

import (
	"backend/models"
	"backend/db"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// AdminLogsHandler обрабатывает запросы к логам администраторов
func AdminLogsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Параметры фильтрации
	actionType := r.URL.Query().Get("action_type")
	targetType := r.URL.Query().Get("target_type")
	limitStr := r.URL.Query().Get("limit")

	limit := 100 // По умолчанию
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	// Строим запрос
	query := `
		SELECT id, admin_id, admin_email, action_type, target_type, target_id, 
		       target_name, details, ip_address, created_at
		FROM admin_logs
		WHERE 1=1
	`
	args := []interface{}{}

	if actionType != "" {
		query += " AND action_type = ?"
		args = append(args, actionType)
	}

	if targetType != "" {
		query += " AND target_type = ?"
		args = append(args, targetType)
	}

	query += " ORDER BY created_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	logs := []models.AdminLogResponse{}
	for rows.Next() {
		var log models.AdminLog
		if err := rows.Scan(
			&log.ID,
			&log.AdminID,
			&log.AdminEmail,
			&log.ActionType,
			&log.TargetType,
			&log.TargetID,
			&log.TargetName,
			&log.Details,
			&log.IPAddress,
			&log.CreatedAt,
		); err != nil {
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}

		logs = append(logs, models.AdminLogResponse{
			ID:         log.ID,
			AdminID:    log.AdminID,
			AdminEmail: log.AdminEmail,
			ActionType: log.ActionType,
			TargetType: log.TargetType,
			TargetID:   log.TargetID,
			TargetName: log.TargetName,
			Details:    log.Details,
			IPAddress:  log.IPAddress,
			CreatedAt:  log.CreatedAt.Format(time.RFC3339),
		})
	}

	sendSuccess(w, logs)
}

// CreateAdminLog создаёт запись в логе
func CreateAdminLog(adminID int, adminEmail, actionType, targetType string, targetID int, targetName, details, ipAddress, userAgent string) error {
	_, err := db.DB.Exec(ConvertPlaceholders(`
		INSERT INTO admin_logs (admin_id, admin_email, action_type, target_type, target_id, target_name, details, ip_address, user_agent)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`), adminID, adminEmail, actionType, targetType, targetID, targetName, details, ipAddress, userAgent)

	return err
}

// GetAdminLogStats возвращает статистику по логам
func GetAdminLogStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := make(map[string]interface{})

	// Общее количество логов
	var totalLogs int
	db.DB.QueryRow("SELECT COUNT(*) FROM admin_logs").Scan(&totalLogs)
	stats["total_logs"] = totalLogs

	// Логи за последние 24 часа
	var logsLast24h int
	db.DB.QueryRow("SELECT COUNT(*) FROM admin_logs WHERE created_at >= NOW() - INTERVAL '1 day'").Scan(&logsLast24h)
	stats["logs_last_24h"] = logsLast24h

	// Количество по типам действий
	actionStats := make(map[string]int)
	rows, err := db.DB.Query("SELECT action_type, COUNT(*) as count FROM admin_logs GROUP BY action_type")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var actionType string
			var count int
			if err := rows.Scan(&actionType, &count); err == nil {
				actionStats[actionType] = count
			}
		}
	}
	stats["by_action"] = actionStats

	// Топ администраторов по активности
	type AdminActivity struct {
		AdminEmail string `json:"admin_email"`
		Count      int    `json:"count"`
	}
	topAdmins := []AdminActivity{}
	rows2, err := db.DB.Query(`
		SELECT admin_email, COUNT(*) as count 
		FROM admin_logs 
		GROUP BY admin_email 
		ORDER BY count DESC 
		LIMIT 5
	`)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var activity AdminActivity
			if err := rows2.Scan(&activity.AdminEmail, &activity.Count); err == nil {
				topAdmins = append(topAdmins, activity)
			}
		}
	}
	stats["top_admins"] = topAdmins

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    stats,
	})
}
