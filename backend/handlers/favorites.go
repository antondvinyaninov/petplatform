package handlers

import (
	"backend/db"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Favorite структура избранного
type Favorite struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	PetID     int    `json:"pet_id"`
	CreatedAt string `json:"created_at"`
}

// FavoritesHandler обрабатывает GET /api/favorites (список избранных)
// и POST /api/favorites (добавление в избранное)
func FavoritesHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		getFavorites(w, r, userID)
	case http.MethodPost:
		addFavorite(w, r, userID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// FavoriteDetailHandler обрабатывает DELETE /api/favorites/:id
func FavoriteDetailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Извлекаем ID из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/favorites/")
	petID, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid pet ID", http.StatusBadRequest)
		return
	}

	removeFavorite(w, r, userID, petID)
}

// getFavorites получает список избранных питомцев пользователя
func getFavorites(w http.ResponseWriter, _ *http.Request, userID int) {
	query := ConvertPlaceholders(`
		SELECT f.id, f.user_id, f.pet_id, f.created_at
		FROM favorites f
		WHERE f.user_id = ?
		ORDER BY f.created_at DESC
	`)

	rows, err := db.DB.Query(query, userID)
	if err != nil {
		log.Printf("Error querying favorites: %v", err)
		http.Error(w, "Failed to fetch favorites", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var favorites []Favorite
	for rows.Next() {
		var fav Favorite
		err := rows.Scan(&fav.ID, &fav.UserID, &fav.PetID, &fav.CreatedAt)
		if err != nil {
			log.Printf("Error scanning favorite: %v", err)
			continue
		}
		favorites = append(favorites, fav)
	}

	if favorites == nil {
		favorites = []Favorite{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    favorites,
	})
}

// addFavorite добавляет питомца в избранное
func addFavorite(w http.ResponseWriter, r *http.Request, userID int) {
	var req struct {
		PetID int `json:"pet_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PetID == 0 {
		http.Error(w, "Pet ID is required", http.StatusBadRequest)
		return
	}

	// Проверяем, что питомец существует
	var petExists bool
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT EXISTS(SELECT 1 FROM pets WHERE id = ?)"), req.PetID).Scan(&petExists)
	if err != nil || !petExists {
		http.Error(w, "Pet not found", http.StatusNotFound)
		return
	}

	// Добавляем в избранное (UNIQUE constraint предотвратит дубликаты)
	query := ConvertPlaceholders(`
		INSERT INTO favorites (user_id, pet_id, created_at)
		VALUES (?, ?, CURRENT_TIMESTAMP) RETURNING id
	`)

	var favoriteID int64
	err = db.DB.QueryRow(query, userID, req.PetID).Scan(&favoriteID)

	if err != nil {
		// Проверяем, не является ли это ошибкой дубликата
		if strings.Contains(err.Error(), "UNIQUE constraint failed") || strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "Pet already in favorites", http.StatusConflict)
			return
		}
		log.Printf("Error adding favorite: %v", err)
		http.Error(w, "Failed to add favorite", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"id":      favoriteID,
			"user_id": userID,
			"pet_id":  req.PetID,
		},
	})
}

// removeFavorite удаляет питомца из избранного
func removeFavorite(w http.ResponseWriter, _ *http.Request, userID int, petID int) {
	result, err := db.DB.Exec(ConvertPlaceholders(`
		DELETE FROM favorites
		WHERE user_id = ? AND pet_id = ?
	`), userID, petID)

	if err != nil {
		log.Printf("Error removing favorite: %v", err)
		http.Error(w, "Failed to remove favorite", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Favorite not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Favorite removed successfully",
	})
}
