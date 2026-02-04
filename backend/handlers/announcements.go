package handlers

import (
	"backend/models"
	"backend/db"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// AnnouncementsHandler - список объявлений
func AnnouncementsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		handleGetAnnouncements(w, r)
	case http.MethodPost:
		handleCreateAnnouncement(w, r)
	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// AnnouncementHandler - конкретное объявление
func AnnouncementHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := extractID(r.URL.Path)
	if id == 0 {
		sendError(w, "Invalid announcement ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		handleGetAnnouncement(w, r, id)
	case http.MethodPut:
		handleUpdateAnnouncement(w, r, id)
	case http.MethodDelete:
		handleDeleteAnnouncement(w, r, id)
	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleGetAnnouncements - получить список объявлений с фильтрами
func handleGetAnnouncements(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, pet_id, type, title, description, author_id,
		       contact_person_id, contact_person_name, contact_person_phone,
		       location_city, location_address, location_coordinates,
		       event_date, event_time,
		       lost_last_seen_location, lost_distinctive_features, lost_reward_amount,
		       found_current_location, found_condition,
		       fundraising_goal_amount, fundraising_current_amount, fundraising_purpose,
		       fundraising_deadline, fundraising_bank_details,
		       status, status_reason, is_published, views_count,
		       created_at, updated_at, closed_at
		FROM pet_announcements
		WHERE is_published = 1 AND status = 'active'
	`

	// Фильтры
	params := []interface{}{}

	// Фильтр по типу
	if announcementType := r.URL.Query().Get("type"); announcementType != "" {
		query += " AND type = ?"
		params = append(params, announcementType)
	}

	// Фильтр по городу
	if city := r.URL.Query().Get("city"); city != "" {
		query += " AND location_city = ?"
		params = append(params, city)
	}

	// Фильтр по автору
	if authorID := r.URL.Query().Get("author_id"); authorID != "" {
		query += " AND author_id = ?"
		params = append(params, authorID)
	}

	query += " ORDER BY created_at DESC"

	rows, err := db.DB.Query(query, params...)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	announcements := []models.PetAnnouncement{}
	for rows.Next() {
		var a models.PetAnnouncement
		err := rows.Scan(
			&a.ID, &a.PetID, &a.Type, &a.Title, &a.Description, &a.AuthorID,
			&a.ContactPersonID, &a.ContactPersonName, &a.ContactPersonPhone,
			&a.LocationCity, &a.LocationAddress, &a.LocationCoordinates,
			&a.EventDate, &a.EventTime,
			&a.LostLastSeenLocation, &a.LostDistinctiveFeatures, &a.LostRewardAmount,
			&a.FoundCurrentLocation, &a.FoundCondition,
			&a.FundraisingGoalAmount, &a.FundraisingCurrentAmount, &a.FundraisingPurpose,
			&a.FundraisingDeadline, &a.FundraisingBankDetails,
			&a.Status, &a.StatusReason, &a.IsPublished, &a.ViewsCount,
			&a.CreatedAt, &a.UpdatedAt, &a.ClosedAt,
		)
		if err != nil {
			sendError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		announcements = append(announcements, a)
	}

	sendSuccess(w, announcements)
}

// handleGetAnnouncement - получить конкретное объявление со всеми данными
func handleGetAnnouncement(w http.ResponseWriter, _ *http.Request, id int) {
	var a models.PetAnnouncement

	query := `
		SELECT id, pet_id, type, title, description, author_id,
		       contact_person_id, contact_person_name, contact_person_phone,
		       location_city, location_address, location_coordinates,
		       event_date, event_time,
		       lost_last_seen_location, lost_distinctive_features, lost_reward_amount,
		       found_current_location, found_condition,
		       fundraising_goal_amount, fundraising_current_amount, fundraising_purpose,
		       fundraising_deadline, fundraising_bank_details,
		       status, status_reason, is_published, views_count,
		       created_at, updated_at, closed_at
		FROM pet_announcements
		WHERE id = ?
	`

	err := db.DB.QueryRow(query, id).Scan(
		&a.ID, &a.PetID, &a.Type, &a.Title, &a.Description, &a.AuthorID,
		&a.ContactPersonID, &a.ContactPersonName, &a.ContactPersonPhone,
		&a.LocationCity, &a.LocationAddress, &a.LocationCoordinates,
		&a.EventDate, &a.EventTime,
		&a.LostLastSeenLocation, &a.LostDistinctiveFeatures, &a.LostRewardAmount,
		&a.FoundCurrentLocation, &a.FoundCondition,
		&a.FundraisingGoalAmount, &a.FundraisingCurrentAmount, &a.FundraisingPurpose,
		&a.FundraisingDeadline, &a.FundraisingBankDetails,
		&a.Status, &a.StatusReason, &a.IsPublished, &a.ViewsCount,
		&a.CreatedAt, &a.UpdatedAt, &a.ClosedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			sendError(w, "Announcement not found", http.StatusNotFound)
		} else {
			sendError(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	// Увеличиваем счетчик просмотров
	db.DB.Exec(ConvertPlaceholders("UPDATE pet_announcements SET views_count = views_count + 1 WHERE id = ?"), id)

	// Загружаем связанные данные
	loadAnnouncementRelations(&a)

	sendSuccess(w, a)
}

// handleCreateAnnouncement - создать объявление
func handleCreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(int)

	var req models.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.PetID == 0 || req.Type == "" || req.Title == "" || req.Description == "" {
		sendError(w, "pet_id, type, title and description are required", http.StatusBadRequest)
		return
	}

	// Проверяем тип
	validTypes := map[string]bool{
		"looking_for_home": true,
		"found":            true,
		"lost":             true,
		"fundraising":      true,
	}
	if !validTypes[req.Type] {
		sendError(w, "Invalid announcement type", http.StatusBadRequest)
		return
	}

	// Парсим дату события
	var eventDate *time.Time
	if req.EventDate != nil && *req.EventDate != "" {
		parsed, err := time.Parse("2006-01-02", *req.EventDate)
		if err == nil {
			eventDate = &parsed
		}
	}

	// Парсим дедлайн сбора
	var fundraisingDeadline *time.Time
	if req.FundraisingDeadline != nil && *req.FundraisingDeadline != "" {
		parsed, err := time.Parse("2006-01-02", *req.FundraisingDeadline)
		if err == nil {
			fundraisingDeadline = &parsed
		}
	}

	query := ConvertPlaceholders(`
		INSERT INTO pet_announcements (
			pet_id, type, title, description, author_id,
			contact_person_id, contact_person_name, contact_person_phone,
			location_city, location_address, location_coordinates,
			event_date, event_time,
			lost_last_seen_location, lost_distinctive_features, lost_reward_amount,
			found_current_location, found_condition,
			fundraising_goal_amount, fundraising_purpose, fundraising_deadline, fundraising_bank_details
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
	`)

	var id int64
	err := db.DB.QueryRow(query,
		req.PetID, req.Type, req.Title, req.Description, userID,
		req.ContactPersonID, req.ContactPersonName, req.ContactPersonPhone,
		req.LocationCity, req.LocationAddress, req.LocationCoordinates,
		eventDate, req.EventTime,
		req.LostLastSeenLocation, req.LostDistinctiveFeatures, req.LostRewardAmount,
		req.FoundCurrentLocation, req.FoundCondition,
		req.FundraisingGoalAmount, req.FundraisingPurpose, fundraisingDeadline, req.FundraisingBankDetails,
	).Scan(&id)

	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]interface{}{"id": id, "message": "Announcement created successfully"})
}

// handleUpdateAnnouncement - обновить объявление
func handleUpdateAnnouncement(w http.ResponseWriter, r *http.Request, id int) {
	userID := r.Context().Value("userID").(int)

	// Проверяем права доступа
	var authorID int
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT author_id FROM pet_announcements WHERE id = ?"), id).Scan(&authorID)
	if err != nil {
		sendError(w, "Announcement not found", http.StatusNotFound)
		return
	}

	if authorID != userID {
		sendError(w, "Access denied", http.StatusForbidden)
		return
	}

	var req models.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Обновляем только переданные поля
	query := `
		UPDATE pet_announcements SET
			title = ?, description = ?,
			contact_person_id = ?, contact_person_name = ?, contact_person_phone = ?,
			location_city = ?, location_address = ?, location_coordinates = ?
		WHERE id = ?
	`

	_, err = db.DB.Exec(query,
		req.Title, req.Description,
		req.ContactPersonID, req.ContactPersonName, req.ContactPersonPhone,
		req.LocationCity, req.LocationAddress, req.LocationCoordinates,
		id,
	)

	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]string{"message": "Announcement updated successfully"})
}

// handleDeleteAnnouncement - удалить объявление
func handleDeleteAnnouncement(w http.ResponseWriter, r *http.Request, id int) {
	userID := r.Context().Value("userID").(int)

	// Проверяем права доступа
	var authorID int
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT author_id FROM pet_announcements WHERE id = ?"), id).Scan(&authorID)
	if err != nil {
		sendError(w, "Announcement not found", http.StatusNotFound)
		return
	}

	if authorID != userID {
		sendError(w, "Access denied", http.StatusForbidden)
		return
	}

	_, err = db.DB.Exec(ConvertPlaceholders("DELETE FROM pet_announcements WHERE id = ?"), id)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]string{"message": "Announcement deleted successfully"})
}

// loadAnnouncementRelations - загрузить связанные данные
func loadAnnouncementRelations(a *models.PetAnnouncement) {
	// Загружаем автора
	var author models.User
	var lastName, avatar sql.NullString

	err := db.DB.QueryRow(ConvertPlaceholders("SELECT id, name, last_name, email, avatar FROM users WHERE id = ?"), a.AuthorID).
		Scan(&author.ID, &author.Name, &lastName, &author.Email, &avatar)
	if err == nil {
		if lastName.Valid {
			author.LastName = lastName.String
		}
		if avatar.Valid {
			author.Avatar = avatar.String
		}
		a.Author = &author
	}

	// Загружаем контактное лицо
	if a.ContactPersonID != nil {
		var contact models.User
		var contactLastName, contactAvatar sql.NullString

		err := db.DB.QueryRow(ConvertPlaceholders("SELECT id, name, last_name, email, avatar FROM users WHERE id = ?"), *a.ContactPersonID).
			Scan(&contact.ID, &contact.Name, &contactLastName, &contact.Email, &contactAvatar)
		if err == nil {
			if contactLastName.Valid {
				contact.LastName = contactLastName.String
			}
			if contactAvatar.Valid {
				contact.Avatar = contactAvatar.String
			}
			a.ContactPerson = &contact
		}
	}

	// Загружаем питомца
	var pet models.PetDetail
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT id, user_id, name, species, breed, gender, birth_date, color, photo, photos, created_at
		FROM pets WHERE id = ?
	`), a.PetID).Scan(
		&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Breed, &pet.Gender,
		&pet.BirthDate, &pet.Color, &pet.Photo, &pet.Photos, &pet.CreatedAt,
	)
	if err == nil {
		a.Pet = &pet
	}

	// Загружаем публикации
	rows, err := db.DB.Query(ConvertPlaceholders(`
		SELECT id, announcement_id, author_id, post_type, content, media_urls, donation_amount, created_at
		FROM announcement_posts
		WHERE announcement_id = ?
		ORDER BY created_at DESC
	`), a.ID)
	if err == nil {
		defer rows.Close()
		posts := []models.AnnouncementPost{}
		for rows.Next() {
			var post models.AnnouncementPost
			rows.Scan(&post.ID, &post.AnnouncementID, &post.AuthorID, &post.PostType,
				&post.Content, &post.MediaURLs, &post.DonationAmount, &post.CreatedAt)
			posts = append(posts, post)
		}
		a.Posts = posts
	}

	// Загружаем пожертвования (для сборов)
	if a.Type == "fundraising" {
		rows, err := db.DB.Query(ConvertPlaceholders(`
			SELECT id, announcement_id, donor_id, donor_name, amount, message, is_anonymous, created_at
			FROM announcement_donations
			WHERE announcement_id = ?
			ORDER BY created_at DESC
		`), a.ID)
		if err == nil {
			defer rows.Close()
			donations := []models.AnnouncementDonation{}
			for rows.Next() {
				var donation models.AnnouncementDonation
				rows.Scan(&donation.ID, &donation.AnnouncementID, &donation.DonorID,
					&donation.DonorName, &donation.Amount, &donation.Message,
					&donation.IsAnonymous, &donation.CreatedAt)
				donations = append(donations, donation)
			}
			a.Donations = donations
		}
	}
}

// AnnouncementPostsHandler - публикации к объявлению
func AnnouncementPostsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Извлекаем ID объявления из URL
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		sendError(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	announcementID, err := strconv.Atoi(parts[3])
	if err != nil {
		sendError(w, "Invalid announcement ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPost:
		handleCreateAnnouncementPost(w, r, announcementID)
	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleCreateAnnouncementPost - создать публикацию к объявлению
func handleCreateAnnouncementPost(w http.ResponseWriter, r *http.Request, announcementID int) {
	userID := r.Context().Value("userID").(int)

	var req models.CreateAnnouncementPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.PostType == "" || req.Content == "" {
		sendError(w, "post_type and content are required", http.StatusBadRequest)
		return
	}

	// Конвертируем массив URL в JSON
	var mediaURLsJSON *string
	if len(req.MediaURLs) > 0 {
		jsonBytes, _ := json.Marshal(req.MediaURLs)
		jsonStr := string(jsonBytes)
		mediaURLsJSON = &jsonStr
	}

	query := ConvertPlaceholders(`
		INSERT INTO announcement_posts (announcement_id, author_id, post_type, content, media_urls, donation_amount)
		VALUES (?, ?, ?, ?, ?, ?) RETURNING id
	`)

	var id int64
	var err error
	err = db.DB.QueryRow(query, announcementID, userID, req.PostType, req.Content, mediaURLsJSON, req.DonationAmount).Scan(&id)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]interface{}{"id": id, "message": "Post created successfully"})
}

// AnnouncementDonationsHandler - пожертвования к объявлению
func AnnouncementDonationsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Извлекаем ID объявления из URL
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 {
		sendError(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	announcementID, err := strconv.Atoi(parts[3])
	if err != nil {
		sendError(w, "Invalid announcement ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodPost:
		handleCreateDonation(w, r, announcementID)
	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleCreateDonation - создать пожертвование
func handleCreateDonation(w http.ResponseWriter, r *http.Request, announcementID int) {
	// Проверяем, что это сбор средств
	var announcementType string
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT type FROM pet_announcements WHERE id = ?"), announcementID).Scan(&announcementType)
	if err != nil {
		sendError(w, "Announcement not found", http.StatusNotFound)
		return
	}
	if announcementType != "fundraising" {
		sendError(w, "This announcement is not a fundraising", http.StatusBadRequest)
		return
	}

	var req models.CreateDonationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		sendError(w, "Amount must be greater than 0", http.StatusBadRequest)
		return
	}

	// Получаем ID донора (если авторизован)
	var donorID *int
	if userIDValue := r.Context().Value("userID"); userIDValue != nil {
		uid := userIDValue.(int)
		donorID = &uid
	}

	// Имя донора
	donorName := "Аноним"
	if req.IsAnonymous {
		donorName = "Аноним"
	} else if req.DonorName != nil && *req.DonorName != "" {
		donorName = *req.DonorName
	} else if donorID != nil {
		// Загружаем имя из профиля
		var name string
		var lastName sql.NullString
		db.DB.QueryRow(ConvertPlaceholders("SELECT name, last_name FROM users WHERE id = ?"), *donorID).Scan(&name, &lastName)
		if lastName.Valid && lastName.String != "" {
			donorName = name + " " + lastName.String
		} else {
			donorName = name
		}
	}

	query := ConvertPlaceholders(`
		INSERT INTO announcement_donations (announcement_id, donor_id, donor_name, amount, message, is_anonymous)
		VALUES (?, ?, ?, ?, ?, ?) RETURNING id
	`)

	var id int64
	err = db.DB.QueryRow(query, announcementID, donorID, donorName, req.Amount, req.Message, req.IsAnonymous).Scan(&id)
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]interface{}{"id": id, "message": "Donation created successfully"})
}
