package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// Pet представляет питомца в посте
type Pet struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Species     string  `json:"species"`
	Breed       *string `json:"breed,omitempty"`
	Gender      *string `json:"gender,omitempty"`
	PhotoURL    *string `json:"photo_url,omitempty"`
	BirthDate   *string `json:"birth_date,omitempty"`
	Description *string `json:"description,omitempty"`
}

// PostsProxyHandler проксирует запросы к постам и добавляет данные питомцев
func PostsProxyHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	// Формируем URL для backend
	targetURL := mainService.URL + r.URL.Path
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	log.Printf("🔄 [Posts] Proxying: %s %s → %s", r.Method, r.URL.Path, targetURL)

	// Создаем новый запрос
	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		log.Printf("❌ [Posts] Failed to create proxy request: %v", err)
		respondError(w, "Failed to proxy request", http.StatusInternalServerError)
		return
	}

	// Копируем заголовки
	for key, values := range r.Header {
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}

	// Добавляем X-Forwarded-* заголовки
	proxyReq.Header.Set("X-Forwarded-For", r.RemoteAddr)
	proxyReq.Header.Set("X-Forwarded-Proto", "http")
	proxyReq.Header.Set("X-Forwarded-Host", r.Host)

	// Выполняем запрос
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(proxyReq)
	if err != nil {
		log.Printf("❌ [Posts] Failed to proxy: %v", err)
		respondError(w, "Service unavailable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Читаем ответ
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("❌ [Posts] Failed to read response: %v", err)
		respondError(w, "Failed to read response", http.StatusInternalServerError)
		return
	}

	// Если это не успешный ответ или не JSON, просто возвращаем как есть
	contentType := resp.Header.Get("Content-Type")
	if resp.StatusCode != http.StatusOK || !strings.Contains(contentType, "application/json") {
		for key, values := range resp.Header {
			if strings.HasPrefix(key, "Access-Control-") {
				continue
			}
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	// Парсим JSON ответ
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		log.Printf("⚠️  [Posts] Failed to parse JSON, returning as is: %v", err)
		for key, values := range resp.Header {
			if strings.HasPrefix(key, "Access-Control-") {
				continue
			}
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	// Загружаем данные питомцев для постов
	if data, ok := response["data"]; ok {
		switch posts := data.(type) {
		case []interface{}:
			// Массив постов
			loadPetsForPosts(posts)
		case map[string]interface{}:
			// Один пост
			loadPetsForPost(posts)
		}
	}

	// Копируем заголовки ответа (фильтруем CORS)
	for key, values := range resp.Header {
		if strings.HasPrefix(key, "Access-Control-") {
			continue
		}
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Возвращаем модифицированный ответ
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	json.NewEncoder(w).Encode(response)

	duration := time.Since(start)
	log.Printf("✅ [Posts] Proxied with pets loading: %s %s → %d (took %dms)",
		r.Method, r.URL.Path, resp.StatusCode, duration.Milliseconds())
}

// loadPetsForPosts загружает данные питомцев для массива постов
func loadPetsForPosts(posts []interface{}) {
	for _, postInterface := range posts {
		if post, ok := postInterface.(map[string]interface{}); ok {
			loadPetsForPost(post)
		}
	}
}

// loadPetsForPost загружает данные питомцев для одного поста
func loadPetsForPost(post map[string]interface{}) {
	// Проверяем есть ли attached_pets
	attachedPets, ok := post["attached_pets"]
	if !ok || attachedPets == nil {
		return
	}

	// Преобразуем в массив ID
	var petIDs []int
	switch pets := attachedPets.(type) {
	case []interface{}:
		for _, petID := range pets {
			switch id := petID.(type) {
			case float64:
				petIDs = append(petIDs, int(id))
			case int:
				petIDs = append(petIDs, id)
			}
		}
	}

	if len(petIDs) == 0 {
		return
	}

	// Загружаем данные питомцев из БД
	pets := loadPetsByIDs(petIDs)
	if len(pets) > 0 {
		post["pets"] = pets
		log.Printf("📦 [Posts] Loaded %d pets for post %v", len(pets), post["id"])
	}
}

// loadPetsByIDs загружает данные питомцев по их ID
func loadPetsByIDs(petIDs []int) []Pet {
	if len(petIDs) == 0 {
		return nil
	}

	// Создаем плейсхолдеры для SQL запроса
	placeholders := make([]string, len(petIDs))
	args := make([]interface{}, len(petIDs))
	for i, id := range petIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT 
			p.id,
			p.name,
			COALESCE(s.name, p.species, '') as species,
			COALESCE(b.name, p.breed) as breed,
			p.gender,
			p.photo_url,
			p.birth_date,
			p.description
		FROM pets p
		LEFT JOIN species s ON p.species_id = s.id
		LEFT JOIN breeds b ON p.breed_id = b.id
		WHERE p.id IN (%s)
	`, strings.Join(placeholders, ","))

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ [Posts] Failed to load pets: %v", err)
		return nil
	}
	defer rows.Close()

	var pets []Pet
	for rows.Next() {
		var pet Pet
		var breed, gender, photoURL, birthDate, description sql.NullString

		err := rows.Scan(
			&pet.ID,
			&pet.Name,
			&pet.Species,
			&breed,
			&gender,
			&photoURL,
			&birthDate,
			&description,
		)

		if err != nil {
			log.Printf("⚠️  [Posts] Failed to scan pet: %v", err)
			continue
		}

		if breed.Valid {
			pet.Breed = &breed.String
		}
		if gender.Valid {
			pet.Gender = &gender.String
		}
		if photoURL.Valid {
			pet.PhotoURL = &photoURL.String
		}
		if birthDate.Valid {
			pet.BirthDate = &birthDate.String
		}
		if description.Valid {
			pet.Description = &description.String
		}

		pets = append(pets, pet)
	}

	return pets
}
