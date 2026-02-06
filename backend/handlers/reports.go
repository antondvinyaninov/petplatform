package handlers

import (
	"backend/db"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type CreateReportRequest struct {
	TargetType  string `json:"target_type"` // post, comment, user, organization, pet
	TargetID    int    `json:"target_id"`
	Reason      string `json:"reason"` // spam, harassment, violence, etc.
	Description string `json:"description"`
}

// CreateReportHandler - создать жалобу
func CreateReportHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Логируем все заголовки для отладки
	log.Printf("🔍 CreateReportHandler: Headers: %+v", r.Header)
	log.Printf("🔍 CreateReportHandler: Context keys: %+v", r.Context())

	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		log.Printf("❌ CreateReportHandler: userID not found in context")

		// Пробуем получить из заголовков Gateway
		userIDHeader := r.Header.Get("X-User-ID")
		log.Printf("🔍 CreateReportHandler: X-User-ID header: %s", userIDHeader)

		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	log.Printf("✅ CreateReportHandler: userID from context: %d", userID)

	var req CreateReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.TargetType == "" || req.TargetID == 0 || req.Reason == "" {
		sendErrorResponse(w, "Заполните все обязательные поля", http.StatusBadRequest)
		return
	}

	// Проверяем, не жаловался ли пользователь уже на этот объект
	var existingReport int
	err := db.DB.QueryRow(ConvertPlaceholders(`
		SELECT COUNT(*) FROM reports 
		WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'
	`), userID, req.TargetType, req.TargetID).Scan(&existingReport)

	if err == nil && existingReport > 0 {
		sendErrorResponse(w, "Вы уже пожаловались на этот контент", http.StatusConflict)
		return
	}

	// Создаём жалобу
	query := ConvertPlaceholders(`
		INSERT INTO reports (reporter_id, target_type, target_id, reason, description, status, created_at)
		VALUES (?, ?, ?, ?, ?, 'pending', ?) RETURNING id
	`)

	var reportID int64
	err = db.DB.QueryRow(query, userID, req.TargetType, req.TargetID, req.Reason, req.Description, time.Now()).Scan(&reportID)

	if err != nil {
		sendErrorResponse(w, "Ошибка создания жалобы: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Логируем создание жалобы
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	CreateUserLog(db.DB, userID, "report_created",
		"Жалоба на "+req.TargetType+" #"+string(rune(req.TargetID)),
		ipAddress, userAgent)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"report_id": reportID,
		"message":   "Жалоба отправлена. Модераторы рассмотрят её в ближайшее время.",
	})
}
