package handlers

import (
	"backend/db"
	"backend/models"
	"encoding/json"
	"log"
	"net/http"
)

// SitemapUser - упрощенная структура пользователя для sitemap
type SitemapUser struct {
	ID        int    `json:"id"`
	UpdatedAt string `json:"updated_at"`
}

// SitemapPost - упрощенная структура поста для sitemap
type SitemapPost struct {
	ID        int    `json:"id"`
	UpdatedAt string `json:"updated_at"`
}

// GetSitemapUsersHandler - возвращает список всех пользователей для sitemap (публичный endpoint)
func GetSitemapUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем всех пользователей (только ID и created_at)
	rows, err := db.DB.Query(`
		SELECT id, created_at
		FROM users
		ORDER BY id
	`)
	if err != nil {
		log.Printf("❌ Error fetching users for sitemap: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := make([]SitemapUser, 0)
	for rows.Next() {
		var user SitemapUser
		if err := rows.Scan(&user.ID, &user.UpdatedAt); err != nil {
			log.Printf("❌ Error scanning user: %v", err)
			continue
		}
		users = append(users, user)
	}

	log.Printf("✅ Sitemap: returning %d users", len(users))

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.Response{
		Success: true,
		Data:    users,
	}); err != nil {
		log.Printf("❌ Error encoding response: %v", err)
	}
}

// GetSitemapPostsHandler - возвращает список всех постов для sitemap
func GetSitemapPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем все посты (только ID и created_at)
	rows, err := db.DB.Query(`
		SELECT id, created_at
		FROM posts
		ORDER BY id
	`)
	if err != nil {
		log.Printf("❌ Error fetching posts for sitemap: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	posts := make([]SitemapPost, 0)
	for rows.Next() {
		var post SitemapPost
		if err := rows.Scan(&post.ID, &post.UpdatedAt); err != nil {
			log.Printf("❌ Error scanning post: %v", err)
			continue
		}
		posts = append(posts, post)
	}

	log.Printf("✅ Sitemap: returning %d posts", len(posts))

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(models.Response{
		Success: true,
		Data:    posts,
	}); err != nil {
		log.Printf("❌ Error encoding response: %v", err)
	}
}
