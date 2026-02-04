package logger

import (
	"backend/db"
	"fmt"
	"log"
	"time"
)

// LogLevel - уровень логирования
type LogLevel string

const (
	LevelInfo    LogLevel = "info"
	LevelWarning LogLevel = "warning"
	LevelError   LogLevel = "error"
	LevelDebug   LogLevel = "debug"
)

// LogCategory - категория лога
type LogCategory string

const (
	CategoryAuth     LogCategory = "auth"
	CategoryUser     LogCategory = "user"
	CategoryPost     LogCategory = "post"
	CategoryPet      LogCategory = "pet"
	CategoryProfile  LogCategory = "profile"
	CategoryAdmin    LogCategory = "admin"
	CategorySystem   LogCategory = "system"
	CategorySecurity LogCategory = "security"
)

// LogEntry - структура записи лога
type LogEntry struct {
	Level      LogLevel
	Category   LogCategory
	Action     string
	UserID     *int
	TargetType string
	TargetID   *int
	Message    string
	Details    string
	IPAddress  string
	UserAgent  string
}

// Log - записывает лог в базу данных
func Log(entry LogEntry) error {
	query := `
		INSERT INTO system_logs (level, category, action, user_id, target_type, target_id, message, details, ip_address, user_agent, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := db.DB.Exec(
		query,
		entry.Level,
		entry.Category,
		entry.Action,
		entry.UserID,
		entry.TargetType,
		entry.TargetID,
		entry.Message,
		entry.Details,
		entry.IPAddress,
		entry.UserAgent,
		time.Now(),
	)

	if err != nil {
		log.Printf("Failed to write log: %v", err)
		return err
	}

	return nil
}

// Info - логирует информационное сообщение
func Info(category LogCategory, action, message string) {
	Log(LogEntry{
		Level:    LevelInfo,
		Category: category,
		Action:   action,
		Message:  message,
	})
}

// Warning - логирует предупреждение
func Warning(category LogCategory, action, message string) {
	Log(LogEntry{
		Level:    LevelWarning,
		Category: category,
		Action:   action,
		Message:  message,
	})
}

// Error - логирует ошибку
func Error(category LogCategory, action, message string, details string) {
	Log(LogEntry{
		Level:    LevelError,
		Category: category,
		Action:   action,
		Message:  message,
		Details:  details,
	})
}

// UserAction - логирует действие пользователя
func UserAction(userID int, category LogCategory, action, message string) {
	Log(LogEntry{
		Level:    LevelInfo,
		Category: category,
		Action:   action,
		UserID:   &userID,
		Message:  message,
	})
}

// SecurityEvent - логирует событие безопасности
func SecurityEvent(action, message, ipAddress string, userID *int) {
	Log(LogEntry{
		Level:     LevelWarning,
		Category:  CategorySecurity,
		Action:    action,
		UserID:    userID,
		Message:   message,
		IPAddress: ipAddress,
	})
}

// GetLogs - получает логи из базы данных
func GetLogs(limit int, level string, category string) ([]map[string]interface{}, error) {
	query := `
		SELECT l.id, l.level, l.category, l.action, l.user_id, l.target_type, l.target_id, 
		       l.message, l.details, l.ip_address, l.user_agent, l.created_at, u.name as user_name
		FROM system_logs l
		LEFT JOIN users u ON l.user_id = u.id
		WHERE 1=1
	`

	args := []interface{}{}

	if level != "" {
		query += " AND l.level = ?"
		args = append(args, level)
	}

	if category != "" {
		query += " AND l.category = ?"
		args = append(args, category)
	}

	query += " ORDER BY l.created_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var id int
		var level, category, action, message, details, ipAddress, userAgent, createdAt string
		var userID, targetID *int
		var targetType, userName *string

		err := rows.Scan(
			&id, &level, &category, &action, &userID, &targetType, &targetID,
			&message, &details, &ipAddress, &userAgent, &createdAt, &userName,
		)
		if err != nil {
			continue
		}

		log := map[string]interface{}{
			"id":         id,
			"level":      level,
			"category":   category,
			"action":     action,
			"message":    message,
			"details":    details,
			"ip_address": ipAddress,
			"user_agent": userAgent,
			"created_at": createdAt,
		}

		if userID != nil {
			log["user_id"] = *userID
		}
		if userName != nil {
			log["user_name"] = *userName
		}
		if targetType != nil {
			log["target_type"] = *targetType
		}
		if targetID != nil {
			log["target_id"] = *targetID
		}

		logs = append(logs, log)
	}

	if logs == nil {
		logs = []map[string]interface{}{}
	}

	return logs, nil
}

// LogWithIP - логирует с IP адресом
func LogWithIP(entry LogEntry, ipAddress string) error {
	entry.IPAddress = ipAddress
	return Log(entry)
}

// FormatLogMessage - форматирует сообщение лога
func FormatLogMessage(format string, args ...interface{}) string {
	return fmt.Sprintf(format, args...)
}
