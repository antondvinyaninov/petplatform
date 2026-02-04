package main

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env from backend directory
	if err := godotenv.Load("../../.env"); err != nil {
		fmt.Println("ERROR: .env file not found")
		os.Exit(1)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		fmt.Println("ERROR: DATABASE_URL not set in .env")
		os.Exit(1)
	}

	// Пытаемся подключиться
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		fmt.Printf("ERROR: Failed to open database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	// Проверяем подключение
	if err := db.Ping(); err != nil {
		fmt.Printf("ERROR: Failed to ping database: %v\n", err)
		os.Exit(1)
	}

	// Проверяем наличие критических таблиц
	tables := []string{"users", "chats", "messages"}
	for _, table := range tables {
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = $1
			)
		`, table).Scan(&exists)

		if err != nil {
			fmt.Printf("ERROR: Failed to check table '%s': %v\n", table, err)
			os.Exit(1)
		}

		if !exists {
			fmt.Printf("ERROR: Required table '%s' does not exist\n", table)
			os.Exit(1)
		}
	}

	// Все проверки пройдены
	fmt.Println("OK")
	os.Exit(0)
}
