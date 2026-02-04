package handlers

import (
	"backend/models"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// ConvertPlaceholders converts ? to $1, $2, $3 for PostgreSQL in production
func ConvertPlaceholders(query string) string {
	if os.Getenv("ENVIRONMENT") == "production" {
		result := ""
		paramNum := 1
		for _, char := range query {
			if char == '?' {
				result += fmt.Sprintf("$%d", paramNum)
				paramNum++
			} else {
				result += string(char)
			}
		}
		return result
	}
	return query
}

// sendErrorResponse отправляет JSON ответ с ошибкой
func sendErrorResponse(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(models.Response{
		Success: false,
		Error:   message,
	})
}

// sendSuccessResponse отправляет JSON ответ с данными
func sendSuccessResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.Response{
		Success: true,
		Data:    data,
	})
}

// parseTime парсит строку времени в *time.Time
func parseTime(timeStr string) *time.Time {
	if timeStr == "" {
		return nil
	}

	// Пробуем разные форматы
	formats := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05.000Z",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			return &t
		}
	}

	return nil
}
