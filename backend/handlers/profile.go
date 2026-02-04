package handlers

import (
	"backend/models"
	"backend/db"
	"database/sql"
	"encoding/json"
	"net/http"
)

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем ID пользователя из контекста (установлен middleware)
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	var req struct {
		Name              string `json:"name"`
		LastName          string `json:"last_name"`
		Bio               string `json:"bio"`
		Phone             string `json:"phone"`
		Location          string `json:"location"`
		ProfileVisibility string `json:"profile_visibility"`
		ShowPhone         string `json:"show_phone"`
		ShowEmail         string `json:"show_email"`
		AllowMessages     string `json:"allow_messages"`
		ShowOnline        string `json:"show_online"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	// Обновляем профиль (БЕЗ avatar и cover_photo - для них отдельные endpoints)
	query := ConvertPlaceholders(`UPDATE users SET name = ?, last_name = ?, bio = ?, phone = ?, location = ?,
	          profile_visibility = ?, show_phone = ?, show_email = ?, allow_messages = ?, show_online = ?
	          WHERE id = ?`)
	_, err := db.DB.Exec(query, req.Name, req.LastName, req.Bio, req.Phone, req.Location,
		req.ProfileVisibility, req.ShowPhone, req.ShowEmail, req.AllowMessages, req.ShowOnline, userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка обновления профиля: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Логируем обновление профиля
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	CreateUserLog(db.DB, userID, "profile_update", "Обновление профиля", ipAddress, userAgent)

	// Получаем обновленные данные пользователя
	var user models.User
	var lastName, bio, phone, location, avatar, coverPhoto sql.NullString

	query = ConvertPlaceholders(`SELECT id, name, last_name, email, bio, phone, location, avatar, cover_photo,
	         profile_visibility, show_phone, show_email, allow_messages, show_online, created_at 
	         FROM users WHERE id = ?`)
	err = db.DB.QueryRow(query, userID).Scan(
		&user.ID, &user.Name, &lastName, &user.Email, &bio, &phone,
		&location, &avatar, &coverPhoto,
		&user.ProfileVisibility, &user.ShowPhone, &user.ShowEmail, &user.AllowMessages, &user.ShowOnline,
		&user.CreatedAt,
	)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения данных пользователя: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Конвертируем NULL значения
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if bio.Valid {
		user.Bio = bio.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}
	if location.Valid {
		user.Location = location.String
	}
	if avatar.Valid {
		user.Avatar = avatar.String
	}
	if coverPhoto.Valid {
		user.CoverPhoto = coverPhoto.String
	}

	sendSuccessResponse(w, models.UserResponse{
		ID:                user.ID,
		Name:              user.Name,
		LastName:          user.LastName,
		Email:             user.Email,
		Bio:               user.Bio,
		Phone:             user.Phone,
		Location:          user.Location,
		Avatar:            user.Avatar,
		CoverPhoto:        user.CoverPhoto,
		ProfileVisibility: user.ProfileVisibility,
		ShowPhone:         user.ShowPhone,
		ShowEmail:         user.ShowEmail,
		AllowMessages:     user.AllowMessages,
		ShowOnline:        user.ShowOnline,
		CreatedAt:         user.CreatedAt,
	})
}
