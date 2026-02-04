package handlers

import (
	"backend/models"
	"backend/db"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func PostsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// GET публичный - можно просматривать ленту без авторизации
		getAllPosts(w, r)
	case http.MethodPost:
		// POST требует авторизации - проверка внутри createPost
		createPost(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func PostHandler(w http.ResponseWriter, r *http.Request) {
	// Извлекаем ID из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/posts/")

	// Проверяем, это запрос на лайк?
	if strings.HasSuffix(path, "/like") {
		postIDStr := strings.TrimSuffix(path, "/like")
		postID, err := strconv.Atoi(postIDStr)
		if err != nil {
			sendErrorResponse(w, "Неверный ID поста", http.StatusBadRequest)
			return
		}

		userID, ok := r.Context().Value("userID").(int)
		if !ok {
			sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case http.MethodPost:
			toggleLike(w, r, postID, userID)
		case http.MethodGet:
			getLikeStatus(w, r, postID, userID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Проверяем, это запрос на список лайкнувших?
	if strings.HasSuffix(path, "/likers") {
		postIDStr := strings.TrimSuffix(path, "/likers")
		postID, err := strconv.Atoi(postIDStr)
		if err != nil {
			sendErrorResponse(w, "Неверный ID поста", http.StatusBadRequest)
			return
		}

		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		getLikers(w, r, postID)
		return
	}

	// Обычная обработка поста
	id, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID поста", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		getPost(w, r, id)
	case http.MethodPut:
		updatePost(w, r, id)
	case http.MethodDelete:
		deletePost(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func UserPostsHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("📥 UserPostsHandler: %s %s", r.Method, r.URL.Path)

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Извлекаем ID пользователя из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/posts/user/")
	log.Printf("🔍 UserPostsHandler: Extracted path: %s", path)

	userID, err := strconv.Atoi(path)
	if err != nil {
		log.Printf("❌ UserPostsHandler: Invalid user ID: %s, error: %v", path, err)
		sendErrorResponse(w, "Неверный ID пользователя", http.StatusBadRequest)
		return
	}

	log.Printf("✅ UserPostsHandler: Calling getUserPosts for userID=%d", userID)
	getUserPosts(w, r, userID)
}

func PetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Извлекаем ID питомца из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/posts/pet/")
	petID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID питомца", http.StatusBadRequest)
		return
	}

	getPetPosts(w, r, petID)
}

func OrganizationPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Извлекаем ID организации из URL
	path := strings.TrimPrefix(r.URL.Path, "/api/posts/organization/")
	orgID, err := strconv.Atoi(path)
	if err != nil {
		sendErrorResponse(w, "Неверный ID организации", http.StatusBadRequest)
		return
	}

	getOrganizationPosts(w, r, orgID)
}

// checkCanEditPost проверяет может ли пользователь редактировать пост
func checkCanEditPost(userID int, post *models.Post) bool {
	if userID == 0 {
		log.Printf("🔒 checkCanEditPost: userID=0, can_edit=false")
		return false
	}

	// Если пост от пользователя - проверяем ID
	if post.AuthorType == "user" && post.AuthorID == userID {
		log.Printf("✅ checkCanEditPost: post %d by user %d, can_edit=true", post.ID, userID)
		return true
	}

	// Если пост от организации - проверяем членство с правами
	if post.AuthorType == "organization" {
		var role string
		err := db.DB.QueryRow(ConvertPlaceholders(`
			SELECT role FROM organization_members 
			WHERE organization_id = ? AND user_id = ?
		`), post.AuthorID, userID).Scan(&role)

		if err == nil && (role == "owner" || role == "admin" || role == "moderator") {
			log.Printf("✅ checkCanEditPost: post %d by org %d, user %d has role %s, can_edit=true", post.ID, post.AuthorID, userID, role)
			return true
		}
		log.Printf("🔒 checkCanEditPost: post %d by org %d, user %d has no rights, can_edit=false", post.ID, post.AuthorID, userID)
	}

	log.Printf("🔒 checkCanEditPost: post %d, userID %d, can_edit=false", post.ID, userID)
	return false
}

// getAllPosts получает все посты для Feed
func getAllPosts(w http.ResponseWriter, r *http.Request) {
	// Получаем userID из заголовка Gateway (может быть 0 для неавторизованных)
	userID, _ := GetUserIDFromGateway(r)

	// Debug: логируем все заголовки
	log.Printf("🔍 getAllPosts: X-User-ID header=%s", r.Header.Get("X-User-ID"))
	log.Printf("🔍 getAllPosts: userID=%d", userID)

	// Получаем параметр фильтра
	filter := r.URL.Query().Get("filter")
	if filter == "" {
		filter = "for-you"
	}

	log.Printf("🔍 getAllPosts: userID=%d, filter=%s", userID, filter)

	// Получаем параметры пагинации
	limitStr := r.URL.Query().Get("limit")
	limit := 20 // По умолчанию 20 постов
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	// Получаем город пользователя для фильтра "city"
	var userCity string
	if filter == "city" && userID > 0 {
		db.DB.QueryRow(ConvertPlaceholders("SELECT location FROM users WHERE id = ?"), userID).Scan(&userCity)
		log.Printf("🏙️ User city: %s", userCity)
	}

	// Базовый запрос
	query := `
		SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
		       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
		       p.location_lat, p.location_lon, p.location_name,
		       o.name as org_name, o.short_name as org_short_name, o.logo as org_logo,
		       u.name as user_name, u.last_name as user_last_name, u.avatar as user_avatar,
		       p.likes_count, p.comments_count,
		       CASE 
		           WHEN p.author_type = 'user' AND EXISTS (
		               SELECT 1 FROM friendships f 
		               WHERE ((f.user_id = ? AND f.friend_id = p.author_id) 
		                   OR (f.friend_id = ? AND f.user_id = p.author_id))
		                   AND f.status = 'accepted'
		           ) THEN 1
		           ELSE 0
		       END as is_friend,
		       EXISTS (SELECT 1 FROM polls WHERE post_id = p.id) as has_poll
		FROM posts p
		LEFT JOIN organizations o ON p.author_id = o.id AND p.author_type = 'organization'
		LEFT JOIN users u ON p.author_id = u.id AND p.author_type = 'user'
		WHERE p.is_deleted = FALSE AND p.status = 'published'
	`

	// Добавляем фильтры в зависимости от типа
	args := []interface{}{userID, userID}

	switch filter {
	case "following":
		// Только посты от друзей (не свои)
		if userID > 0 {
			query += ` AND p.author_type = 'user' AND p.author_id != ? AND EXISTS (
				SELECT 1 FROM friendships f 
				WHERE ((f.user_id = ? AND f.friend_id = p.author_id) 
					OR (f.friend_id = ? AND f.user_id = p.author_id))
					AND f.status = 'accepted'
			)`
			args = append(args, userID, userID, userID)
			log.Printf("🔍 Following filter: excluding userID=%d, checking friendships", userID)
		}
	case "city":
		// Только посты из города пользователя
		if userCity != "" {
			query += ` AND (
				(p.author_type = 'user' AND u.location = ?) OR
				(p.author_type = 'organization' AND o.address_city = ?)
			)`
			args = append(args, userCity, userCity)
			log.Printf("🏙️ City filter: filtering by city=%s", userCity)
		}
	}

	query += ` ORDER BY is_friend DESC, p.created_at DESC LIMIT ?`
	args = append(args, limit)

	// Конвертируем плейсхолдеры для PostgreSQL
	query = ConvertPlaceholders(query)

	log.Printf("🔍 Executing query with %d args", len(args))
	log.Printf("📝 Query: %s", query)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		log.Printf("❌ Query error: %v", err)
		log.Printf("❌ Query was: %s", query)
		log.Printf("❌ Args were: %v", args)
		sendErrorResponse(w, "Ошибка получения постов: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		var attachedPetsJSON, attachmentsJSON, tagsJSON string
		var orgName, orgShortName, orgLogo *string
		var userName, userLastName, userAvatar *string
		var isFriend int
		var hasPoll bool

		err := rows.Scan(
			&post.ID, &post.AuthorID, &post.AuthorType, &post.Content,
			&attachedPetsJSON, &attachmentsJSON, &tagsJSON,
			&post.Status, &post.ScheduledAt,
			&post.CreatedAt, &post.UpdatedAt,
			&post.LocationLat, &post.LocationLon, &post.LocationName,
			&orgName, &orgShortName, &orgLogo,
			&userName, &userLastName, &userAvatar,
			&post.LikesCount, &post.CommentsCount,
			&isFriend,
			&hasPoll,
		)
		if err != nil {
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}

		post.HasPoll = hasPoll

		// Десериализуем JSON массивы
		json.Unmarshal([]byte(attachedPetsJSON), &post.AttachedPets)
		json.Unmarshal([]byte(attachmentsJSON), &post.Attachments)
		json.Unmarshal([]byte(tagsJSON), &post.Tags)

		// Инициализируем пустые массивы если nil
		if post.AttachedPets == nil {
			post.AttachedPets = []int{}
		}
		if post.Attachments == nil {
			post.Attachments = []models.Attachment{}
		}
		if post.Tags == nil {
			post.Tags = []string{}
		}

		// Добавляем данные организации если это organization
		if post.AuthorType == "organization" && orgName != nil {
			org := models.Organization{
				ID:        post.AuthorID,
				Name:      *orgName,
				ShortName: orgShortName,
				Logo:      orgLogo,
			}
			post.Organization = &org
		}

		// Добавляем данные пользователя если это user
		if post.AuthorType == "user" && userName != nil {
			user := models.User{
				ID:   post.AuthorID,
				Name: *userName,
			}
			if userLastName != nil {
				user.LastName = *userLastName // Если LastName это *string в модели
			}
			if userAvatar != nil {
				user.Avatar = *userAvatar // Если Avatar это *string в модели
			}
			post.User = &user
		}

		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.Post{}
	}

	// ✅ ОПТИМИЗАЦИЯ: Загружаем питомцев одним запросом для всех постов
	posts = loadPetsForPostsBatch(posts)

	// ✅ ОПТИМИЗАЦИЯ: Опросы загружаются по требованию (lazy loading)
	// Frontend будет запрашивать опросы отдельно через GET /api/polls/:post_id
	// Это позволяет масштабироваться до миллионов постов
	// Опросы загружаются только для видимых постов на экране

	// ✅ Проверяем права на редактирование для каждого поста
	for i := range posts {
		posts[i].CanEdit = checkCanEditPost(userID, &posts[i])
	}

	sendSuccessResponse(w, posts)
}

// getDrafts получает черновики пользователя
func getDrafts(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	query := `
		SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
		       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
		       u.name, u.email, u.avatar,
		       o.name as org_name, o.short_name as org_short_name, o.logo as org_logo,
		       p.likes_count, p.comments_count
		FROM posts p
		LEFT JOIN users u ON p.author_id = u.id AND p.author_type = 'user'
		LEFT JOIN organizations o ON p.author_id = o.id AND p.author_type = 'organization'
		WHERE p.author_id = ? AND p.author_type = 'user' AND p.status = 'draft' AND p.is_deleted = FALSE
		ORDER BY p.created_at DESC
	`

	rows, err := db.DB.Query(query, userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения черновиков: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var drafts []models.Post
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}
		drafts = append(drafts, post)
	}

	if drafts == nil {
		drafts = []models.Post{}
	}

	// Опросы загружаются по требованию (lazy loading)

	// ✅ Проверяем права на редактирование для каждого черновика
	for i := range drafts {
		drafts[i].CanEdit = checkCanEditPost(userID, &drafts[i])
	}

	sendSuccessResponse(w, drafts)
}

// DraftsHandler - отдельный handler для черновиков
func DraftsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	getDrafts(w, r)
}

// getUserPosts получает посты конкретного пользователя (Wall)
func getUserPosts(w http.ResponseWriter, r *http.Request, userID int) {
	log.Printf("🔍 getUserPosts: Starting for userID=%d", userID)

	// Получаем текущего пользователя из контекста
	currentUserID, _ := r.Context().Value("userID").(int)
	log.Printf("🔍 getUserPosts: currentUserID=%d", currentUserID)

	// Простой запрос только ID постов (без JOIN)
	log.Printf("🔍 getUserPosts: Fetching post IDs...")

	// Получаем параметры пагинации из query
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20 // По умолчанию 20 постов
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}

	offset := 0 // По умолчанию с начала
	if offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	log.Printf("🔍 getUserPosts: Pagination - limit=%d, offset=%d", limit, offset)

	simpleQuery := `SELECT id FROM posts WHERE author_id = ? AND author_type = 'user' AND is_deleted = FALSE ORDER BY created_at DESC LIMIT ? OFFSET ?`
	rows, err := db.DB.Query(ConvertPlaceholders(simpleQuery), userID, limit, offset)
	if err != nil {
		log.Printf("❌ getUserPosts: Query error: %v", err)
		sendErrorResponse(w, "Ошибка получения постов: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var postIDs []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			log.Printf("❌ getUserPosts: Scan error: %v", err)
			continue
		}
		postIDs = append(postIDs, id)
	}
	log.Printf("✅ getUserPosts: Found %d post IDs", len(postIDs))

	// Загружаем полные данные для каждого поста отдельным запросом
	var posts []models.Post
	for _, postID := range postIDs {
		// Простой запрос без JOIN + проверка наличия опроса
		query := `
			SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
			       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
			       p.location_lat, p.location_lon, p.location_name,
			       EXISTS (SELECT 1 FROM polls WHERE polls.post_id = p.id) as has_poll
			FROM posts p
			WHERE p.id = ?
		`
		var post models.Post
		var attachedPetsJSON, attachmentsJSON, tagsJSON sql.NullString
		var scheduledAt sql.NullTime
		var hasPoll bool

		err := db.DB.QueryRow(ConvertPlaceholders(query), postID).Scan(
			&post.ID, &post.AuthorID, &post.AuthorType, &post.Content,
			&attachedPetsJSON, &attachmentsJSON, &tagsJSON,
			&post.Status, &scheduledAt, &post.CreatedAt, &post.UpdatedAt,
			&post.LocationLat, &post.LocationLon, &post.LocationName,
			&hasPoll,
		)

		if err != nil {
			log.Printf("⚠️ getUserPosts: Failed to load post %d: %v", postID, err)
			continue
		}

		post.HasPoll = hasPoll
		log.Printf("📊 getUserPosts: Post %d has_poll=%v", postID, hasPoll)

		// Парсим JSON поля
		if attachedPetsJSON.Valid && attachedPetsJSON.String != "" && attachedPetsJSON.String != "null" {
			json.Unmarshal([]byte(attachedPetsJSON.String), &post.AttachedPets)
		}
		if post.AttachedPets == nil {
			post.AttachedPets = []int{}
		}

		if attachmentsJSON.Valid && attachmentsJSON.String != "" && attachmentsJSON.String != "null" {
			json.Unmarshal([]byte(attachmentsJSON.String), &post.Attachments)
		}
		if post.Attachments == nil {
			post.Attachments = []models.Attachment{}
		}

		if tagsJSON.Valid && tagsJSON.String != "" && tagsJSON.String != "null" {
			json.Unmarshal([]byte(tagsJSON.String), &post.Tags)
		}
		if post.Tags == nil {
			post.Tags = []string{}
		}

		if scheduledAt.Valid {
			timeStr := scheduledAt.Time.Format(time.RFC3339)
			post.ScheduledAt = &timeStr
		}

		// Загружаем данные пользователя
		var user models.User
		var lastName, avatar sql.NullString
		userQuery := ConvertPlaceholders("SELECT id, name, last_name, email, avatar FROM users WHERE id = ?")
		err = db.DB.QueryRow(userQuery, post.AuthorID).Scan(&user.ID, &user.Name, &lastName, &user.Email, &avatar)
		if err == nil {
			if lastName.Valid {
				user.LastName = lastName.String
			}
			if avatar.Valid {
				user.Avatar = avatar.String
			}
			post.User = &user
		} else {
			log.Printf("⚠️ getUserPosts: Failed to load user %d: %v", post.AuthorID, err)
			post.User = nil
		}

		post.Organization = nil
		post.Pets = []models.Pet{}
		post.CommentsCount = 0

		posts = append(posts, post)
	}
	log.Printf("✅ getUserPosts: Loaded %d posts", len(posts))

	if posts == nil {
		posts = []models.Post{}
	}

	// Опросы загружаются по требованию (lazy loading)
	log.Printf("✅ getUserPosts: Polls will be loaded on demand")

	// Проверяем права на редактирование для каждого поста
	log.Printf("🔍 getUserPosts: Checking edit permissions...")
	for i := range posts {
		posts[i].CanEdit = checkCanEditPost(currentUserID, &posts[i])
	}
	log.Printf("✅ getUserPosts: Edit permissions checked")

	log.Printf("✅ getUserPosts: Sending response with %d posts", len(posts))
	sendSuccessResponse(w, posts)
}

// getPetPosts получает посты, в которых упоминается питомец
func getPetPosts(w http.ResponseWriter, r *http.Request, petID int) {
	// Получаем текущего пользователя из контекста
	currentUserID, _ := r.Context().Value("userID").(int)

	query := `
		SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
		       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
		       u.name, u.email, u.avatar,
		       o.name as org_name, o.short_name as org_short_name, o.logo as org_logo,
		       p.likes_count, p.comments_count
		FROM posts p
		LEFT JOIN users u ON p.author_id = u.id AND p.author_type = 'user'
		LEFT JOIN organizations o ON p.author_id = o.id AND p.author_type = 'organization'
		INNER JOIN post_pets pp ON p.id = pp.post_id
		WHERE pp.pet_id = ? AND p.is_deleted = FALSE AND p.status = 'published'
		ORDER BY p.created_at DESC
	`

	rows, err := db.DB.Query(query, petID)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения постов: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}
		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.Post{}
	}

	// Опросы загружаются по требованию (lazy loading) для getPetPosts

	// ✅ Проверяем права на редактирование для каждого поста
	for i := range posts {
		posts[i].CanEdit = checkCanEditPost(currentUserID, &posts[i])
	}

	sendSuccessResponse(w, posts)
}

// getOrganizationPosts получает посты организации
func getOrganizationPosts(w http.ResponseWriter, r *http.Request, orgID int) {
	// Получаем текущего пользователя из контекста
	currentUserID, _ := r.Context().Value("userID").(int)

	query := ConvertPlaceholders(`
		SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
		       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
		       u.name, u.email, u.avatar,
		       o.name as org_name, o.short_name as org_short_name, o.logo as org_logo,
		       p.likes_count, p.comments_count
		FROM posts p
		LEFT JOIN users u ON p.author_id = u.id AND p.author_type = 'user'
		LEFT JOIN organizations o ON p.author_id = o.id AND p.author_type = 'organization'
		WHERE p.author_id = ? AND p.author_type = 'organization' AND p.is_deleted = FALSE AND p.status = 'published'
		ORDER BY p.created_at DESC
	`)

	rows, err := db.DB.Query(query, orgID)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения постов: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		post, err := scanPost(rows)
		if err != nil {
			sendErrorResponse(w, "Ошибка чтения данных: "+err.Error(), http.StatusInternalServerError)
			return
		}
		posts = append(posts, post)
	}

	if posts == nil {
		posts = []models.Post{}
	}

	// Опросы загружаются по требованию (lazy loading) для getOrganizationPosts

	// ✅ Проверяем права на редактирование для каждого поста
	for i := range posts {
		posts[i].CanEdit = checkCanEditPost(currentUserID, &posts[i])
	}

	sendSuccessResponse(w, posts)
}

// createPost создаёт новый пост
func createPost(w http.ResponseWriter, r *http.Request) {
	// Получаем userID из контекста (установлен middleware)
	userID, ok := r.Context().Value("userID").(int)
	if !ok || userID == 0 {
		log.Printf("❌ createPost: No user ID in context")
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	log.Printf("✅ createPost: userID=%d from context", userID)

	var req models.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	// Валидация: хотя бы одно поле должно быть заполнено
	if req.Content == "" && len(req.AttachedPets) == 0 && len(req.Attachments) == 0 && req.Poll == nil {
		sendErrorResponse(w, "Пост должен содержать текст, фото, прикреплённых питомцев или опрос", http.StatusBadRequest)
		return
	}

	// Сериализуем массивы в JSON
	attachedPetsJSON, _ := json.Marshal(req.AttachedPets)
	attachmentsJSON, _ := json.Marshal(req.Attachments)
	tagsJSON, _ := json.Marshal(req.Tags)

	// Определяем статус поста
	status := "published"
	if req.Status != "" {
		status = req.Status
	}

	var scheduledAt *string
	if req.ScheduledAt != nil {
		scheduledAt = req.ScheduledAt
	}

	// Определяем автора поста
	authorType := "user"
	authorID := userID
	if req.AuthorType == "organization" && req.OrganizationID != nil {
		// Проверяем права пользователя на публикацию от имени организации
		var canPost bool
		err := db.DB.QueryRow(ConvertPlaceholders(`
			SELECT can_post FROM organization_members
			WHERE organization_id = ? AND user_id = ?
		`), *req.OrganizationID, userID).Scan(&canPost)

		if err != nil || !canPost {
			sendErrorResponse(w, "Нет прав на публикацию от имени этой организации", http.StatusForbidden)
			return
		}

		authorType = "organization"
		authorID = *req.OrganizationID
	}

	query := `INSERT INTO posts (author_id, author_type, content, attached_pets, attachments, tags, status, scheduled_at, location_lat, location_lon, location_name) 
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	// Конвертируем плейсхолдеры для PostgreSQL
	query = ConvertPlaceholders(query)

	log.Printf("🔍 Creating post: authorID=%d, authorType=%s, status=%s", authorID, authorType, status)
	log.Printf("📝 Query: %s", query)

	var postID int64
	var err error
	err = db.DB.QueryRow(query+" RETURNING id", authorID, authorType, req.Content, string(attachedPetsJSON), string(attachmentsJSON), string(tagsJSON), status, scheduledAt, req.LocationLat, req.LocationLon, req.LocationName).Scan(&postID)
	if err != nil {
		log.Printf("❌ Create post error: %v", err)
		log.Printf("❌ Query was: %s", query)
		log.Printf("❌ Args: authorID=%d, authorType=%s, content=%s, attachedPets=%s, attachments=%s, tags=%s, status=%s, scheduledAt=%v",
			authorID, authorType, req.Content, string(attachedPetsJSON), string(attachmentsJSON), string(tagsJSON), status, scheduledAt)
		sendErrorResponse(w, "Ошибка создания поста: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Добавляем связи в post_pets для быстрых запросов
	for _, petID := range req.AttachedPets {
		_, err := db.DB.Exec(ConvertPlaceholders("INSERT INTO post_pets (post_id, pet_id) VALUES (?, ?)"), postID, petID)
		if err != nil {
			// Логируем ошибку, но не прерываем создание поста
			continue
		}
	}

	// Создаем опрос, если он есть
	if req.Poll != nil {
		err := createPollForPost(int(postID), req.Poll)
		if err != nil {
			// Логируем ошибку, но не прерываем создание поста
		}
	}

	// Получаем созданный пост
	post, err := getPostByID(int(postID), userID)
	if err != nil {
		sendErrorResponse(w, "Ошибка получения поста", http.StatusInternalServerError)
		return
	}

	// Логируем создание поста
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	details := "Создан пост"
	if authorType == "organization" {
		details = "Создан пост от имени организации"
	}
	CreateUserLog(db.DB, userID, "post_create", details, ipAddress, userAgent)

	sendSuccessResponse(w, post)
}

// getPost возвращает один пост по ID
func getPost(w http.ResponseWriter, r *http.Request, postID int) {
	// Получаем userID если пользователь авторизован (опционально)
	userID := 0
	if uid, ok := r.Context().Value("userID").(int); ok {
		userID = uid
	}

	post, err := getPostByID(postID, userID)
	if err != nil {
		sendErrorResponse(w, "Пост не найден", http.StatusNotFound)
		return
	}

	sendSuccessResponse(w, post)
}

// updatePost обновляет существующий пост
func updatePost(w http.ResponseWriter, r *http.Request, postID int) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	log.Printf("📝 updatePost: START - postID=%d, userID=%d", postID, userID)

	// Получаем пост для проверки прав
	post, err := getPostByID(postID, userID)
	if err != nil {
		log.Printf("❌ updatePost: Post not found - postID=%d", postID)
		sendErrorResponse(w, "Пост не найден", http.StatusNotFound)
		return
	}

	log.Printf("✅ updatePost: Post found - id=%d, author_type=%s, author_id=%d", post.ID, post.AuthorType, post.AuthorID)

	// Проверяем права на редактирование
	if !checkCanEditPost(userID, &post) {
		log.Printf("🔒 updatePost: No edit permission - postID=%d, userID=%d", postID, userID)
		sendErrorResponse(w, "Нет прав на редактирование этого поста", http.StatusForbidden)
		return
	}

	log.Printf("✅ updatePost: Edit permission granted")

	var req models.UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ updatePost: Invalid JSON - %v", err)
		sendErrorResponse(w, "Неверный формат данных", http.StatusBadRequest)
		return
	}

	log.Printf("📦 updatePost: Request data:")
	log.Printf("   - content: %s", req.Content)
	log.Printf("   - attached_pets: %v", req.AttachedPets)
	log.Printf("   - attachments: %d items", len(req.Attachments))
	log.Printf("   - tags: %v", req.Tags)
	log.Printf("   - poll: %v", req.Poll != nil)

	if req.Poll != nil {
		log.Printf("   📊 Poll data:")
		log.Printf("      - question: %s", req.Poll.Question)
		log.Printf("      - options: %v", req.Poll.Options)
		log.Printf("      - multiple_choice: %v", req.Poll.MultipleChoice)
	}

	// Сериализуем массивы в JSON
	attachedPetsJSON, _ := json.Marshal(req.AttachedPets)
	attachmentsJSON, _ := json.Marshal(req.Attachments)
	tagsJSON, _ := json.Marshal(req.Tags)

	log.Printf("💾 updatePost: Updating post in DB...")
	query := ConvertPlaceholders(`UPDATE posts SET content = ?, attached_pets = ?, attachments = ?, tags = ?, location_lat = ?, location_lon = ?, location_name = ?, updated_at = ? WHERE id = ?`)
	_, err = db.DB.Exec(query, req.Content, string(attachedPetsJSON), string(attachmentsJSON), string(tagsJSON), req.LocationLat, req.LocationLon, req.LocationName, time.Now().Format("2006-01-02 15:04:05"), postID)
	if err != nil {
		log.Printf("❌ updatePost: Error updating post: %v", err)
		sendErrorResponse(w, "Ошибка обновления поста: "+err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("✅ updatePost: Post updated in DB")

	// Обновляем связи в post_pets
	log.Printf("🔗 updatePost: Updating post_pets relations...")
	db.DB.Exec(ConvertPlaceholders("DELETE FROM post_pets WHERE post_id = ?"), postID)
	for _, petID := range req.AttachedPets {
		db.DB.Exec(ConvertPlaceholders("INSERT INTO post_pets (post_id, pet_id) VALUES (?, ?)"), postID, petID)
	}
	log.Printf("✅ updatePost: post_pets updated")

	// Создаем опрос, если он есть (только если опроса еще нет)
	if req.Poll != nil {
		log.Printf("📊 updatePost: Poll data received, checking if poll exists...")
		// Проверяем, есть ли уже опрос
		var existingPollID int
		err := db.DB.QueryRow(ConvertPlaceholders("SELECT id FROM polls WHERE post_id = ?"), postID).Scan(&existingPollID)

		if err != nil {
			// Опроса нет - создаем новый
			log.Printf("✅ updatePost: No existing poll, creating new one...")
			err := createPollForPost(postID, req.Poll)
			if err != nil {
				log.Printf("❌ updatePost: Error creating poll: %v", err)
				// Не прерываем обновление поста, просто логируем ошибку
			} else {
				log.Printf("✅ updatePost: Poll created successfully!")
			}
		} else {
			log.Printf("⚠️ updatePost: Poll already exists (id=%d) for post %d, skipping creation", existingPollID, postID)
		}
	} else {
		log.Printf("ℹ️ updatePost: No poll data in request")
	}

	// Получаем обновлённый пост
	log.Printf("🔄 updatePost: Fetching updated post...")
	post, err = getPostByID(postID, userID)
	if err != nil {
		log.Printf("❌ updatePost: Error fetching updated post: %v", err)
		sendErrorResponse(w, "Ошибка получения поста", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ updatePost: SUCCESS - post updated, has_poll=%v", post.Poll != nil)
	sendSuccessResponse(w, post)
}

// deletePost удаляет пост (мягкое удаление)
func deletePost(w http.ResponseWriter, r *http.Request, postID int) {
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendErrorResponse(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Получаем пост для проверки прав
	post, err := getPostByID(postID, userID)
	if err != nil {
		sendErrorResponse(w, "Пост не найден", http.StatusNotFound)
		return
	}

	// Проверяем права на удаление
	if !checkCanEditPost(userID, &post) {
		sendErrorResponse(w, "Нет прав на удаление этого поста", http.StatusForbidden)
		return
	}

	// Мягкое удаление
	_, err = db.DB.Exec(ConvertPlaceholders("UPDATE posts SET is_deleted = TRUE WHERE id = ?"), postID)
	if err != nil {
		sendErrorResponse(w, "Ошибка удаления поста: "+err.Error(), http.StatusInternalServerError)
		return
	}

	sendSuccessResponse(w, map[string]string{"message": "Пост удален"})
}

// scanPost сканирует строку БД в структуру Post
func scanPost(rows interface {
	Scan(dest ...interface{}) error
}) (models.Post, error) {
	var post models.Post
	var user models.User
	var attachedPetsJSON, attachmentsJSON, tagsJSON string
	var userName, userEmail, userAvatar *string
	var orgName, orgShortName, orgLogo *string

	err := rows.Scan(
		&post.ID, &post.AuthorID, &post.AuthorType, &post.Content,
		&attachedPetsJSON, &attachmentsJSON, &tagsJSON,
		&post.Status, &post.ScheduledAt,
		&post.CreatedAt, &post.UpdatedAt,
		&userName, &userEmail, &userAvatar,
		&orgName, &orgShortName, &orgLogo,
		&post.LikesCount, &post.CommentsCount,
	)
	if err != nil {
		return post, err
	}

	// Десериализуем JSON массивы
	json.Unmarshal([]byte(attachedPetsJSON), &post.AttachedPets)
	json.Unmarshal([]byte(attachmentsJSON), &post.Attachments)
	json.Unmarshal([]byte(tagsJSON), &post.Tags)

	// Инициализируем пустые массивы если nil
	if post.AttachedPets == nil {
		post.AttachedPets = []int{}
	}
	if post.Attachments == nil {
		post.Attachments = []models.Attachment{}
	}
	if post.Tags == nil {
		post.Tags = []string{}
	}

	// Добавляем данные автора если это user
	if post.AuthorType == "user" && userName != nil {
		user.ID = post.AuthorID
		user.Name = *userName
		if userEmail != nil {
			user.Email = *userEmail
		}
		if userAvatar != nil {
			user.Avatar = *userAvatar
		}
		post.User = &user
	}

	// Добавляем данные организации если это organization
	if post.AuthorType == "organization" && orgName != nil {
		org := models.Organization{
			ID:        post.AuthorID,
			Name:      *orgName,
			ShortName: orgShortName,
			Logo:      orgLogo,
		}
		post.Organization = &org
	}

	// Загружаем данные прикреплённых питомцев
	if len(post.AttachedPets) > 0 {
		post.Pets = loadPetsForPost(post.AttachedPets)
	}

	return post, nil
}

// getPostByID получает пост по ID
func getPostByID(postID int, userID int) (models.Post, error) {
	query := ConvertPlaceholders(`
		SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
		       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
		       o.name as org_name, o.short_name as org_short_name, o.logo as org_logo,
		       p.likes_count, p.comments_count
		FROM posts p
		LEFT JOIN organizations o ON p.author_id = o.id AND p.author_type = 'organization'
		WHERE p.id = ? AND p.is_deleted = FALSE
	`)

	var post models.Post
	var orgName, orgShortName, orgLogo sql.NullString
	var attachedPetsJSON, attachmentsJSON, tagsJSON, scheduledAt sql.NullString

	log.Printf("🔍 getPostByID: postID=%d, userID=%d", postID, userID)
	err := db.DB.QueryRow(query, postID).Scan(
		&post.ID, &post.AuthorID, &post.AuthorType, &post.Content,
		&attachedPetsJSON, &attachmentsJSON, &tagsJSON,
		&post.Status, &scheduledAt, &post.CreatedAt, &post.UpdatedAt,
		&orgName, &orgShortName, &orgLogo,
		&post.LikesCount, &post.CommentsCount,
	)

	if err != nil {
		log.Printf("❌ getPostByID: Error scanning post: %v", err)
		return post, err
	}

	log.Printf("✅ getPostByID: Found post id=%d, author_type=%s, author_id=%d", post.ID, post.AuthorType, post.AuthorID)

	// Парсим JSON поля
	if attachedPetsJSON.Valid && attachedPetsJSON.String != "" {
		json.Unmarshal([]byte(attachedPetsJSON.String), &post.AttachedPets)
	}
	if attachmentsJSON.Valid && attachmentsJSON.String != "" {
		json.Unmarshal([]byte(attachmentsJSON.String), &post.Attachments)
	}
	if tagsJSON.Valid && tagsJSON.String != "" {
		json.Unmarshal([]byte(tagsJSON.String), &post.Tags)
	}
	if scheduledAt.Valid {
		post.ScheduledAt = &scheduledAt.String
	}

	// Загружаем данные автора
	switch post.AuthorType {
	case "user":
		// 🔥 Загружаем данные пользователя через Auth Service
		authServiceURL := os.Getenv("AUTH_SERVICE_URL")
		if authServiceURL == "" {
			authServiceURL = "http://localhost:7100"
		}

		resp, err := http.Get(fmt.Sprintf("%s/api/users/%d", authServiceURL, post.AuthorID))
		if err != nil {
			log.Printf("❌ Failed to fetch user from Auth Service: %v", err)
		} else {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var authResp struct {
					Success bool        `json:"success"`
					Data    models.User `json:"data"`
				}
				body, err := io.ReadAll(resp.Body)
				if err != nil {
					log.Printf("❌ Failed to read Auth Service response: %v", err)
				} else {
					if err := json.Unmarshal(body, &authResp); err != nil {
						log.Printf("❌ Failed to unmarshal Auth Service response: %v", err)
					} else if authResp.Success {
						post.User = &authResp.Data
						log.Printf("✅ Loaded user data from Auth Service: id=%d, name=%s, avatar=%s", authResp.Data.ID, authResp.Data.Name, authResp.Data.Avatar)
					} else {
						log.Printf("⚠️ Auth Service returned success=false")
					}
				}
			} else {
				log.Printf("⚠️ Auth Service returned status %d", resp.StatusCode)
			}
		}
	case "organization":
		// Данные организации уже загружены из JOIN
		if orgName.Valid {
			shortName := orgShortName.String
			logo := orgLogo.String
			post.Organization = &models.Organization{
				ID:        post.AuthorID,
				Name:      orgName.String,
				ShortName: &shortName,
				Logo:      &logo,
			}
		}
	}

	// Загружаем опрос, если есть
	poll, err := loadPollForPost(postID, userID)
	if err == nil {
		post.Poll = poll
	}

	return post, nil
}

// loadPetsForPost загружает данные питомцев для поста
func loadPetsForPost(petIDs []int) []models.Pet {
	if len(petIDs) == 0 {
		return []models.Pet{}
	}

	// Создаём плейсхолдеры для IN запроса
	placeholders := strings.Repeat("?,", len(petIDs)-1) + "?"
	query := `
		SELECT 
			p.id, p.user_id, p.name, p.species, p.breed, p.gender, p.birth_date, 
			p.color, p.size, p.photo, p.status, p.city, p.region, p.urgent, p.story,
			p.organization_id, o.name as organization_name, o.type as organization_type,
			p.created_at
		FROM pets p
		LEFT JOIN organizations o ON p.organization_id = o.id
		WHERE p.id IN (` + placeholders + `)
	`

	// Конвертируем []int в []interface{} для Exec
	args := make([]interface{}, len(petIDs))
	for i, id := range petIDs {
		args[i] = id
	}

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return []models.Pet{}
	}
	defer rows.Close()

	var pets []models.Pet
	for rows.Next() {
		var pet models.Pet
		var organizationName, organizationType sql.NullString

		err := rows.Scan(
			&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Breed, &pet.Gender, &pet.BirthDate,
			&pet.Color, &pet.Size, &pet.Photo, &pet.Status, &pet.City, &pet.Region, &pet.Urgent, &pet.Story,
			&pet.OrganizationID, &organizationName, &organizationType,
			&pet.CreatedAt,
		)

		if err != nil {
			continue
		}

		if organizationName.Valid {
			pet.OrganizationName = organizationName.String
		}
		if organizationType.Valid {
			pet.OrganizationType = organizationType.String
		}

		pets = append(pets, pet)
	}

	return pets
}

// loadPollsForPosts загружает опросы для списка постов
func loadPollsForPosts(posts []models.Post, userID int) []models.Post {
	if len(posts) == 0 {
		return posts
	}

	// Собираем ID постов
	postIDs := make([]int, 0, len(posts))
	for _, post := range posts {
		postIDs = append(postIDs, post.ID)
	}

	// Загружаем все опросы одним запросом
	pollsMap := make(map[int]*models.Poll)  // post_id -> poll
	pollsByID := make(map[int]*models.Poll) // poll_id -> poll

	// Создаем плейсхолдеры для IN clause
	placeholders := make([]string, len(postIDs))
	args := make([]interface{}, len(postIDs))
	for i, id := range postIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	query := ConvertPlaceholders(fmt.Sprintf(`
		SELECT id, post_id, question, multiple_choice, allow_vote_changes, expires_at, created_at 
		FROM polls WHERE post_id IN (%s)
	`, strings.Join(placeholders, ",")))

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return posts
	}
	defer rows.Close()

	for rows.Next() {
		var poll models.Poll
		err := rows.Scan(
			&poll.ID, &poll.PostID, &poll.Question, &poll.MultipleChoice,
			&poll.AllowVoteChanges, &poll.ExpiresAt, &poll.CreatedAt,
		)
		if err != nil {
			continue
		}

		// Инициализируем пустые массивы
		poll.Options = []models.PollOption{}
		poll.UserVotes = []int{}
		poll.Voters = []models.PollVoter{}

		// Проверяем, истек ли опрос
		poll.IsExpired = isPollExpired(&poll)

		pollsMap[poll.PostID] = &poll
		pollsByID[poll.ID] = &poll
	}

	// Загружаем опции для всех опросов одним запросом
	if len(pollsMap) > 0 {
		pollIDs := make([]int, 0, len(pollsMap))
		for _, poll := range pollsMap {
			pollIDs = append(pollIDs, poll.ID)
		}

		optionsPlaceholders := make([]string, len(pollIDs))
		optionsArgs := make([]interface{}, len(pollIDs))
		for i, id := range pollIDs {
			optionsPlaceholders[i] = "?"
			optionsArgs[i] = id
		}

		optionsQuery := ConvertPlaceholders(fmt.Sprintf(`
			SELECT id, poll_id, option_text, votes_count, option_order 
			FROM poll_options WHERE poll_id IN (%s) ORDER BY poll_id, option_order
		`, strings.Join(optionsPlaceholders, ",")))

		optionsRows, err := db.DB.Query(optionsQuery, optionsArgs...)
		if err == nil {
			defer optionsRows.Close()

			for optionsRows.Next() {
				var option models.PollOption
				err := optionsRows.Scan(&option.ID, &option.PollID, &option.OptionText, &option.VotesCount, &option.OptionOrder)
				if err != nil {
					continue
				}

				if poll, ok := pollsByID[option.PollID]; ok {
					poll.Options = append(poll.Options, option)
				}
			}
		}

		// Подсчитываем total_voters и user_votes одним запросом для всех опросов
		if userID > 0 {
			// Загружаем информацию о голосах пользователя одним запросом
			votesQuery := ConvertPlaceholders(fmt.Sprintf(`
				SELECT poll_id, option_id 
				FROM poll_votes 
				WHERE poll_id IN (%s) AND user_id = ?
			`, strings.Join(optionsPlaceholders, ",")))

			votesArgs := append(optionsArgs, userID)
			votesRows, err := db.DB.Query(votesQuery, votesArgs...)
			if err == nil {
				defer votesRows.Close()

				userVotesMap := make(map[int][]int) // poll_id -> []option_id
				for votesRows.Next() {
					var pollID, optionID int
					votesRows.Scan(&pollID, &optionID)
					userVotesMap[pollID] = append(userVotesMap[pollID], optionID)
				}

				// Присваиваем голоса пользователя
				for pollID, optionIDs := range userVotesMap {
					if poll, ok := pollsByID[pollID]; ok {
						poll.UserVoted = true
						poll.UserVotes = optionIDs
					}
				}
			}

			// Подсчитываем total_voters только для опросов где пользователь голосовал
			votersQuery := ConvertPlaceholders(fmt.Sprintf(`
				SELECT poll_id, COUNT(DISTINCT user_id) as total_voters
				FROM poll_votes 
				WHERE poll_id IN (%s)
				GROUP BY poll_id
			`, strings.Join(optionsPlaceholders, ",")))

			votersRows, err := db.DB.Query(votersQuery, optionsArgs...)
			if err == nil {
				defer votersRows.Close()

				for votersRows.Next() {
					var pollID, totalVoters int
					votersRows.Scan(&pollID, &totalVoters)
					if poll, ok := pollsByID[pollID]; ok {
						poll.TotalVoters = totalVoters
					}
				}
			}
		}
	}

	// Вычисляем проценты для всех опросов
	for _, poll := range pollsMap {
		if poll.UserVoted || poll.IsExpired {
			for i := range poll.Options {
				if poll.TotalVoters > 0 {
					poll.Options[i].Percentage = float64(poll.Options[i].VotesCount) / float64(poll.TotalVoters) * 100
				} else {
					poll.Options[i].Percentage = 0
				}
			}
		}
	}

	// Присваиваем опросы постам
	for i := range posts {
		if poll, ok := pollsMap[posts[i].ID]; ok {
			posts[i].Poll = poll
		}
	}

	return posts
}

// loadUsersForPostsBatch загружает данные пользователей для списка постов через Auth Service
func loadUsersForPostsBatch(posts []models.Post) []models.Post {
	if len(posts) == 0 {
		return posts
	}

	// Собираем уникальные ID пользователей
	userIDs := make(map[int]bool)
	for _, post := range posts {
		if post.AuthorType == "user" {
			userIDs[post.AuthorID] = true
		}
	}

	if len(userIDs) == 0 {
		return posts
	}

	// Загружаем данных пользователей через Auth Service
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:7100"
	}

	// Создаем map для быстрого доступа к данным пользователей
	usersMap := make(map[int]*models.User)

	for userID := range userIDs {
		resp, err := http.Get(fmt.Sprintf("%s/api/users/%d", authServiceURL, userID))
		if err != nil {
			log.Printf("❌ Failed to fetch user %d from Auth Service: %v", userID, err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			var authResp struct {
				Success bool        `json:"success"`
				Data    models.User `json:"data"`
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				log.Printf("❌ Failed to read Auth Service response for user %d: %v", userID, err)
				continue
			}

			if err := json.Unmarshal(body, &authResp); err != nil {
				log.Printf("❌ Failed to unmarshal Auth Service response for user %d: %v", userID, err)
				continue
			}

			if authResp.Success {
				usersMap[userID] = &authResp.Data
			}
		}
	}

	log.Printf("✅ Loaded %d users from Auth Service for %d posts", len(usersMap), len(posts))

	// Присваиваем данные пользователей постам
	for i := range posts {
		if posts[i].AuthorType == "user" {
			if user, ok := usersMap[posts[i].AuthorID]; ok {
				posts[i].User = user
			}
		}
	}

	return posts
}
