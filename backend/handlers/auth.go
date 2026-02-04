package handlers

import (
	"backend/db"
	"backend/models"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// logSystemEvent - логирует событие в системе
func logSystemEvent(level, category, action, message string, userID *int, ipAddress string) {
	query := `
		INSERT INTO system_logs (level, category, action, message, user_id, ip_address, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	db.DB.Exec(query, level, category, action, message, userID, ipAddress, time.Now())
}

// getUserRoles получает роли пользователя из таблицы admins
func getUserRoles(userID int) []string {
	roles := []string{"user"} // По умолчанию все пользователи имеют роль "user"

	// Проверяем, есть ли у пользователя роль админа
	var adminRole string
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT role FROM admins WHERE user_id = ?"), userID).Scan(&adminRole)
	if err == nil {
		roles = append(roles, adminRole)
	}

	return roles
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		sendError(w, "Имя, email и пароль обязательны", http.StatusBadRequest)
		return
	}

	// 🔥 НОВОЕ: Используем Auth Service
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:7100"
	}

	// Отправляем запрос к Auth Service
	jsonData, _ := json.Marshal(req)
	resp, err := http.Post(authServiceURL+"/api/auth/register", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("❌ Auth Service error: %v", err)
		sendError(w, "Auth service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Читаем ответ от Auth Service
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		// Передаем ошибку от Auth Service
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	// Парсим ответ
	var authResp struct {
		Success bool `json:"success"`
		Data    struct {
			Token string `json:"token"`
			User  struct {
				ID    int    `json:"id"`
				Email string `json:"email"`
				Name  string `json:"name"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &authResp); err != nil {
		sendError(w, "Invalid auth response", http.StatusInternalServerError)
		return
	}

	// ✅ Синхронизируем пользователя с основной БД
	_, err = db.DB.Exec(ConvertPlaceholders(`
		INSERT INTO users (id, name, email, created_at)
		VALUES (?, ?, ?, NOW())
		ON CONFLICT (id) DO NOTHING
	`), authResp.Data.User.ID, authResp.Data.User.Name, authResp.Data.User.Email)

	if err != nil {
		log.Printf("⚠️ Failed to sync user to main DB: %v", err)
		// Не критично - продолжаем
	} else {
		log.Printf("✅ User synced to main DB: id=%d, email=%s", authResp.Data.User.ID, authResp.Data.User.Email)
	}

	// Устанавливаем cookie с токеном от Auth Service
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    authResp.Data.Token,
		Path:     "/",
		Domain:   "localhost", // ✅ Cookie работает для всех портов localhost
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode, // Lax для localhost
		MaxAge:   86400 * 7,            // 7 days
	})

	// Логируем регистрацию
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	userID := authResp.Data.User.ID
	CreateUserLog(db.DB, userID, "register", "Пользователь зарегистрировался через Auth Service", ipAddress, userAgent)

	// Возвращаем ответ клиенту
	w.Write(body)

	log.Printf("✅ User registered via Auth Service: %s", authResp.Data.User.Email)
}

func MeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get token from Authorization header (priority) or cookie
	var token string

	// 1. Try Authorization header first
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		// Remove "Bearer " prefix if present
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
		} else {
			token = authHeader
		}
	}

	// 2. If no header, try cookie
	if token == "" {
		cookie, err := r.Cookie("auth_token")
		if err != nil {
			sendError(w, "Не авторизован", http.StatusUnauthorized)
			return
		}
		token = cookie.Value
	}

	// 3. If still no token, return 401
	if token == "" {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// 🔥 DEV MODE: Работаем с локальной БД напрямую если AUTH_SERVICE_URL не установлен
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")

	if authServiceURL == "" {
		// Локальный режим - валидируем JWT и получаем данные из БД
		log.Printf("🔧 Dev mode: Using local database")

		// Валидируем JWT токен
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			sendError(w, "Server configuration error", http.StatusInternalServerError)
			return
		}

		parsedToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !parsedToken.Valid {
			sendError(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		claims, ok := parsedToken.Claims.(jwt.MapClaims)
		if !ok {
			sendError(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		userID := int(claims["user_id"].(float64))

		// Получаем данные пользователя из локальной БД
		var user models.User
		var lastName, bio, phone, location, avatar, coverPhoto sql.NullString

		query := ConvertPlaceholders(`SELECT id, name, last_name, email, bio, phone, location, avatar, cover_photo,
			profile_visibility, show_phone, show_email, allow_messages, show_online, verified, created_at 
			FROM users WHERE id = ?`)

		err = db.DB.QueryRow(query, userID).Scan(
			&user.ID, &user.Name, &lastName, &user.Email, &bio, &phone,
			&location, &avatar, &coverPhoto,
			&user.ProfileVisibility, &user.ShowPhone, &user.ShowEmail, &user.AllowMessages, &user.ShowOnline,
			&user.Verified, &user.CreatedAt,
		)

		if err != nil {
			log.Printf("❌ Failed to get user from DB: %v", err)
			sendError(w, "User not found", http.StatusNotFound)
			return
		}

		// Конвертируем NULL значения
		if lastName.Valid {
			user.LastName = lastName.String
		}
		if bio.Valid {
			user.Bio = bio.String
		}
		if phone.Valid {
			user.Phone = phone.String
		}
		if location.Valid {
			user.Location = location.String
		}
		if avatar.Valid {
			user.Avatar = avatar.String
		}
		if coverPhoto.Valid {
			user.CoverPhoto = coverPhoto.String
		}

		// Формируем ответ
		response := map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"user": map[string]interface{}{
					"id":                 user.ID,
					"name":               user.Name,
					"last_name":          user.LastName,
					"email":              user.Email,
					"bio":                user.Bio,
					"phone":              user.Phone,
					"location":           user.Location,
					"avatar":             user.Avatar,
					"cover_photo":        user.CoverPhoto,
					"profile_visibility": user.ProfileVisibility,
					"show_phone":         user.ShowPhone,
					"show_email":         user.ShowEmail,
					"allow_messages":     user.AllowMessages,
					"show_online":        user.ShowOnline,
					"verified":           user.Verified,
					"created_at":         user.CreatedAt,
				},
				"token": token,
			},
			"token": token,
		}

		json.NewEncoder(w).Encode(response)
		log.Printf("✅ User profile loaded from local DB: %s (id=%d)", user.Email, user.ID)
		return
	}

	// PRODUCTION MODE: Используем Auth Service (Gateway)
	log.Printf("🌐 Production mode: Using Auth Service at %s", authServiceURL)

	// Создаем запрос к Auth Service
	req, err := http.NewRequest("GET", authServiceURL+"/api/auth/me", nil)
	if err != nil {
		log.Printf("❌ Failed to create request: %v", err)
		sendError(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Добавляем токен в заголовок
	req.Header.Set("Authorization", "Bearer "+token)

	// Отправляем запрос
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("❌ Auth Service error: %v", err)
		sendError(w, "Auth service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Читаем ответ
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		// Передаем ошибку от Auth Service
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	// Парсим ответ от Auth Service
	var authResp struct {
		Success bool `json:"success"`
		Data    struct {
			User struct {
				ID                int    `json:"id"`
				Email             string `json:"email"`
				Name              string `json:"name"`
				LastName          string `json:"last_name"`
				Bio               string `json:"bio"`
				Phone             string `json:"phone"`
				Location          string `json:"location"`
				Avatar            string `json:"avatar"`
				CoverPhoto        string `json:"cover_photo"`
				ProfileVisibility string `json:"profile_visibility"`
				ShowPhone         string `json:"show_phone"`
				ShowEmail         string `json:"show_email"`
				AllowMessages     string `json:"allow_messages"`
				ShowOnline        string `json:"show_online"`
				Verified          bool   `json:"verified"`
				CreatedAt         string `json:"created_at"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &authResp); err != nil {
		log.Printf("❌ Failed to parse auth response: %v", err)
		sendError(w, "Invalid auth response", http.StatusInternalServerError)
		return
	}

	log.Printf("🔍 Received from Auth Service: last_name=%s, phone=%s, location=%s, bio=%s",
		authResp.Data.User.LastName, authResp.Data.User.Phone, authResp.Data.User.Location, authResp.Data.User.Bio)

	// Формируем ответ в формате Main Backend (передаем ВСЕ поля от Auth Service)
	response := map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"user": map[string]interface{}{
				"id":                 authResp.Data.User.ID,
				"name":               authResp.Data.User.Name,
				"last_name":          authResp.Data.User.LastName,
				"email":              authResp.Data.User.Email,
				"bio":                authResp.Data.User.Bio,
				"phone":              authResp.Data.User.Phone,
				"location":           authResp.Data.User.Location,
				"avatar":             authResp.Data.User.Avatar,
				"cover_photo":        authResp.Data.User.CoverPhoto,
				"profile_visibility": authResp.Data.User.ProfileVisibility,
				"show_phone":         authResp.Data.User.ShowPhone,
				"show_email":         authResp.Data.User.ShowEmail,
				"allow_messages":     authResp.Data.User.AllowMessages,
				"show_online":        authResp.Data.User.ShowOnline,
				"verified":           authResp.Data.User.Verified,
				"created_at":         authResp.Data.User.CreatedAt,
			},
			"token": token,
		},
		"token": token,
	}

	json.NewEncoder(w).Encode(response)
	log.Printf("✅ User profile loaded via Auth Service: %s", authResp.Data.User.Email)
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Получаем user_id из контекста (если есть) для логирования
	// Но не требуем авторизации для logout
	cookie, _ := r.Cookie("auth_token")
	if cookie != nil {
		// Можно попробовать получить user_id через Auth Service, но это не критично
		// Просто логируем что кто-то вышел
		ipAddress := r.RemoteAddr
		log.Printf("🔓 User logged out from IP: %s", ipAddress)
	}

	// Clear cookie (для всех поддоменов)
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		Domain:   "localhost", // ✅ Cookie работает для всех портов localhost
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode, // Lax для localhost
		MaxAge:   -1,                   // Delete cookie
	})

	sendSuccess(w, map[string]string{"message": "Logged out successfully"})
}

func VerifyTokenHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get token from cookie
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		sendError(w, "Токен не найден", http.StatusUnauthorized)
		return
	}

	// Verify token via Auth Service
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:7100"
	}

	req, err := http.NewRequest("GET", authServiceURL+"/api/auth/me", nil)
	if err != nil {
		sendError(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Authorization", "Bearer "+cookie.Value)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		sendError(w, "Auth service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		sendError(w, "Неверный токен", http.StatusUnauthorized)
		return
	}

	body, _ := io.ReadAll(resp.Body)

	var authResp struct {
		Success bool `json:"success"`
		Data    struct {
			User struct {
				ID    int    `json:"id"`
				Email string `json:"email"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &authResp); err != nil {
		sendError(w, "Invalid auth response", http.StatusInternalServerError)
		return
	}

	sendSuccess(w, map[string]interface{}{
		"user_id": authResp.Data.User.ID,
		"email":   authResp.Data.User.Email,
		"valid":   true,
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		sendError(w, "Email и пароль обязательны", http.StatusBadRequest)
		return
	}

	// 🔥 НОВОЕ: Используем Auth Service
	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:7100"
	}

	// Отправляем запрос к Auth Service
	jsonData, _ := json.Marshal(req)
	resp, err := http.Post(authServiceURL+"/api/auth/login", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("❌ Auth Service error: %v", err)
		sendError(w, "Auth service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	// Читаем ответ от Auth Service
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		// Передаем ошибку от Auth Service
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
		return
	}

	// Парсим ответ
	var authResp struct {
		Success bool `json:"success"`
		Data    struct {
			Token string `json:"token"`
			User  struct {
				ID    int    `json:"id"`
				Email string `json:"email"`
				Name  string `json:"name"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &authResp); err != nil {
		sendError(w, "Invalid auth response", http.StatusInternalServerError)
		return
	}

	// Устанавливаем cookie с токеном от Auth Service
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    authResp.Data.Token,
		Path:     "/",
		Domain:   "localhost", // ✅ Cookie работает для всех портов localhost
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode, // Lax для localhost
		MaxAge:   86400 * 7,            // 7 days
	})

	log.Printf("🔍 LoginHandler: Cookie set for user %s", authResp.Data.User.Email)

	// Логируем успешный вход
	ipAddress := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	userID := authResp.Data.User.ID

	log.Printf("🔍 LoginHandler: Logging system event...")
	logSystemEvent("info", "auth", "login", "Пользователь вошел в систему (Auth Service)", &userID, ipAddress)

	log.Printf("🔍 LoginHandler: Creating user log...")
	CreateUserLog(db.DB, userID, "login", "Вход в систему через Auth Service", ipAddress, userAgent)

	log.Printf("🔍 LoginHandler: Sending response...")
	// Возвращаем ответ клиенту
	w.Write(body)

	log.Printf("✅ User logged in via Auth Service: %s", authResp.Data.User.Email)
}
