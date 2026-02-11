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
	ID                int      `json:"id"`
	UserID            int      `json:"user_id"`
	Name              string   `json:"name"`
	Species           string   `json:"species"`
	SpeciesID         *int     `json:"species_id,omitempty"`
	Breed             *string  `json:"breed,omitempty"`
	BreedID           *int     `json:"breed_id,omitempty"`
	Gender            *string  `json:"gender,omitempty"`
	BirthDate         *string  `json:"birth_date,omitempty"`
	AgeType           *string  `json:"age_type,omitempty"`
	ApproximateYears  *int     `json:"approximate_years,omitempty"`
	ApproximateMonths *int     `json:"approximate_months,omitempty"`
	Age               *int     `json:"age,omitempty"`
	Weight            *float64 `json:"weight,omitempty"`
	Color             *string  `json:"color,omitempty"`
	Fur               *string  `json:"fur,omitempty"`
	Ears              *string  `json:"ears,omitempty"`
	Tail              *string  `json:"tail,omitempty"`
	Size              *string  `json:"size,omitempty"`
	SpecialMarks      *string  `json:"special_marks,omitempty"`
	PhotoURL          *string  `json:"photo_url,omitempty"`
	Photo             *string  `json:"photo,omitempty"`
	Description       *string  `json:"description,omitempty"`
	Relationship      *string  `json:"relationship,omitempty"`
	Microchip         *string  `json:"microchip,omitempty"`
	ChipNumber        *string  `json:"chip_number,omitempty"`
	TagNumber         *string  `json:"tag_number,omitempty"`
	BrandNumber       *string  `json:"brand_number,omitempty"`
	MarkingDate       *string  `json:"marking_date,omitempty"`
	SterilizationDate *string  `json:"sterilization_date,omitempty"`
	LocationType      *string  `json:"location_type,omitempty"`
	LocationAddress   *string  `json:"location_address,omitempty"`
	LocationCage      *string  `json:"location_cage,omitempty"`
	LocationContact   *string  `json:"location_contact,omitempty"`
	LocationPhone     *string  `json:"location_phone,omitempty"`
	LocationNotes     *string  `json:"location_notes,omitempty"`
	Location          *string  `json:"location,omitempty"`
	HealthNotes       *string  `json:"health_notes,omitempty"`
	CuratorID         *int     `json:"curator_id,omitempty"`
	CreatedAt         *string  `json:"created_at,omitempty"`
	UpdatedAt         *string  `json:"updated_at,omitempty"`
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
	log.Printf("🔍 [Posts] Checking for pets data in response for %s", r.URL.Path)

	if data, ok := response["data"]; ok {
		switch posts := data.(type) {
		case []interface{}:
			// Массив постов
			log.Printf("📦 [Posts] Found array of %d posts", len(posts))
			loadPetsForPosts(posts)
		case map[string]interface{}:
			// Один пост
			log.Printf("📦 [Posts] Found single post")
			loadPetsForPost(posts)
		default:
			log.Printf("⚠️  [Posts] Unknown data type: %T", data)
		}
	} else {
		// Возможно посты в корне ответа (без data)
		if posts, ok := response["posts"].([]interface{}); ok {
			log.Printf("📦 [Posts] Found posts array in root: %d posts", len(posts))
			loadPetsForPosts(posts)
		} else if _, ok := response["id"]; ok {
			// Это может быть один пост в корне
			log.Printf("📦 [Posts] Found single post in root")
			loadPetsForPost(response)
		} else {
			log.Printf("⚠️  [Posts] No data or posts field found in response")
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
	postID := post["id"]

	// Проверяем есть ли attached_pets
	attachedPets, ok := post["attached_pets"]
	if !ok || attachedPets == nil {
		log.Printf("🔍 [Posts] Post %v: no attached_pets field", postID)
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
		log.Printf("🔍 [Posts] Post %v: attached_pets is empty", postID)
		return
	}

	log.Printf("🔍 [Posts] Post %v: loading %d pets: %v", postID, len(petIDs), petIDs)

	// Загружаем данные питомцев из БД
	pets := loadPetsByIDs(petIDs)
	if len(pets) > 0 {
		post["pets"] = pets
		log.Printf("✅ [Posts] Post %v: loaded %d pets successfully", postID, len(pets))
	} else {
		log.Printf("⚠️  [Posts] Post %v: failed to load pets", postID)
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
			p.user_id,
			p.name,
			COALESCE(s.name, p.species, '') as species,
			p.species_id,
			COALESCE(b.name, p.breed) as breed,
			p.breed_id,
			p.gender,
			p.birth_date,
			p.age_type,
			p.approximate_years,
			p.approximate_months,
			p.age,
			p.weight,
			p.color,
			p.fur,
			p.ears,
			p.tail,
			p.size,
			p.special_marks,
			p.photo_url,
			p.photo,
			p.description,
			p.relationship,
			p.microchip,
			p.chip_number,
			p.tag_number,
			p.brand_number,
			p.marking_date,
			p.sterilization_date,
			p.location_type,
			p.location_address,
			p.location_cage,
			p.location_contact,
			p.location_phone,
			p.location_notes,
			p.location,
			p.health_notes,
			p.curator_id,
			p.created_at,
			p.updated_at
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
		var breed, gender, birthDate, ageType, color, fur, ears, tail, size, specialMarks sql.NullString
		var photoURL, photo, description, relationship, microchip, chipNumber, tagNumber, brandNumber sql.NullString
		var markingDate, sterilizationDate, locationType, locationAddress, locationCage sql.NullString
		var locationContact, locationPhone, locationNotes, location, healthNotes sql.NullString
		var speciesID, breedID, approximateYears, approximateMonths, age, curatorID sql.NullInt64
		var weight sql.NullFloat64
		var createdAt, updatedAt sql.NullTime

		err := rows.Scan(
			&pet.ID,
			&pet.UserID,
			&pet.Name,
			&pet.Species,
			&speciesID,
			&breed,
			&breedID,
			&gender,
			&birthDate,
			&ageType,
			&approximateYears,
			&approximateMonths,
			&age,
			&weight,
			&color,
			&fur,
			&ears,
			&tail,
			&size,
			&specialMarks,
			&photoURL,
			&photo,
			&description,
			&relationship,
			&microchip,
			&chipNumber,
			&tagNumber,
			&brandNumber,
			&markingDate,
			&sterilizationDate,
			&locationType,
			&locationAddress,
			&locationCage,
			&locationContact,
			&locationPhone,
			&locationNotes,
			&location,
			&healthNotes,
			&curatorID,
			&createdAt,
			&updatedAt,
		)

		if err != nil {
			log.Printf("⚠️  [Posts] Failed to scan pet: %v", err)
			continue
		}

		// Заполняем nullable поля
		if speciesID.Valid {
			id := int(speciesID.Int64)
			pet.SpeciesID = &id
		}
		if breedID.Valid {
			id := int(breedID.Int64)
			pet.BreedID = &id
		}
		if breed.Valid {
			pet.Breed = &breed.String
		}
		if gender.Valid {
			pet.Gender = &gender.String
		}
		if birthDate.Valid {
			str := birthDate.String
			pet.BirthDate = &str
		}
		if ageType.Valid {
			pet.AgeType = &ageType.String
		}
		if approximateYears.Valid {
			years := int(approximateYears.Int64)
			pet.ApproximateYears = &years
		}
		if approximateMonths.Valid {
			months := int(approximateMonths.Int64)
			pet.ApproximateMonths = &months
		}
		if age.Valid {
			ageVal := int(age.Int64)
			pet.Age = &ageVal
		}
		if weight.Valid {
			pet.Weight = &weight.Float64
		}
		if color.Valid {
			pet.Color = &color.String
		}
		if fur.Valid {
			pet.Fur = &fur.String
		}
		if ears.Valid {
			pet.Ears = &ears.String
		}
		if tail.Valid {
			pet.Tail = &tail.String
		}
		if size.Valid {
			pet.Size = &size.String
		}
		if specialMarks.Valid {
			pet.SpecialMarks = &specialMarks.String
		}
		if photoURL.Valid {
			pet.PhotoURL = &photoURL.String
		}
		if photo.Valid {
			pet.Photo = &photo.String
		}
		if description.Valid {
			pet.Description = &description.String
		}
		if relationship.Valid {
			pet.Relationship = &relationship.String
		}
		if microchip.Valid {
			pet.Microchip = &microchip.String
		}
		if chipNumber.Valid {
			pet.ChipNumber = &chipNumber.String
		}
		if tagNumber.Valid {
			pet.TagNumber = &tagNumber.String
		}
		if brandNumber.Valid {
			pet.BrandNumber = &brandNumber.String
		}
		if markingDate.Valid {
			str := markingDate.String
			pet.MarkingDate = &str
		}
		if sterilizationDate.Valid {
			str := sterilizationDate.String
			pet.SterilizationDate = &str
		}
		if locationType.Valid {
			pet.LocationType = &locationType.String
		}
		if locationAddress.Valid {
			pet.LocationAddress = &locationAddress.String
		}
		if locationCage.Valid {
			pet.LocationCage = &locationCage.String
		}
		if locationContact.Valid {
			pet.LocationContact = &locationContact.String
		}
		if locationPhone.Valid {
			pet.LocationPhone = &locationPhone.String
		}
		if locationNotes.Valid {
			pet.LocationNotes = &locationNotes.String
		}
		if location.Valid {
			pet.Location = &location.String
		}
		if healthNotes.Valid {
			pet.HealthNotes = &healthNotes.String
		}
		if curatorID.Valid {
			id := int(curatorID.Int64)
			pet.CuratorID = &id
		}
		if createdAt.Valid {
			str := createdAt.Time.Format(time.RFC3339)
			pet.CreatedAt = &str
		}
		if updatedAt.Valid {
			str := updatedAt.Time.Format(time.RFC3339)
			pet.UpdatedAt = &str
		}

		pets = append(pets, pet)
	}

	return pets
}
