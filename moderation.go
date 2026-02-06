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

// GetReportsHandler возвращает список жалоб с фильтром по статусу
func GetReportsHandler(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	// Базовый запрос
	query := `
		SELECT 
			r.id,
			r.reporter_id,
			r.target_type,
			r.target_id,
			r.reason,
			r.description,
			r.status,
			r.moderator_id,
			r.moderator_action,
			r.moderator_comment,
			r.reviewed_at,
			r.created_at,
			reporter.name as reporter_name,
			reporter.email as reporter_email,
			moderator.name as moderator_name
		FROM reports r
		LEFT JOIN users reporter ON r.reporter_id = reporter.id
		LEFT JOIN users moderator ON r.moderator_id = moderator.id
	`

	// Добавляем фильтр по статусу если указан
	args := []interface{}{}
	if status != "" {
		query += " WHERE r.status = $1"
		args = append(args, status)
	}

	query += " ORDER BY r.created_at DESC LIMIT 100"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ Failed to get reports: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	reports := []map[string]interface{}{}
	for rows.Next() {
		var id, reporterID, targetID int
		var targetType, reason, status string
		var description, moderatorAction, moderatorComment sql.NullString
		var moderatorID sql.NullInt64
		var reviewedAt sql.NullTime
		var createdAt time.Time
		var reporterName, reporterEmail, moderatorName sql.NullString

		err := rows.Scan(&id, &reporterID, &targetType, &targetID, &reason,
			&description, &status, &moderatorID, &moderatorAction, &moderatorComment,
			&reviewedAt, &createdAt, &reporterName, &reporterEmail, &moderatorName)
		if err != nil {
			log.Printf("❌ Failed to scan report: %v", err)
			continue
		}

		report := map[string]interface{}{
			"id":          id,
			"reporter_id": reporterID,
			"target_type": targetType,
			"target_id":   targetID,
			"reason":      reason,
			"status":      status,
			"created_at":  createdAt,
		}

		// Nullable поля
		if description.Valid {
			report["description"] = description.String
		} else {
			report["description"] = nil
		}

		if moderatorID.Valid {
			report["moderator_id"] = moderatorID.Int64
		} else {
			report["moderator_id"] = nil
		}

		if moderatorAction.Valid {
			report["moderator_action"] = moderatorAction.String
		} else {
			report["moderator_action"] = nil
		}

		if moderatorComment.Valid {
			report["moderator_comment"] = moderatorComment.String
		} else {
			report["moderator_comment"] = nil
		}

		if reviewedAt.Valid {
			report["reviewed_at"] = reviewedAt.Time
		} else {
			report["reviewed_at"] = nil
		}

		if reporterName.Valid {
			report["reporter_name"] = reporterName.String
		} else {
			report["reporter_name"] = nil
		}

		if reporterEmail.Valid {
			report["reporter_email"] = reporterEmail.String
		} else {
			report["reporter_email"] = nil
		}

		if moderatorName.Valid {
			report["moderator_name"] = moderatorName.String
		} else {
			report["moderator_name"] = nil
		}

		reports = append(reports, report)
	}

	log.Printf("✅ Returning %d reports (status: %s)", len(reports), status)
	respondJSON(w, reports)
}

// ReviewReportHandler рассматривает жалобу
func ReviewReportHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reportID, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondError(w, "Invalid report ID", http.StatusBadRequest)
		return
	}

	// Получаем модератора из контекста
	contextUser := r.Context().Value("user").(*User)
	moderatorID := contextUser.ID

	var req struct {
		Action  string `json:"action"`
		Comment string `json:"comment"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Обновляем жалобу
	query := `
		UPDATE reports 
		SET status = 'resolved',
		    moderator_id = $1,
		    moderator_action = $2,
		    moderator_comment = $3,
		    reviewed_at = NOW()
		WHERE id = $4
	`

	result, err := db.Exec(query, moderatorID, req.Action, req.Comment, reportID)
	if err != nil {
		log.Printf("❌ Failed to review report: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		respondError(w, "Report not found", http.StatusNotFound)
		return
	}

	log.Printf("✅ Report %d reviewed by moderator %d (action: %s)", reportID, moderatorID, req.Action)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Report reviewed successfully",
	})
}

// GetModerationStatsHandler возвращает статистику модерации
func GetModerationStatsHandler(w http.ResponseWriter, r *http.Request) {
	stats := map[string]interface{}{}

	// Общее количество жалоб
	var totalReports int
	err := db.QueryRow("SELECT COUNT(*) FROM reports").Scan(&totalReports)
	if err != nil {
		log.Printf("❌ Failed to get total reports: %v", err)
	}
	stats["total_reports"] = totalReports

	// Ожидающие рассмотрения
	var pendingReports int
	err = db.QueryRow("SELECT COUNT(*) FROM reports WHERE status = 'pending'").Scan(&pendingReports)
	if err != nil {
		log.Printf("❌ Failed to get pending reports: %v", err)
	}
	stats["pending_reports"] = pendingReports

	// Рассмотренные
	var resolvedReports int
	err = db.QueryRow("SELECT COUNT(*) FROM reports WHERE status = 'resolved'").Scan(&resolvedReports)
	if err != nil {
		log.Printf("❌ Failed to get resolved reports: %v", err)
	}
	stats["resolved_reports"] = resolvedReports

	// Группировка по типу (reason)
	rows, err := db.Query(`
		SELECT reason, COUNT(*) as count
		FROM reports
		GROUP BY reason
		ORDER BY count DESC
	`)
	if err != nil {
		log.Printf("❌ Failed to get reports by type: %v", err)
	} else {
		defer rows.Close()
		byType := []map[string]interface{}{}
		for rows.Next() {
			var reason string
			var count int
			if err := rows.Scan(&reason, &count); err != nil {
				log.Printf("❌ Failed to scan report type: %v", err)
				continue
			}
			byType = append(byType, map[string]interface{}{
				"reason": reason,
				"count":  count,
			})
		}
		stats["by_type"] = byType
	}

	respondJSON(w, stats)
}
