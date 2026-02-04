package storage

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
)

// S3Client представляет клиент для работы с S3
type S3Client struct {
	session  *session.Session
	uploader *s3manager.Uploader
	bucket   string
	region   string
	endpoint string
	cdnURL   string // URL для доступа к файлам (если используется CDN)
}

var (
	// GlobalS3Client - глобальный экземпляр S3 клиента
	GlobalS3Client *S3Client
	// UseS3 - флаг использования S3 (если false, используется локальное хранилище)
	UseS3 bool
)

// InitS3 инициализирует S3 клиент
func InitS3() error {
	// Проверяем нужно ли использовать S3
	useS3Env := os.Getenv("USE_S3")
	if useS3Env != "true" {
		log.Println("📁 Using local file storage (USE_S3=false)")
		UseS3 = false
		return nil
	}

	// Читаем конфигурацию из .env
	endpoint := os.Getenv("S3_ENDPOINT")
	region := os.Getenv("S3_REGION")
	bucket := os.Getenv("S3_BUCKET")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")
	cdnURL := os.Getenv("S3_CDN_URL") // Опционально

	// Проверяем обязательные параметры
	if endpoint == "" || region == "" || bucket == "" || accessKey == "" || secretKey == "" {
		return fmt.Errorf("S3 configuration incomplete: check S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY")
	}

	// Создаем сессию
	sess, err := session.NewSession(&aws.Config{
		Endpoint:         aws.String(endpoint),
		Region:           aws.String(region),
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		S3ForcePathStyle: aws.Bool(true), // Для совместимости с не-AWS S3
	})

	if err != nil {
		return fmt.Errorf("failed to create S3 session: %v", err)
	}

	// Создаем uploader
	uploader := s3manager.NewUploader(sess)

	GlobalS3Client = &S3Client{
		session:  sess,
		uploader: uploader,
		bucket:   bucket,
		region:   region,
		endpoint: endpoint,
		cdnURL:   cdnURL,
	}

	UseS3 = true
	log.Printf("☁️  S3 storage initialized: bucket=%s, region=%s", bucket, region)
	if cdnURL != "" {
		log.Printf("🌐 CDN URL: %s", cdnURL)
	}

	return nil
}

// UploadFile загружает файл в S3
func (c *S3Client) UploadFile(file multipart.File, filename string, contentType string) (string, error) {
	// Читаем содержимое файла
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %v", err)
	}

	// Загружаем в S3
	result, err := c.uploader.Upload(&s3manager.UploadInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(fileBytes),
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"), // Публичный доступ
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %v", err)
	}

	// Возвращаем URL
	if c.cdnURL != "" {
		// Используем CDN URL
		return fmt.Sprintf("%s/%s", c.cdnURL, filename), nil
	}

	// Используем прямой S3 URL
	return result.Location, nil
}

// UploadFileFromPath загружает файл из локального пути в S3
func (c *S3Client) UploadFileFromPath(localPath string, s3Key string, contentType string) (string, error) {
	file, err := os.Open(localPath)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	result, err := c.uploader.Upload(&s3manager.UploadInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(s3Key),
		Body:        file,
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %v", err)
	}

	if c.cdnURL != "" {
		return fmt.Sprintf("%s/%s", c.cdnURL, s3Key), nil
	}

	return result.Location, nil
}

// DeleteFile удаляет файл из S3
func (c *S3Client) DeleteFile(fileURL string) error {
	// Извлекаем ключ из URL
	key := c.extractKeyFromURL(fileURL)
	if key == "" {
		return fmt.Errorf("invalid file URL")
	}

	svc := s3.New(c.session)
	_, err := svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete from S3: %v", err)
	}

	return nil
}

// extractKeyFromURL извлекает S3 ключ из URL
func (c *S3Client) extractKeyFromURL(fileURL string) string {
	// Если используется CDN
	if c.cdnURL != "" && strings.HasPrefix(fileURL, c.cdnURL) {
		return strings.TrimPrefix(fileURL, c.cdnURL+"/")
	}

	// Если прямой S3 URL
	// Формат: https://bucket.s3.region.amazonaws.com/key
	// или: https://endpoint/bucket/key
	parts := strings.Split(fileURL, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}

	return ""
}

// SaveFile сохраняет файл (в S3 или локально в зависимости от конфигурации)
func SaveFile(file multipart.File, filename string, contentType string) (string, error) {
	if UseS3 && GlobalS3Client != nil {
		// Загружаем в S3
		return GlobalS3Client.UploadFile(file, filename, contentType)
	}

	// Сохраняем локально (fallback)
	return saveFileLocally(file, filename)
}

// DeleteFile удаляет файл (из S3 или локально)
func DeleteFile(fileURL string) error {
	if UseS3 && GlobalS3Client != nil {
		// Удаляем из S3
		return GlobalS3Client.DeleteFile(fileURL)
	}

	// Удаляем локально (fallback)
	// Извлекаем путь из URL (например /uploads/file.jpg -> ../../uploads/file.jpg)
	if strings.HasPrefix(fileURL, "/uploads/") {
		localPath := filepath.Join("../../uploads", strings.TrimPrefix(fileURL, "/uploads/"))
		return os.Remove(localPath)
	}

	return nil
}

// saveFileLocally сохраняет файл локально
func saveFileLocally(file multipart.File, filename string) (string, error) {
	// Определяем директорию по типу файла
	uploadDir := "../../uploads"

	// Создаем директорию если не существует
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %v", err)
	}

	// Полный путь к файлу
	fullPath := filepath.Join(uploadDir, filename)

	// Создаем файл
	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %v", err)
	}
	defer dst.Close()

	// Копируем содержимое
	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("failed to save file: %v", err)
	}

	// Возвращаем относительный URL
	return fmt.Sprintf("/uploads/%s", filename), nil
}

// GetFileURL возвращает URL файла (с CDN если настроен)
func GetFileURL(path string) string {
	if UseS3 && GlobalS3Client != nil && GlobalS3Client.cdnURL != "" {
		// Если путь уже содержит CDN URL, возвращаем как есть
		if strings.HasPrefix(path, GlobalS3Client.cdnURL) {
			return path
		}
		// Если путь начинается с /uploads/, заменяем на CDN
		if strings.HasPrefix(path, "/uploads/") {
			key := strings.TrimPrefix(path, "/uploads/")
			return fmt.Sprintf("%s/%s", GlobalS3Client.cdnURL, key)
		}
	}

	// Возвращаем как есть (локальный путь)
	return path
}
