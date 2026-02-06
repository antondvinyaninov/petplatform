package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"
)

// CORS Middleware
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Список разрешенных origins
		allowedOrigins := map[string]bool{
			"http://localhost:3000":       true,
			"https://zooplatforma.ru":     true,
			"https://www.zooplatforma.ru": true,
		}

		// Устанавливаем CORS заголовки только если origin разрешен
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-User-ID, X-User-Email, X-User-Role")
			w.Header().Set("Access-Control-Max-Age", "3600")
		}

		// Обрабатываем preflight запросы
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logging Middleware
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Создаем ResponseWriter который запоминает status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)
		log.Printf("📋 %s %s %d %dms %s",
			r.Method,
			r.URL.Path,
			rw.statusCode,
			duration.Milliseconds(),
			r.RemoteAddr,
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Rate Limiting Middleware
var (
	visitors = make(map[string]*rate.Limiter)
	mu       sync.Mutex
)

func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		mu.Lock()
		limiter, exists := visitors[ip]
		if !exists {
			limiter = rate.NewLimiter(100, 200) // 100 req/sec, burst 200
			visitors[ip] = limiter
		}
		mu.Unlock()

		if !limiter.Allow() {
			log.Printf("⚠️  Rate limit exceeded: %s %s from %s", r.Method, r.URL.Path, ip)
			respondError(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Auth Middleware для роутера
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Получаем токен из заголовка или cookie
		tokenString := extractToken(r)
		if tokenString == "" {
			respondError(w, "Authorization required", http.StatusUnauthorized)
			return
		}

		// Парсим и валидируем токен
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			log.Printf("❌ Invalid token: %v", err)
			respondError(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Получаем пользователя из БД с ролью
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

		err = db.QueryRow(query, claims.UserID).Scan(
			&user.ID, &user.Email, &user.Name, &lastName,
			&bio, &phone, &location, &avatar,
			&coverPhoto, &user.ProfileVisibility, &user.ShowPhone,
			&user.ShowEmail, &user.AllowMessages, &user.ShowOnline,
			&user.Verified, &user.CreatedAt, &user.Role,
		)

		if err == sql.ErrNoRows {
			respondError(w, "User not found", http.StatusUnauthorized)
			return
		}
		if err != nil {
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

		log.Printf("✅ Authenticated: user_id=%d, email=%s, role=%s", user.ID, user.Email, user.Role)

		// Добавляем пользователя в контекст
		ctx := context.WithValue(r.Context(), "user", &user)

		// Добавляем заголовки для backend
		r.Header.Set("X-User-ID", fmt.Sprintf("%d", user.ID))
		r.Header.Set("X-User-Email", user.Email)
		r.Header.Set("X-User-Role", user.Role)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Auth Middleware для отдельных хендлеров
func AuthMiddlewareFunc(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		AuthMiddleware(next).ServeHTTP(w, r)
	}
}

// Admin Middleware
func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := r.Context().Value("user").(*User)

		if user.Role != "admin" && user.Role != "superadmin" {
			log.Printf("⚠️  Access denied: user_id=%d, role=%s tried to access admin endpoint", user.ID, user.Role)
			respondError(w, "Admin access required", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func extractToken(r *http.Request) string {
	// Сначала проверяем заголовок Authorization
	bearerToken := r.Header.Get("Authorization")
	if len(bearerToken) > 7 && strings.ToUpper(bearerToken[0:7]) == "BEARER " {
		return bearerToken[7:]
	}

	// Затем проверяем cookie
	cookie, err := r.Cookie("auth_token")
	if err == nil {
		return cookie.Value
	}

	return ""
}
