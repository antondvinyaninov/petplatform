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

	// Выполняем миграцию
	fmt.Println("\n📝 Выполняю миграцию: добавление геолокации к постам...")

	// 1. Добавляем колонки
	_, err = db.Exec(`
		ALTER TABLE posts 
		ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
		ADD COLUMN IF NOT EXISTS location_lon DECIMAL(11, 8),
		ADD COLUMN IF NOT EXISTS location_name VARCHAR(255)
	`)
	if err != nil {
		log.Fatal("❌ Ошибка добавления колонок:", err)
	}
	fmt.Println("✅ Колонки location_lat, location_lon, location_name добавлены")

	// 2. Создаём индекс
	_, err = db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_lat, location_lon)
	`)
	if err != nil {
		log.Fatal("❌ Ошибка создания индекса:", err)
	}
	fmt.Println("✅ Индекс idx_posts_location создан")

	// 3. Добавляем комментарии
	_, err = db.Exec(`
		COMMENT ON COLUMN posts.location_lat IS 'Широта местоположения (например, 55.7558)';
		COMMENT ON COLUMN posts.location_lon IS 'Долгота местоположения (например, 37.6173)';
		COMMENT ON COLUMN posts.location_name IS 'Название места (например, "Москва, Красная площадь")'
	`)
	if err != nil {
		// Комментарии не критичны, просто предупреждение
		fmt.Println("⚠️ Не удалось добавить комментарии:", err)
	} else {
		fmt.Println("✅ Комментарии к колонкам добавлены")
	}

	// Проверяем результат
	fmt.Println("\n📋 Проверяю структуру таблицы posts...")
	rows, err := db.Query(`
		SELECT column_name, data_type, is_nullable
		FROM information_schema.columns
		WHERE table_name = 'posts' AND column_name LIKE 'location%'
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Fatal("❌ Ошибка проверки:", err)
	}
	defer rows.Close()

	fmt.Println("\nНовые колонки:")
	for rows.Next() {
		var colName, dataType, nullable string
		if err := rows.Scan(&colName, &dataType, &nullable); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("  ✓ %s: %s (nullable: %s)\n", colName, dataType, nullable)
	}

	fmt.Println("\n🎉 Миграция выполнена успешно!")
}
