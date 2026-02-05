package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID                int       `json:"id"`
	Email             string    `json:"email"`
	PasswordHash      string    `json:"-"`
	Name              string    `json:"name"`
	LastName          string    `json:"last_name"`
	Bio               *string   `json:"bio"`
	Phone             *string   `json:"phone"`
	Location          *string   `json:"location"`
	Avatar            *string   `json:"avatar"`
	CoverPhoto        *string   `json:"cover_photo"`
	ProfileVisibility string    `json:"profile_visibility"`
	ShowPhone         string    `json:"show_phone"`     // "nobody", "friends", "public"
	ShowEmail         string    `json:"show_email"`     // "nobody", "friends", "public"
	AllowMessages     string    `json:"allow_messages"` // "nobody", "friends", "public"
	ShowOnline        string    `json:"show_online"`    // "yes", "no"
	Verified          bool      `json:"verified"`
	Role              string    `json:"role"`
	CreatedAt         time.Time `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	LastName string `json:"last_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Валидация
	if req.Email == "" || req.Password == "" || req.Name == "" {
		respondError(w, "Email, password and name are required", http.StatusBadRequest)
		return
	}

	// Хешируем пароль
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Начинаем транзакцию
	tx, err := db.Begin()
	if err != nil {
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Создаем пользователя
	query := `INSERT INTO users (email, password, name, last_name) 
	          VALUES ($1, $2, $3, $4) RETURNING id, created_at`

	var user User
	user.Email = req.Email
	user.Name = req.Name
	user.LastName = req.LastName
	user.Role = "user"
	user.PasswordHash = string(hashedPassword)

	err = tx.QueryRow(query, req.Email, string(hashedPassword), req.Name, req.LastName).
		Scan(&user.ID, &user.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "users_email_key") {
			respondError(w, "Email already exists", http.StatusConflict)
			return
		}
		respondError(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Добавляем роль 'user' в user_roles
	roleQuery := `INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')`
	_, err = tx.Exec(roleQuery, user.ID)
	if err != nil {
		respondError(w, "Failed to assign role", http.StatusInternalServerError)
		return
	}

	// Коммитим транзакцию
	if err := tx.Commit(); err != nil {
		respondError(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Создаем JWT токен
	token, err := createToken(&user)
	if err != nil {
		respondError(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	// Устанавливаем cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 7 дней
	})

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "User registered successfully",
		"token":   token,
		"user":    user,
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Failed to decode login request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 Login attempt for: %s", req.Email)

	// Находим пользователя с ролью и всеми полями
	var user User
	var lastName, bio, phone, location, avatar, coverPhoto sql.NullString

	query := `
		SELECT u.id, u.email, u.password, u.name, u.last_name, 
		       u.bio, u.phone, u.location, u.avatar, u.cover_photo,
		       u.profile_visibility, u.show_phone, u.show_email, 
		       u.allow_messages, u.show_online, u.verified, u.created_at,
		       COALESCE(ur.role, 'user') as role
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
		WHERE u.email = $1
		LIMIT 1`

	log.Printf("🔍 Executing SQL query for email: %s", req.Email)

	err := db.QueryRow(query, req.Email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&lastName, &bio, &phone, &location,
		&avatar, &coverPhoto, &user.ProfileVisibility,
		&user.ShowPhone, &user.ShowEmail, &user.AllowMessages,
		&user.ShowOnline, &user.Verified, &user.CreatedAt, &user.Role,
	)

	if err == sql.ErrNoRows {
		log.Printf("❌ User not found: %s", req.Email)
		respondError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}
	if err != nil {
		log.Printf("❌ Database error during login: %v", err)
		log.Printf("❌ Query: %s", query)
		log.Printf("❌ Email: %s", req.Email)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ User found: id=%d, email=%s, name=%s", user.ID, user.Email, user.Name)

	// Конвертируем NULL значения
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if bio.Valid {
		user.Bio = &bio.String
	}
	if phone.Valid {
		user.Phone = &phone.String
	}
	if location.Valid {
		user.Location = &location.String
	}
	if avatar.Valid {
		user.Avatar = &avatar.String
		log.Printf("🖼️  User has avatar: %s", *user.Avatar)
	}
	if coverPhoto.Valid {
		user.CoverPhoto = &coverPhoto.String
	}

	// Проверяем пароль
	log.Printf("🔍 Verifying password for user: %s", req.Email)
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("❌ Invalid password for user: %s", req.Email)
		respondError(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	log.Printf("✅ Password verified for user: %s", req.Email)

	// Создаем JWT токен
	log.Printf("🔍 Creating JWT token for user: %s", req.Email)
	token, err := createToken(&user)
	if err != nil {
		log.Printf("❌ Failed to create token: %v", err)
		respondError(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ JWT token created for user: %s", req.Email)

	// Устанавливаем cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("ENVIRONMENT") == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 7 дней
	})

	log.Printf("✅ Login successful for user: %s (id=%d, role=%s)", req.Email, user.ID, user.Role)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Login successful",
		"token":   token,
		"user":    user,
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Удаляем cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Logout successful",
	})
}

func MeHandler(w http.ResponseWriter, r *http.Request) {
	// Получаем userID из контекста (установлен в AuthMiddleware)
	contextUser := r.Context().Value("user").(*User)
	userID := contextUser.ID

	log.Printf("🔍 Fetching fresh user data for user_id=%d", userID)

	// ВАЖНО: Читаем СВЕЖИЕ данные из БД, а не из JWT токена
	var user User
	var lastName, bio, phone, location, avatar, coverPhoto sql.NullString

	query := `
		SELECT u.id, u.email, u.name, u.last_name,
		       u.bio, u.phone, u.location, u.avatar, u.cover_photo,
		       u.profile_visibility, u.show_phone, u.show_email,
		       u.allow_messages, u.show_online, u.verified, u.created_at,
		       COALESCE(ur.role, 'user') as role
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
		WHERE u.id = $1
		LIMIT 1`

	err := db.QueryRow(query, userID).Scan(
		&user.ID, &user.Email, &user.Name, &lastName,
		&bio, &phone, &location, &avatar,
		&coverPhoto, &user.ProfileVisibility, &user.ShowPhone,
		&user.ShowEmail, &user.AllowMessages, &user.ShowOnline,
		&user.Verified, &user.CreatedAt, &user.Role,
	)

	if err == sql.ErrNoRows {
		log.Printf("❌ User not found: id=%d", userID)
		respondError(w, "User not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("❌ Database error in MeHandler: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Конвертируем NULL значения
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if bio.Valid {
		user.Bio = &bio.String
	}
	if phone.Valid {
		user.Phone = &phone.String
	}
	if location.Valid {
		user.Location = &location.String
	}
	if avatar.Valid {
		user.Avatar = &avatar.String
	}
	if coverPhoto.Valid {
		user.CoverPhoto = &coverPhoto.String
	}

	log.Printf("✅ Fresh user data fetched: id=%d, name=%s, last_name=%s", user.ID, user.Name, user.LastName)

	respondJSON(w, map[string]interface{}{
		"success": true,
		"user":    user,
	})
}

func createToken(user *User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, message string, status int) {
	w.WriteHeader(status)
	respondJSON(w, map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

type UpdateProfileRequest struct {
	Name              *string `json:"name"`
	LastName          *string `json:"last_name"` // ВАЖНО: *string для поддержки NULL
	Bio               *string `json:"bio"`
	Phone             *string `json:"phone"`
	Location          *string `json:"location"`
	ProfileVisibility *string `json:"profile_visibility"`
	ShowPhone         *string `json:"show_phone"`
	ShowEmail         *string `json:"show_email"`
	AllowMessages     *string `json:"allow_messages"`
	ShowOnline        *string `json:"show_online"`
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	// Получаем userID из контекста
	contextUser := r.Context().Value("user").(*User)
	userID := contextUser.ID

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Failed to decode update profile request: %v", err)
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("🔍 Updating profile for user %d: name=%v, last_name=%v, bio=%v, phone=%v, location=%v",
		userID, req.Name, req.LastName, req.Bio, req.Phone, req.Location)

	// Строим динамический SQL запрос (обновляем только переданные поля)
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.LastName != nil {
		updates = append(updates, fmt.Sprintf("last_name = $%d", argIndex))
		args = append(args, *req.LastName)
		argIndex++
	}
	if req.Bio != nil {
		updates = append(updates, fmt.Sprintf("bio = $%d", argIndex))
		args = append(args, *req.Bio)
		argIndex++
	}
	if req.Phone != nil {
		updates = append(updates, fmt.Sprintf("phone = $%d", argIndex))
		args = append(args, *req.Phone)
		argIndex++
	}
	if req.Location != nil {
		updates = append(updates, fmt.Sprintf("location = $%d", argIndex))
		args = append(args, *req.Location)
		argIndex++
	}
	if req.ProfileVisibility != nil {
		updates = append(updates, fmt.Sprintf("profile_visibility = $%d", argIndex))
		args = append(args, *req.ProfileVisibility)
		argIndex++
	}
	if req.ShowPhone != nil {
		updates = append(updates, fmt.Sprintf("show_phone = $%d", argIndex))
		args = append(args, *req.ShowPhone)
		argIndex++
	}
	if req.ShowEmail != nil {
		updates = append(updates, fmt.Sprintf("show_email = $%d", argIndex))
		args = append(args, *req.ShowEmail)
		argIndex++
	}
	if req.AllowMessages != nil {
		updates = append(updates, fmt.Sprintf("allow_messages = $%d", argIndex))
		args = append(args, *req.AllowMessages)
		argIndex++
	}
	if req.ShowOnline != nil {
		updates = append(updates, fmt.Sprintf("show_online = $%d", argIndex))
		args = append(args, *req.ShowOnline)
		argIndex++
	}

	if len(updates) == 0 {
		respondError(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Добавляем userID в конец
	args = append(args, userID)

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d", strings.Join(updates, ", "), argIndex)
	log.Printf("🔍 SQL Query: %s", query)
	log.Printf("🔍 SQL Args: %v", args)

	_, err := db.Exec(query, args...)
	if err != nil {
		log.Printf("❌ Failed to update profile: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Profile updated for user %d", userID)

	// Возвращаем обновленные данные
	var user User
	var lastName, bio, phone, location, avatar, coverPhoto sql.NullString

	selectQuery := `
		SELECT u.id, u.email, u.name, u.last_name,
		       u.bio, u.phone, u.location, u.avatar, u.cover_photo,
		       u.profile_visibility, u.show_phone, u.show_email,
		       u.allow_messages, u.show_online, u.verified, u.created_at,
		       COALESCE(ur.role, 'user') as role
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
		WHERE u.id = $1
		LIMIT 1`

	err = db.QueryRow(selectQuery, userID).Scan(
		&user.ID, &user.Email, &user.Name, &lastName,
		&bio, &phone, &location, &avatar,
		&coverPhoto, &user.ProfileVisibility, &user.ShowPhone,
		&user.ShowEmail, &user.AllowMessages, &user.ShowOnline,
		&user.Verified, &user.CreatedAt, &user.Role,
	)

	if err != nil {
		log.Printf("❌ Failed to fetch updated user: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Конвертируем NULL значения
	if lastName.Valid {
		user.LastName = lastName.String
	}
	if bio.Valid {
		user.Bio = &bio.String
	}
	if phone.Valid {
		user.Phone = &phone.String
	}
	if location.Valid {
		user.Location = &location.String
	}
	if avatar.Valid {
		user.Avatar = &avatar.String
	}
	if coverPhoto.Valid {
		user.CoverPhoto = &coverPhoto.String
	}

	respondJSON(w, map[string]interface{}{
		"success": true,
		"message": "Profile updated successfully",
		"user":    user,
	})
}
