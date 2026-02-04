package middleware

import (
	"backend/db"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTConfig содержит конфигурацию для JWT middleware
type JWTConfig struct {
	Secret         string
	TokenLookup    string // "header:Authorization,cookie:auth_token,query:token"
	AuthScheme     string // "Bearer"
	ContextKey     string // ключ для сохранения claims в контексте
	SkipperFunc    func(*http.Request) bool
	ErrorHandler   func(http.ResponseWriter, *http.Request, error)
	SuccessHandler func(http.ResponseWriter, *http.Request, jwt.MapClaims)
}

// DefaultJWTConfig возвращает конфигурацию по умолчанию
func DefaultJWTConfig() JWTConfig {
	return JWTConfig{
		Secret:      os.Getenv("JWT_SECRET"),
		TokenLookup: "header:Authorization,cookie:auth_token,query:token",
		AuthScheme:  "Bearer",
		ContextKey:  "user",
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("❌ JWT Error: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"success":false,"error":"Unauthorized"}`))
		},
		SuccessHandler: func(w http.ResponseWriter, r *http.Request, claims jwt.MapClaims) {
			// Обновляем активность пользователя
			if userID, ok := claims["user_id"].(float64); ok {
				updateUserActivityFromClaims(int(userID))
			}
		},
	}
}

// JWTMiddleware создает middleware для проверки JWT токенов
func JWTMiddleware(config JWTConfig) func(http.HandlerFunc) http.HandlerFunc {
	if config.Secret == "" {
		panic("JWT Secret is required")
	}

	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// Проверяем, нужно ли пропустить этот запрос
			if config.SkipperFunc != nil && config.SkipperFunc(r) {
				next(w, r)
				return
			}

			// Проверяем заголовки от Gateway (приоритет)
			if r.Header.Get("X-User-ID") != "" {
				log.Printf("✅ Using headers from Gateway")
				AuthMiddleware(next)(w, r)
				return
			}

			// Извлекаем токен из разных источников
			token := extractToken(r, config)
			if token == "" {
				config.ErrorHandler(w, r, fmt.Errorf("token not found"))
				return
			}

			// Валидируем токен
			claims, err := validateToken(token, config.Secret)
			if err != nil {
				config.ErrorHandler(w, r, err)
				return
			}

			// Проверяем expiration
			if exp, ok := claims["exp"].(float64); ok {
				if time.Now().Unix() > int64(exp) {
					config.ErrorHandler(w, r, fmt.Errorf("token expired"))
					return
				}
			}

			// Вызываем success handler
			if config.SuccessHandler != nil {
				config.SuccessHandler(w, r, claims)
			}

			// Добавляем claims в контекст
			ctx := addClaimsToContext(r.Context(), claims)

			log.Printf("✅ JWT validated: user_id=%v, email=%v", claims["user_id"], claims["email"])

			next(w, r.WithContext(ctx))
		}
	}
}

// OptionalJWTMiddleware - опциональная проверка JWT (не требует токен)
func OptionalJWTMiddleware(config JWTConfig) func(http.HandlerFunc) http.HandlerFunc {
	if config.Secret == "" {
		panic("JWT Secret is required")
	}

	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// Проверяем заголовки от Gateway
			if r.Header.Get("X-User-ID") != "" {
				OptionalAuthMiddleware(next)(w, r)
				return
			}

			// Извлекаем токен
			token := extractToken(r, config)
			if token == "" {
				// Нет токена - пропускаем без авторизации
				next(w, r)
				return
			}

			// Валидируем токен
			claims, err := validateToken(token, config.Secret)
			if err != nil {
				// Невалидный токен - пропускаем без авторизации
				log.Printf("⚠️ Invalid token (optional): %v", err)
				next(w, r)
				return
			}

			// Проверяем expiration
			if exp, ok := claims["exp"].(float64); ok {
				if time.Now().Unix() > int64(exp) {
					// Токен истек - пропускаем без авторизации
					next(w, r)
					return
				}
			}

			// Обновляем активность
			if config.SuccessHandler != nil {
				config.SuccessHandler(w, r, claims)
			}

			// Добавляем claims в контекст
			ctx := addClaimsToContext(r.Context(), claims)

			log.Printf("✅ Optional JWT validated: user_id=%v", claims["user_id"])

			next(w, r.WithContext(ctx))
		}
	}
}

// extractToken извлекает токен из запроса согласно TokenLookup
func extractToken(r *http.Request, config JWTConfig) string {
	sources := strings.Split(config.TokenLookup, ",")

	for _, source := range sources {
		parts := strings.Split(strings.TrimSpace(source), ":")
		if len(parts) != 2 {
			continue
		}

		switch parts[0] {
		case "header":
			token := r.Header.Get(parts[1])
			if token != "" {
				// Убираем схему авторизации (Bearer)
				if config.AuthScheme != "" && strings.HasPrefix(token, config.AuthScheme+" ") {
					return strings.TrimPrefix(token, config.AuthScheme+" ")
				}
				return token
			}

		case "cookie":
			cookie, err := r.Cookie(parts[1])
			if err == nil && cookie.Value != "" {
				return cookie.Value
			}

		case "query":
			token := r.URL.Query().Get(parts[1])
			if token != "" {
				return token
			}
		}
	}

	return ""
}

// validateToken проверяет JWT токен и возвращает claims
func validateToken(tokenString, secret string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Проверяем алгоритм подписи
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// addClaimsToContext добавляет данные из claims в контекст
func addClaimsToContext(ctx context.Context, claims jwt.MapClaims) context.Context {
	// Добавляем все claims
	ctx = context.WithValue(ctx, "claims", claims)

	// Добавляем отдельные поля для удобства
	if userID, ok := claims["user_id"].(float64); ok {
		ctx = context.WithValue(ctx, "userID", int(userID))
	}
	if email, ok := claims["email"].(string); ok {
		ctx = context.WithValue(ctx, "userEmail", email)
	}
	if role, ok := claims["role"].(string); ok {
		ctx = context.WithValue(ctx, "userRole", role)
	}

	return ctx
}

// updateUserActivityFromClaims обновляет активность пользователя
func updateUserActivityFromClaims(userID int) {
	query := convertPlaceholdersJWT(`
		INSERT INTO user_activity (user_id, last_seen)
		VALUES (?, NOW())
		ON CONFLICT(user_id) DO UPDATE SET
			last_seen = NOW()
	`)

	_, err := db.DB.Exec(query, userID)
	if err != nil {
		log.Printf("⚠️ Failed to update user activity for user %d: %v", userID, err)
	}
}

// convertPlaceholdersJWT конвертирует ? в $1, $2, $3 для PostgreSQL
func convertPlaceholdersJWT(query string) string {
	if os.Getenv("ENVIRONMENT") == "production" {
		result := ""
		paramNum := 1
		for _, char := range query {
			if char == '?' {
				result += fmt.Sprintf("$%d", paramNum)
				paramNum++
			} else {
				result += string(char)
			}
		}
		return result
	}
	return query
}

// GetUserIDFromContext извлекает userID из контекста
func GetUserIDFromContext(ctx context.Context) (int, bool) {
	userID, ok := ctx.Value("userID").(int)
	return userID, ok
}

// GetUserEmailFromContext извлекает email из контекста
func GetUserEmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value("userEmail").(string)
	return email, ok
}

// GetUserRoleFromContext извлекает role из контекста
func GetUserRoleFromContext(ctx context.Context) (string, bool) {
	role, ok := ctx.Value("userRole").(string)
	return role, ok
}

// GetClaimsFromContext извлекает все claims из контекста
func GetClaimsFromContext(ctx context.Context) (jwt.MapClaims, bool) {
	claims, ok := ctx.Value("claims").(jwt.MapClaims)
	return claims, ok
}
