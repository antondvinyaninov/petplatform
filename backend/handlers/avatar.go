package handlers

import (
	"backend/storage"
	"backend/db"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

// UploadAvatarHandler - загрузка аватара пользователя
func UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	ipAddress := r.RemoteAddr

	// Парсим multipart form (максимум 10MB)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		logSystemEvent("error", "profile", "upload_avatar", fmt.Sprintf("Ошибка парсинга формы: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Ошибка парсинга формы", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		logSystemEvent("error", "profile", "upload_avatar", fmt.Sprintf("Файл не найден: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Файл не найден", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Проверяем тип файла
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		logSystemEvent("warning", "profile", "upload_avatar", fmt.Sprintf("Попытка загрузить не изображение: %s", contentType), &userID, ipAddress)
		sendErrorResponse(w, "Разрешены только изображения", http.StatusBadRequest)
		return
	}

	// Проверяем размер (максимум 10MB)
	if header.Size > 10<<20 {
		logSystemEvent("warning", "profile", "upload_avatar", fmt.Sprintf("Файл слишком большой: %d bytes", header.Size), &userID, ipAddress)
		sendErrorResponse(w, "Файл слишком большой (максимум 10MB)", http.StatusBadRequest)
		return
	}

	// Генерируем уникальное имя файла
	ext := filepath.Ext(header.Filename)
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	s3Key := fmt.Sprintf("users/%d/avatars/%s", userID, fileName)

	// Сохраняем файл (в S3 или локально)
	avatarURL, err := storage.SaveFile(file, s3Key, contentType)
	if err != nil {
		logSystemEvent("error", "profile", "upload_avatar", fmt.Sprintf("Ошибка сохранения файла: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Ошибка сохранения файла", http.StatusInternalServerError)
		return
	}

	logSystemEvent("info", "profile", "upload_avatar", fmt.Sprintf("Файл сохранён: %s", avatarURL), &userID, ipAddress)

	// Обновляем аватар в базе данных
	query := ConvertPlaceholders(`UPDATE users SET avatar = ? WHERE id = ?`)
	_, err = db.DB.Exec(query, avatarURL, userID)
	if err != nil {
		logSystemEvent("error", "profile", "upload_avatar", fmt.Sprintf("Ошибка обновления БД: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Ошибка обновления базы данных", http.StatusInternalServerError)
		return
	}

	logSystemEvent("success", "profile", "upload_avatar", fmt.Sprintf("Аватар обновлён: %s", avatarURL), &userID, ipAddress)

	// Возвращаем успешный ответ
	sendSuccessResponse(w, map[string]interface{}{
		"avatar_url": avatarURL,
		"message":    "Аватар успешно загружен",
	})
}

// UploadCoverPhotoHandler - загрузка обложки профиля
func UploadCoverPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	ipAddress := r.RemoteAddr

	// Парсим multipart form (максимум 10MB)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		logSystemEvent("error", "profile", "upload_cover", fmt.Sprintf("Ошибка парсинга формы: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Ошибка парсинга формы", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("cover")
	if err != nil {
		logSystemEvent("error", "profile", "upload_cover", fmt.Sprintf("Файл не найден: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Файл не найден", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Проверяем тип файла
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		logSystemEvent("warning", "profile", "upload_cover", fmt.Sprintf("Попытка загрузить не изображение: %s", contentType), &userID, ipAddress)
		sendErrorResponse(w, "Разрешены только изображения", http.StatusBadRequest)
		return
	}

	// Проверяем размер (максимум 10MB)
	if header.Size > 10<<20 {
		logSystemEvent("warning", "profile", "upload_cover", fmt.Sprintf("Файл слишком большой: %d bytes", header.Size), &userID, ipAddress)
		sendErrorResponse(w, "Файл слишком большой (максимум 10MB)", http.StatusBadRequest)
		return
	}

	// Генерируем уникальное имя файла
	ext := filepath.Ext(header.Filename)
	fileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	s3Key := fmt.Sprintf("users/%d/covers/%s", userID, fileName)

	// Сохраняем файл (в S3 или локально)
	coverURL, err := storage.SaveFile(file, s3Key, contentType)
	if err != nil {
		logSystemEvent("error", "profile", "upload_cover", fmt.Sprintf("Ошибка сохранения файла: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Ошибка сохранения файла", http.StatusInternalServerError)
		return
	}

	logSystemEvent("info", "profile", "upload_cover", fmt.Sprintf("Файл сохранён: %s", coverURL), &userID, ipAddress)

	// Обновляем обложку в базе данных
	query := ConvertPlaceholders(`UPDATE users SET cover_photo = ? WHERE id = ?`)
	_, err = db.DB.Exec(query, coverURL, userID)
	if err != nil {
		logSystemEvent("error", "profile", "upload_cover", fmt.Sprintf("Ошибка обновления БД: %v", err), &userID, ipAddress)
		sendErrorResponse(w, "Ошибка обновления базы данных", http.StatusInternalServerError)
		return
	}

	logSystemEvent("success", "profile", "upload_cover", fmt.Sprintf("Обложка обновлена: %s", coverURL), &userID, ipAddress)

	// Возвращаем успешный ответ
	sendSuccessResponse(w, map[string]interface{}{
		"cover_url": coverURL,
		"message":   "Обложка успешно загружена",
	})
}

// DeleteAvatarHandler - удаление аватара
func DeleteAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Обновляем аватар в базе данных (устанавливаем NULL)
	query := ConvertPlaceholders(`UPDATE users SET avatar = NULL WHERE id = ?`)
	_, err := db.DB.Exec(query, userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка обновления базы данных", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, map[string]interface{}{
		"message": "Аватар успешно удалён",
	})
}

// DeleteCoverPhotoHandler - удаление обложки
func DeleteCoverPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Обновляем обложку в базе данных (устанавливаем NULL)
	query := ConvertPlaceholders(`UPDATE users SET cover_photo = NULL WHERE id = ?`)
	_, err := db.DB.Exec(query, userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка обновления базы данных", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, map[string]interface{}{
		"message": "Обложка успешно удалена",
	})
}
