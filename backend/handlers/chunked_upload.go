package handlers

import (
	"backend/storage"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/google/uuid"
)

const (
	ChunkSize     = 5 * 1024 * 1024 // 5MB chunks
	TempUploadDir = "../../uploads/temp"
	MaxChunkAge   = 24 * time.Hour // Cleanup old chunks after 24h
)

type ChunkedUploadHandler struct {
	DB *sql.DB
}

func NewChunkedUploadHandler(db *sql.DB) *ChunkedUploadHandler {
	// Create temp directory if not exists
	os.MkdirAll(TempUploadDir, 0755)
	return &ChunkedUploadHandler{DB: db}
}

// InitiateUpload creates a new upload session
func (h *ChunkedUploadHandler) InitiateUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get file info from request
	fileName := r.FormValue("file_name")
	fileSizeStr := r.FormValue("file_size")
	_ = r.FormValue("media_type") // Reserved for future use
	_ = r.FormValue("mime_type")  // Reserved for future use

	if fileName == "" || fileSizeStr == "" {
		sendErrorResponse(w, "Missing file_name or file_size", http.StatusBadRequest)
		return
	}

	fileSize, err := strconv.ParseInt(fileSizeStr, 10, 64)
	if err != nil {
		sendErrorResponse(w, "Invalid file_size", http.StatusBadRequest)
		return
	}

	// Generate upload ID
	uploadID := uuid.New().String()

	// Create temp directory for this upload
	uploadDir := filepath.Join(TempUploadDir, uploadID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		sendErrorResponse(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Calculate total chunks
	totalChunks := int((fileSize + ChunkSize - 1) / ChunkSize)

	fmt.Printf("📤 [CHUNKED] Инициализация загрузки: upload_id=%s, user_id=%d, file=%s, size=%d, chunks=%d\n",
		uploadID, userID, fileName, fileSize, totalChunks)

	sendSuccessResponse(w, map[string]interface{}{
		"upload_id":    uploadID,
		"chunk_size":   ChunkSize,
		"total_chunks": totalChunks,
	})
}

// UploadChunk handles individual chunk upload
func (h *ChunkedUploadHandler) UploadChunk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	_, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get chunk info
	uploadID := r.FormValue("upload_id")
	chunkIndexStr := r.FormValue("chunk_index")

	if uploadID == "" || chunkIndexStr == "" {
		sendErrorResponse(w, "Missing upload_id or chunk_index", http.StatusBadRequest)
		return
	}

	chunkIndex, err := strconv.Atoi(chunkIndexStr)
	if err != nil {
		sendErrorResponse(w, "Invalid chunk_index", http.StatusBadRequest)
		return
	}

	// Get chunk data
	file, _, err := r.FormFile("chunk")
	if err != nil {
		sendErrorResponse(w, "Failed to read chunk", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Save chunk to temp directory
	uploadDir := filepath.Join(TempUploadDir, uploadID)
	chunkPath := filepath.Join(uploadDir, fmt.Sprintf("chunk_%d", chunkIndex))

	dst, err := os.Create(chunkPath)
	if err != nil {
		sendErrorResponse(w, "Failed to save chunk", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	chunkSize, err := io.Copy(dst, file)
	if err != nil {
		sendErrorResponse(w, "Failed to write chunk", http.StatusInternalServerError)
		return
	}

	fmt.Printf("📦 [CHUNKED] Chunk загружен: upload_id=%s, chunk=%d, size=%d\n", uploadID, chunkIndex, chunkSize)

	sendSuccessResponse(w, map[string]interface{}{
		"chunk_index": chunkIndex,
		"uploaded":    true,
	})
}

// CompleteUpload assembles chunks and processes the file
func (h *ChunkedUploadHandler) CompleteUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get upload info
	uploadID := r.FormValue("upload_id")
	fileName := r.FormValue("file_name")
	mediaType := r.FormValue("media_type")
	mimeType := r.FormValue("mime_type")
	totalChunksStr := r.FormValue("total_chunks")

	if uploadID == "" || fileName == "" {
		sendErrorResponse(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	totalChunks, err := strconv.Atoi(totalChunksStr)
	if err != nil {
		sendErrorResponse(w, "Invalid total_chunks", http.StatusBadRequest)
		return
	}

	fmt.Printf("🔗 [CHUNKED] Сборка файла: upload_id=%s, chunks=%d\n", uploadID, totalChunks)

	// Assemble chunks into temporary file
	uploadDir := filepath.Join(TempUploadDir, uploadID)
	tempAssembledPath := filepath.Join(uploadDir, "assembled_"+fileName)

	// Create temporary assembled file
	tempFile, err := os.Create(tempAssembledPath)
	if err != nil {
		sendErrorResponse(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}

	// Assemble chunks into temp file
	var totalSize int64
	for i := 0; i < totalChunks; i++ {
		chunkPath := filepath.Join(uploadDir, fmt.Sprintf("chunk_%d", i))
		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			tempFile.Close()
			os.Remove(tempAssembledPath)
			sendErrorResponse(w, fmt.Sprintf("Missing chunk %d", i), http.StatusBadRequest)
			return
		}

		size, err := io.Copy(tempFile, chunkFile)
		chunkFile.Close()
		if err != nil {
			tempFile.Close()
			os.Remove(tempAssembledPath)
			sendErrorResponse(w, "Failed to assemble chunks", http.StatusInternalServerError)
			return
		}
		totalSize += size
	}
	tempFile.Close()

	fmt.Printf("✅ [CHUNKED] Файл собран во временный файл: %s, size=%d\n", tempAssembledPath, totalSize)

	// Generate final file name
	ext := filepath.Ext(fileName)
	finalFileName := uuid.New().String() + ext
	now := time.Now()
	relativePath := filepath.Join("users", strconv.Itoa(userID), mediaType+"s",
		strconv.Itoa(now.Year()), fmt.Sprintf("%02d", now.Month()), finalFileName)

	// Open assembled file for upload to S3
	assembledFile, err := os.Open(tempAssembledPath)
	if err != nil {
		os.Remove(tempAssembledPath)
		sendErrorResponse(w, "Failed to open assembled file", http.StatusInternalServerError)
		return
	}
	defer assembledFile.Close()

	// Upload to S3 using storage.SaveFile
	finalURL, err := storage.SaveFile(assembledFile, relativePath, finalFileName)
	if err != nil {
		os.Remove(tempAssembledPath)
		sendErrorResponse(w, "Failed to upload to S3", http.StatusInternalServerError)
		return
	}

	fmt.Printf("☁️ [CHUNKED] Файл загружен в S3: %s\n", finalURL)

	// Clean up temp file and chunks
	os.Remove(tempAssembledPath)
	os.RemoveAll(uploadDir)

	// Save to database with S3 URL
	query := ConvertPlaceholders(`
		INSERT INTO user_media (user_id, file_name, original_name, file_path, file_size, mime_type, media_type)
		VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
	`)

	var mediaID int64
	err = h.DB.QueryRow(query, userID, finalFileName, fileName, finalURL, totalSize, mimeType, mediaType).Scan(&mediaID)
	if err != nil {
		sendErrorResponse(w, "Failed to save to database", http.StatusInternalServerError)
		return
	}

	fmt.Printf("💾 [CHUNKED] Сохранено в БД: ID=%d\n", mediaID)

	fmt.Printf("🎉 [CHUNKED] Загрузка завершена: ID=%d, URL=%s\n", mediaID, finalURL)

	sendSuccessResponse(w, map[string]interface{}{
		"id":            int(mediaID),
		"url":           finalURL,
		"file_name":     finalFileName,
		"original_name": fileName,
		"file_size":     totalSize,
		"mime_type":     mimeType,
		"media_type":    mediaType,
	})
}
