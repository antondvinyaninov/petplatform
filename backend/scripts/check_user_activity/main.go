package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// Подключаемся к PostgreSQL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://zp:lmLG7k2ed4vas19@88.218.121.213:5432/zp-db?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("❌ Ошибка подключения к БД:", err)
	}
	defer db.Close()

	// Проверяем подключение
	if err := db.Ping(); err != nil {
		log.Fatal("❌ Не удалось подключиться к БД:", err)
	}
	fmt.Println("✅ Подключение к PostgreSQL успешно!")

	// Проверяем существование таблицы user_activity
	var exists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'user_activity'
		)
	`).Scan(&exists)

	if err != nil {
		log.Fatal("❌ Ошибка проверки таблицы:", err)
	}

	if !exists {
		fmt.Println("❌ Таблица user_activity НЕ существует!")
		fmt.Println("\n📝 Нужно создать таблицу:")
		fmt.Println(`
CREATE TABLE user_activity (
    user_id INTEGER PRIMARY KEY,
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_activity_last_seen ON user_activity(last_seen);
		`)
		return
	}

	fmt.Println("✅ Таблица user_activity существует!")

	// Получаем структуру таблицы
	rows, err := db.Query(`
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_name = 'user_activity'
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Fatal("❌ Ошибка получения структуры:", err)
	}
	defer rows.Close()

	fmt.Println("\n📋 Структура таблицы user_activity:")
	for rows.Next() {
		var colName, dataType, nullable string
		if err := rows.Scan(&colName, &dataType, &nullable); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("  - %s: %s (nullable: %s)\n", colName, dataType, nullable)
	}

	// Проверяем данные
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM user_activity").Scan(&count)
	if err != nil {
		log.Fatal("❌ Ошибка подсчета записей:", err)
	}

	fmt.Printf("\n📊 Записей в таблице: %d\n", count)

	if count > 0 {
		fmt.Println("\n📝 Последние 5 записей:")
		rows, err := db.Query(`
			SELECT user_id, last_seen, ip_address
			FROM user_activity
			ORDER BY last_seen DESC
			LIMIT 5
		`)
		if err != nil {
			log.Fatal("❌ Ошибка получения данных:", err)
		}
		defer rows.Close()

		for rows.Next() {
			var userID int
			var lastSeen string
			var ipAddress sql.NullString
			if err := rows.Scan(&userID, &lastSeen, &ipAddress); err != nil {
				log.Fatal(err)
			}
			ip := "NULL"
			if ipAddress.Valid {
				ip = ipAddress.String
			}
			fmt.Printf("  User %d: %s (IP: %s)\n", userID, lastSeen, ip)
		}
	}
}
