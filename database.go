package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var db *sql.DB

func InitDB() error {
	// Получаем DATABASE_URL
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	var err error
	db, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Проверяем соединение
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL")

	// Создаем таблицы если их нет
	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	return nil
}

func createTables() error {
	// Создаем таблицу user_activity_logs если её нет
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS user_activity_logs (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
			action_type VARCHAR(100) NOT NULL,
			target_type VARCHAR(50),
			target_id INTEGER,
			metadata JSONB,
			ip_address VARCHAR(45),
			user_agent TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create user_activity_logs table: %w", err)
	}

	// Создаем таблицу error_logs если её нет
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS error_logs (
			id SERIAL PRIMARY KEY,
			service VARCHAR(100) NOT NULL,
			endpoint VARCHAR(255) NOT NULL,
			method VARCHAR(10) NOT NULL,
			error_message TEXT NOT NULL,
			user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
			ip_address VARCHAR(45),
			user_agent TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create error_logs table: %w", err)
	}

	// Создаем индексы для user_activity_logs
	userActivityIndexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON user_activity_logs(action_type)`,
		`CREATE INDEX IF NOT EXISTS idx_user_activity_metadata ON user_activity_logs USING gin(metadata)`,
	}

	for _, indexSQL := range userActivityIndexes {
		_, err := db.Exec(indexSQL)
		if err != nil {
			log.Printf("⚠️  Warning: failed to create user_activity index: %v", err)
		}
	}

	// Создаем индексы для error_logs
	errorLogsIndexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_error_logs_service ON error_logs(service)`,
	}

	for _, indexSQL := range errorLogsIndexes {
		_, err := db.Exec(indexSQL)
		if err != nil {
			log.Printf("⚠️  Warning: failed to create error_logs index: %v", err)
		}
	}

	log.Println("✅ Database tables ready (using existing schema)")
	return nil
}

func CloseDB() {
	if db != nil {
		db.Close()
	}
}
