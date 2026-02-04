package models

import "time"

// UserMedia представляет медиа-файл пользователя
type UserMedia struct {
	ID           int       `json:"id"`
	UserID       int       `json:"user_id"`
	FileName     string    `json:"file_name"`
	OriginalName string    `json:"original_name"`
	FilePath     string    `json:"file_path"`
	FileSize     int64     `json:"file_size"`
	MimeType     string    `json:"mime_type"`
	MediaType    string    `json:"media_type"` // photo, video, document, avatar
	Width        *int      `json:"width,omitempty"`
	Height       *int      `json:"height,omitempty"`
	Duration     *int      `json:"duration,omitempty"`
	UploadedAt   time.Time `json:"uploaded_at"`
	URL          string    `json:"url"` // Полный URL для доступа к файлу
}

// UploadMediaRequest - запрос на загрузку медиа
type UploadMediaRequest struct {
	MediaType string `json:"media_type"` // photo, video, document
}

// MediaStats - статистика использования медиа
type MediaStats struct {
	TotalFiles  int   `json:"total_files"`
	TotalSize   int64 `json:"total_size"`
	PhotosCount int   `json:"photos_count"`
	VideosCount int   `json:"videos_count"`
	DocsCount   int   `json:"docs_count"`
}
