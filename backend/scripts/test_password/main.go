package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: go run test_password.go <email> <password>")
		os.Exit(1)
	}

	email := os.Args[1]
	password := os.Args[2]

	// Подключаемся к БД
	dbURL := "postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable"
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Получаем хеш пароля из БД
	var storedHash string
	err = db.QueryRow("SELECT password FROM users WHERE email = $1", email).Scan(&storedHash)
	if err != nil {
		log.Fatalf("User not found: %v", err)
	}

	fmt.Printf("Email: %s\n", email)
	fmt.Printf("Stored hash: %s\n", storedHash)
	fmt.Printf("Password to check: %s\n", password)
	fmt.Printf("Hash length: %d\n", len(storedHash))

	// Проверяем пароль
	err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
	if err != nil {
		fmt.Printf("❌ Password does NOT match: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ Password matches!\n")
}
