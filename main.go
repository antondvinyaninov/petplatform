package main

import (
	"gateway/petid"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// Загружаем .env файл
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  No .env file found, using environment variables")
	}

	// Проверяем обязательные переменные
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("❌ JWT_SECRET is required!")
	}

	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "80"
	}

	// Инициализируем базу данных
	if err := InitDB(); err != nil {
		log.Fatalf("❌ Failed to initialize database: %v", err)
	}
	defer CloseDB()

	// Инициализируем petid с подключением к БД
	petid.SetDB(db)

	// Инициализируем S3 хранилище
	if err := InitS3(); err != nil {
		log.Printf("⚠️  S3 initialization failed: %v", err)
		log.Println("📁 Falling back to local file storage")
	}

	// Инициализируем сервисы
	InitServices()

	// Настраиваем роутер
	router := SetupRouter()

	// Запускаем сервер
	log.Printf("🚀 API Gateway started on port %s", port)
	log.Printf("📝 Environment: %s", os.Getenv("ENVIRONMENT"))
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
