package handlers

import (
	"database/sql"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/models"
	"backend/storage"

	"github.com/google/uuid"
)

const (
	MaxPhotoSize  = 10 * 1024 * 1024  // 10MB для фото
	MaxVideoSize  = 100 * 1024 * 1024 // 100MB для видео
	UploadDir     = "../../uploads"   // Относительно main/backend
	OptimizeVideo = true              // Включить оптимизацию видео
)

type MediaHandler struct {
	DB *sql.DB
}

func NewMediaHandler(db *sql.DB) *MediaHandler {
	return &MediaHandler{DB: db}
}

// UploadMedia загружает медиа-файл
func (h *MediaHandler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем user_id из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	fmt.Printf("📤 [UPLOAD] Начало загрузки для user_id=%d\n", userID)

	// Получаем тип медиа из формы
	if err := r.ParseMultipartForm(1024); err != nil {
		fmt.Printf("❌ [UPLOAD] Ошибка парсинга формы: %v\n", err)
		sendErrorResponse(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	mediaType := r.FormValue("media_type")
	if mediaType == "" {
		mediaType = "photo" // По умолчанию
	}

	fmt.Printf("📋 [UPLOAD] Тип медиа: %s\n", mediaType)

	// Определяем максимальный размер в зависимости от типа
	maxSize := int64(MaxPhotoSize)
	maxSizeStr := "10MB"
	if mediaType == "video" {
		maxSize = int64(MaxVideoSize)
		maxSizeStr = "100MB"
	}

	fmt.Printf("📏 [UPLOAD] Максимальный размер: %s (%d bytes)\n", maxSizeStr, maxSize)

	// Ограничение размера
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	// Получаем файл
	file, header, err := r.FormFile("file")
	if err != nil {
		fmt.Printf("❌ [UPLOAD] Ошибка получения файла: %v\n", err)
		sendErrorResponse(w, "Failed to read file or file too large. Max size: "+maxSizeStr, http.StatusBadRequest)
		return
	}
	defer file.Close()

	fmt.Printf("📁 [UPLOAD] Файл получен: %s, размер: %d bytes, MIME: %s\n",
		header.Filename, header.Size, header.Header.Get("Content-Type"))

	// Проверяем MIME type
	mimeType := header.Header.Get("Content-Type")
	if !isAllowedMimeType(mimeType, mediaType) {
		fmt.Printf("❌ [UPLOAD] Недопустимый MIME тип: %s для типа %s\n", mimeType, mediaType)
		sendErrorResponse(w, "Invalid file type", http.StatusBadRequest)
		return
	}

	fmt.Printf("✅ [UPLOAD] MIME тип валиден: %s\n", mimeType)

	// Генерируем уникальное имя файла
	ext := filepath.Ext(header.Filename)
	fileName := uuid.New().String() + ext

	// Создаем путь к файлу для S3
	now := time.Now()
	s3Key := filepath.Join("users", strconv.Itoa(userID), mediaType+"s",
		strconv.Itoa(now.Year()), fmt.Sprintf("%02d", now.Month()), fileName)

	fmt.Printf("📂 [UPLOAD] S3 ключ: %s\n", s3Key)

	// Сохраняем файл (в S3 или локально в зависимости от конфигурации)
	fileURL, err := storage.SaveFile(file, s3Key, mimeType)
	if err != nil {
		fmt.Printf("❌ [UPLOAD] Ошибка сохранения файла: %v\n", err)
		sendErrorResponse(w, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("💾 [UPLOAD] Файл сохранен, URL: %s\n", fileURL)

	// Для видео - оптимизация (пока пропускаем для S3, нужна отдельная реализация)
	fileSize := header.Size

	// Получаем размеры изображения (если это фото)
	var width, height *int
	if mediaType == "photo" {
		file.Seek(0, 0) // Возвращаемся в начало файла
		img, _, err := image.DecodeConfig(file)
		if err == nil {
			w := img.Width
			h := img.Height
			width = &w
			height = &h
		}
	}

	// Сохраняем в БД
	query := ConvertPlaceholders(`
		INSERT INTO user_media (user_id, file_name, original_name, file_path, file_size, mime_type, media_type, width, height)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
	`)
	fmt.Printf("💾 [UPLOAD] Сохранение в БД: user_id=%d, file_name=%s, media_type=%s\n", userID, fileName, mediaType)

	var mediaID int64
	err = h.DB.QueryRow(query, userID, fileName, header.Filename, fileURL, fileSize, mimeType, mediaType, width, height).Scan(&mediaID)
	if err != nil {
		fmt.Printf("❌ [UPLOAD] Ошибка сохранения в БД: %v\n", err)
		// Пытаемся удалить файл из S3 при ошибке БД
		storage.DeleteFile(fileURL)
		sendErrorResponse(w, "Failed to save to database", http.StatusInternalServerError)
		return
	}

	fmt.Printf("✅ [UPLOAD] Запись в БД создана, ID=%d\n", mediaID)

	// Формируем ответ
	media := models.UserMedia{
		ID:           int(mediaID),
		UserID:       userID,
		FileName:     fileName,
		OriginalName: header.Filename,
		FilePath:     fileURL, // Теперь это полный URL (S3 или локальный)
		FileSize:     fileSize,
		MimeType:     mimeType,
		MediaType:    mediaType,
		Width:        width,
		Height:       height,
		UploadedAt:   now,
		URL:          fileURL, // Используем прямой URL вместо /api/media/file/ID
	}

	fmt.Printf("🎉 [UPLOAD] Загрузка завершена успешно! ID=%d, URL=%s\n", mediaID, media.URL)
	sendSuccessResponse(w, media)
}

// GetUserMedia получает все медиа пользователя
func (h *MediaHandler) GetUserMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем user_id из URL
	userIDStr := strings.TrimPrefix(r.URL.Path, "/api/media/user/")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		sendErrorResponse(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Получаем тип медиа из query параметров
	mediaType := r.URL.Query().Get("type")

	// Формируем запрос
	query := ConvertPlaceholders(`
		SELECT id, user_id, file_name, original_name, file_path, file_size, mime_type, media_type, width, height, duration, uploaded_at
		FROM user_media
		WHERE user_id = ?
	`)
	args := []interface{}{userID}

	if mediaType != "" {
		query = strings.TrimSuffix(query, ")") + " AND media_type = " + ConvertPlaceholders("?") + ")"
		args = append(args, mediaType)
	}

	query += " ORDER BY uploaded_at DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		sendErrorResponse(w, "Failed to fetch media", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var mediaList []models.UserMedia
	for rows.Next() {
		var media models.UserMedia
		err := rows.Scan(
			&media.ID, &media.UserID, &media.FileName, &media.OriginalName,
			&media.FilePath, &media.FileSize, &media.MimeType, &media.MediaType,
			&media.Width, &media.Height, &media.Duration, &media.UploadedAt,
		)
		if err != nil {
			continue
		}
		media.URL = "/api/media/file/" + strconv.Itoa(media.ID)
		mediaList = append(mediaList, media)
	}

	if mediaList == nil {
		mediaList = []models.UserMedia{}
	}

	sendSuccessResponse(w, mediaList)
}

// GetMediaFile отдает файл по ID
func (h *MediaHandler) GetMediaFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем media_id из URL
	mediaIDStr := strings.TrimPrefix(r.URL.Path, "/api/media/file/")
	mediaID, err := strconv.Atoi(mediaIDStr)
	if err != nil {
		sendErrorResponse(w, "Invalid media ID", http.StatusBadRequest)
		return
	}

	// Получаем информацию о файле из БД
	var media models.UserMedia
	query := ConvertPlaceholders(`SELECT file_path, mime_type FROM user_media WHERE id = ?`)
	err = h.DB.QueryRow(query, mediaID).Scan(&media.FilePath, &media.MimeType)
	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		sendErrorResponse(w, "Failed to fetch media", http.StatusInternalServerError)
		return
	}

	// Открываем файл
	fullPath := filepath.Join(UploadDir, media.FilePath)
	file, err := os.Open(fullPath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()

	// Отдаем файл
	w.Header().Set("Content-Type", media.MimeType)
	w.Header().Set("Cache-Control", "public, max-age=31536000") // Кеш на год
	io.Copy(w, file)
}

// DeleteMedia удаляет медиа-файл
func (h *MediaHandler) DeleteMedia(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем user_id из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Получаем media_id из URL
	mediaIDStr := strings.TrimPrefix(r.URL.Path, "/api/media/delete/")
	mediaID, err := strconv.Atoi(mediaIDStr)
	if err != nil {
		sendErrorResponse(w, "Invalid media ID", http.StatusBadRequest)
		return
	}

	// Проверяем, что файл принадлежит пользователю
	var filePath string
	var ownerID int
	query := ConvertPlaceholders(`SELECT user_id, file_path FROM user_media WHERE id = ?`)
	err = h.DB.QueryRow(query, mediaID).Scan(&ownerID, &filePath)
	if err == sql.ErrNoRows {
		sendErrorResponse(w, "Media not found", http.StatusNotFound)
		return
	}
	if err != nil {
		sendErrorResponse(w, "Failed to fetch media", http.StatusInternalServerError)
		return
	}

	if ownerID != userID {
		sendErrorResponse(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Удаляем файл
	fullPath := filepath.Join(UploadDir, filePath)
	os.Remove(fullPath)

	// Удаляем из БД
	_, err = h.DB.Exec(ConvertPlaceholders("DELETE FROM user_media WHERE id = ?"), mediaID)
	if err != nil {
		sendErrorResponse(w, "Failed to delete from database", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, map[string]string{"message": "Media deleted successfully"})
}

// GetMediaStats получает статистику использования медиа
func (h *MediaHandler) GetMediaStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем user_id из контекста
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := ConvertPlaceholders(`
		SELECT 
			COUNT(*) as total_files,
			COALESCE(SUM(file_size), 0) as total_size,
			COALESCE(SUM(CASE WHEN media_type = 'photo' THEN 1 ELSE 0 END), 0) as photos_count,
			COALESCE(SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END), 0) as videos_count,
			COALESCE(SUM(CASE WHEN media_type = 'document' THEN 1 ELSE 0 END), 0) as docs_count
		FROM user_media
		WHERE user_id = ?
	`)

	var stats models.MediaStats
	err := h.DB.QueryRow(query, userID).Scan(
		&stats.TotalFiles, &stats.TotalSize, &stats.PhotosCount, &stats.VideosCount, &stats.DocsCount,
	)
	if err != nil {
		sendErrorResponse(w, "Failed to fetch stats", http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, stats)
}

// Вспомогательные функции

func isAllowedMimeType(mimeType, mediaType string) bool {
	allowedTypes := map[string][]string{
		"photo": {
			"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
		},
		"video": {
			"video/mp4", "video/mpeg", "video/quicktime", "video/webm",
		},
		"document": {
			"application/pdf", "application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		},
	}

	allowed, ok := allowedTypes[mediaType]
	if !ok {
		return false
	}

	for _, t := range allowed {
		if t == mimeType {
			return true
		}
	}
	return false
}

// optimizeVideo оптимизирует видео с помощью FFmpeg (сохраняет разрешение, но сжимает)
func optimizeVideo(inputPath string) (string, error) {
	if !OptimizeVideo {
		return inputPath, nil
	}

	// Проверяем наличие FFmpeg
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		fmt.Printf("⚠️ [VIDEO] FFmpeg не найден, пропускаем оптимизацию\n")
		return inputPath, nil
	}

	// Получаем информацию о файле
	inputInfo, err := os.Stat(inputPath)
	if err != nil {
		return "", err
	}
	inputSize := inputInfo.Size()

	fmt.Printf("🎬 [VIDEO] Начало оптимизации: %s (%.2f MB)\n", filepath.Base(inputPath), float64(inputSize)/(1024*1024))

	// Получаем разрешение оригинального видео
	probeCmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=p=0",
		inputPath,
	)
	probeOutput, err := probeCmd.Output()
	if err != nil {
		fmt.Printf("⚠️ [VIDEO] Не удалось определить разрешение, используем оригинал\n")
		return inputPath, nil
	}

	resolution := strings.TrimSpace(string(probeOutput))
	fmt.Printf("📐 [VIDEO] Оригинальное разрешение: %s\n", resolution)

	// Создаем временный файл для оптимизированного видео
	outputPath := strings.TrimSuffix(inputPath, filepath.Ext(inputPath)) + "_optimized.mp4"

	// FFmpeg команда (сохраняем разрешение, но агрессивно сжимаем)
	args := []string{
		"-i", inputPath,
		"-c:v", "libx264",
		"-preset", "medium", // Баланс скорость/качество
		"-crf", "28", // Агрессивное сжатие (как в Telegram)
		"-profile:v", "main", // Профиль для совместимости
		"-level", "4.0", // Уровень для поддержки разных разрешений
		"-pix_fmt", "yuv420p", // Формат пикселей
		"-r", "30", // Максимум 30 FPS
		"-c:a", "aac", // Кодек аудио
		"-b:a", "64k", // Битрейт аудио
		"-ar", "44100", // Частота дискретизации
		"-ac", "2", // Стерео
		"-movflags", "+faststart", // Оптимизация для веб
		"-y",
		outputPath,
	}

	fmt.Printf("⚙️ [VIDEO] FFmpeg команда: ffmpeg %s\n", strings.Join(args, " "))
	fmt.Printf("⏳ [VIDEO] Обработка... (может занять время)\n")

	// Запускаем FFmpeg
	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Printf("❌ [VIDEO] Ошибка FFmpeg: %v\n%s\n", err, string(output))
		return "", fmt.Errorf("FFmpeg error: %v", err)
	}

	// Проверяем результат
	outputInfo, err := os.Stat(outputPath)
	if err != nil {
		return "", err
	}
	outputSize := outputInfo.Size()

	// Вычисляем экономию
	savings := float64(inputSize-outputSize) / float64(inputSize) * 100
	fmt.Printf("✅ [VIDEO] Оптимизация завершена: %s (%.2f MB)\n", filepath.Base(outputPath), float64(outputSize)/(1024*1024))
	fmt.Printf("📊 [VIDEO] Экономия: %.1f%% (%.2f MB)\n", savings, float64(inputSize-outputSize)/(1024*1024))

	// Удаляем оригинал
	os.Remove(inputPath)

	return outputPath, nil
}
