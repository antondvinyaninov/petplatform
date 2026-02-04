package main

import (
	"bytes"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env from backend directory
	if err := godotenv.Load("../../.env"); err != nil {
		log.Fatal("ERROR: .env file not found")
	}

	endpoint := os.Getenv("S3_ENDPOINT")
	region := os.Getenv("S3_REGION")
	bucket := os.Getenv("S3_BUCKET")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")

	fmt.Println("🧪 Testing S3 connection...")
	fmt.Printf("Endpoint: %s\n", endpoint)
	fmt.Printf("Region: %s\n", region)
	fmt.Printf("Bucket: %s\n", bucket)
	fmt.Printf("Access Key: %s...\n", accessKey[:10])
	fmt.Println()

	// Создаем сессию
	sess, err := session.NewSession(&aws.Config{
		Endpoint:         aws.String(endpoint),
		Region:           aws.String(region),
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		S3ForcePathStyle: aws.Bool(true),
	})

	if err != nil {
		log.Fatalf("❌ Failed to create session: %v", err)
	}

	fmt.Println("✅ Session created")

	// Проверяем доступ к бакету
	svc := s3.New(sess)
	_, err = svc.HeadBucket(&s3.HeadBucketInput{
		Bucket: aws.String(bucket),
	})

	if err != nil {
		log.Fatalf("❌ Cannot access bucket: %v", err)
	}

	fmt.Println("✅ Bucket is accessible")

	// Пробуем загрузить тестовый файл
	uploader := s3manager.NewUploader(sess)
	testContent := []byte("Hello from ZooPlatforma! This is a test file.")
	testKey := "test/hello.txt"

	fmt.Printf("\n📤 Uploading test file: %s\n", testKey)

	result, err := uploader.Upload(&s3manager.UploadInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(testKey),
		Body:        bytes.NewReader(testContent),
		ContentType: aws.String("text/plain"),
		ACL:         aws.String("public-read"),
	})

	if err != nil {
		log.Fatalf("❌ Upload failed: %v", err)
	}

	fmt.Printf("✅ File uploaded successfully!\n")
	fmt.Printf("   Location: %s\n", result.Location)

	// Проверяем CDN URL
	cdnURL := os.Getenv("S3_CDN_URL")
	if cdnURL != "" {
		fmt.Printf("   CDN URL: %s/%s\n", cdnURL, testKey)
	}

	// Пробуем удалить файл
	fmt.Printf("\n🗑️  Deleting test file...\n")
	_, err = svc.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(testKey),
	})

	if err != nil {
		log.Fatalf("❌ Delete failed: %v", err)
	}

	fmt.Println("✅ File deleted successfully!")
	fmt.Println("\n🎉 All S3 tests passed!")
}
