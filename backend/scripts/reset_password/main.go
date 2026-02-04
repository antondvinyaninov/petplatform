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
		fmt.Println("Usage: go run reset_password.go <email> <new_password>")
		os.Exit(1)
	}

	email := os.Args[1]
	newPassword := os.Args[2]

	// Подключаемся к БД
	dbURL := "postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable"
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Хешируем новый пароль
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Обновляем пароль
	result, err := db.Exec("UPDATE users SET password = $1 WHERE email = $2", string(hashedPassword), email)
	if err != nil {
		log.Fatalf("Failed to update password: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		fmt.Printf("❌ User with email %s not found\n", email)
		os.Exit(1)
	}

	fmt.Printf("✅ Password updated successfully for %s\n", email)
}
