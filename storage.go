package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/google/uuid"
)

var (
	s3Client   *s3.S3
	s3Uploader *s3manager.Uploader
	s3Bucket   string
	s3CDNUrl   string
	useS3      bool
)

// InitS3 инициализирует подключение к S3
func InitS3() error {
	useS3Env := os.Getenv("USE_S3")
	if useS3Env != "true" {
		log.Println("📁 S3 disabled, using local storage")
		useS3 = false
		return nil
	}

	endpoint := os.Getenv("S3_ENDPOINT")
	region := os.Getenv("S3_REGION")
	bucket := os.Getenv("S3_BUCKET")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")
	cdnURL := os.Getenv("S3_CDN_URL")

	if endpoint == "" || region == "" || bucket == "" || accessKey == "" || secretKey == "" {
		log.Println("⚠️  S3 configuration incomplete, falling back to local storage")
		useS3 = false
		return nil
	}

	// Создаем сессию S3
	sess, err := session.NewSession(&aws.Config{
		Endpoint:         aws.String(endpoint),
		Region:           aws.String(region),
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		S3ForcePathStyle: aws.Bool(true),
	})
	if err != nil {
		log.Printf("❌ Failed to create S3 session: %v", err)
		useS3 = false
		return err
	}

	s3Client = s3.New(sess)
	s3Uploader = s3manager.NewUploader(sess)
	s3Bucket = bucket
	s3CDNUrl = cdnURL
	useS3 = true

	log.Printf("☁️  S3 storage initialized: bucket=%s, region=%s", bucket, region)
	if cdnURL != "" {
		log.Printf("🌐 CDN URL: %s", cdnURL)
	}

	return nil
}

// UploadPetPhoto загружает фото питомца в S3
func UploadPetPhoto(file multipart.File, header *multipart.FileHeader, petID, userID int) (string, error) {
	if !useS3 {
		return "", fmt.Errorf("S3 is not enabled")
	}

	// Определяем Content-Type по расширению файла
	ext := strings.ToLower(filepath.Ext(header.Filename))
	contentType := getContentTypeFromExtension(ext)

	// Если не удалось определить по расширению, пробуем из заголовка
	if contentType == "" {
		contentType = header.Header.Get("Content-Type")
	}

	// Валидация типа файла
	if !isValidImageType(contentType) && !isValidImageExtension(ext) {
		return "", fmt.Errorf("invalid file type: %s (extension: %s). Allowed: JPEG, PNG, WebP", contentType, ext)
	}

	// Если Content-Type не определен, устанавливаем по расширению
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = getContentTypeFromExtension(ext)
		if contentType == "" {
			contentType = "image/jpeg" // По умолчанию
		}
	}

	// Валидация размера (5MB)
	if header.Size > 5*1024*1024 {
		return "", fmt.Errorf("file too large: %d bytes. Maximum: 5MB", header.Size)
	}

	// Генерируем имя файла с правильным расширением
	if ext == "" {
		ext = getExtensionFromContentType(contentType)
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Формируем путь: pets/{pet_id}/photos/{year}/{month}/{uuid}.{ext}
	now := time.Now()
	s3Key := fmt.Sprintf("pets/%d/photos/%d/%02d/%s",
		petID, now.Year(), now.Month(), filename)

	// Читаем файл в буфер
	buf := new(bytes.Buffer)
	if _, err := io.Copy(buf, file); err != nil {
		return "", fmt.Errorf("failed to read file: %v", err)
	}

	// Загружаем в S3
	log.Printf("☁️  Uploading to S3: %s (size: %d bytes, type: %s)", s3Key, header.Size, contentType)

	result, err := s3Uploader.Upload(&s3manager.UploadInput{
		Bucket:      aws.String(s3Bucket),
		Key:         aws.String(s3Key),
		Body:        bytes.NewReader(buf.Bytes()),
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"),
	})
	if err != nil {
		log.Printf("❌ Failed to upload to S3: %v", err)
		return "", fmt.Errorf("failed to upload to S3: %v", err)
	}

	// Формируем публичный URL
	var publicURL string
	if s3CDNUrl != "" {
		publicURL = fmt.Sprintf("%s/%s", strings.TrimRight(s3CDNUrl, "/"), s3Key)
	} else {
		publicURL = result.Location
	}

	log.Printf("✅ File uploaded successfully: %s", publicURL)

	return publicURL, nil
}

// isValidImageType проверяет допустимый тип изображения
func isValidImageType(contentType string) bool {
	validTypes := []string{
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/webp",
	}

	for _, validType := range validTypes {
		if contentType == validType {
			return true
		}
	}
	return false
}

// isValidImageExtension проверяет допустимое расширение файла
func isValidImageExtension(ext string) bool {
	ext = strings.ToLower(ext)
	validExtensions := []string{".jpg", ".jpeg", ".png", ".webp"}

	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

// getContentTypeFromExtension возвращает Content-Type по расширению файла
func getContentTypeFromExtension(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	default:
		return ""
	}
}

// getExtensionFromContentType возвращает расширение файла по Content-Type
func getExtensionFromContentType(contentType string) string {
	switch contentType {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	default:
		return ".jpg"
	}
}
