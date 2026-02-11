package main

import (
	"log"
	"net/http"
)

// MigratePollsHandler выполняет миграцию для добавления is_anonymous
func MigratePollsHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("🔄 Running migration: add is_anonymous to polls")

	_, err := db.Exec(`
		ALTER TABLE polls 
		ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false
	`)

	if err != nil {
		log.Printf("❌ Migration failed: %v", err)
		respondError(w, "Migration failed", http.StatusInternalServerError)
		return
	}

	log.Println("✅ Migration completed successfully")

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Migration completed: is_anonymous column added to polls table",
	})
}
