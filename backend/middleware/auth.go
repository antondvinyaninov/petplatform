package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

var gatewayURL string

type Claims struct {
	UserID int      `json:"user_id"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
	jwt.RegisteredClaims
}

type UserResponse struct {
	Success bool `json:"success"`
	Data    struct {
		User struct {
			ID     int      `json:"id"`
			Email  string   `json:"email"`
			Name   string   `json:"name"`
			Role   string   `json:"role"`
			Roles  []string `json:"roles"`
			Avatar string   `json:"avatar"`
		} `json:"user"`
	} `json:"data"`
}

// InitGateway инициализирует URL gateway
func InitGateway(url string) {
	gatewayURL = url
	log.Printf("✅ Gateway initialized: %s\n", gatewayURL)
}

// AuthMiddleware проверяет JWT токен через gateway
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🔐 AuthMiddleware: %s %s", r.Method, r.URL.Path)
		log.Printf("  Cookies: %v", r.Cookies())

		// Получаем cookie auth_token
		cookie, err := r.Cookie("auth_token")
		if err != nil {
			log.Printf("  ❌ Cookie 'auth_token' not found: %v", err)
			SendError(w, "Не авторизован", http.StatusUnauthorized)
			return
		}

		log.Printf("  ✅ Found auth_token cookie")

		// Проверяем токен локально (быстрее чем запрос к gateway)
		claims, err := ParseToken(cookie.Value)
		if err != nil {
			log.Printf("  ❌ Failed to parse token: %v", err)
			SendError(w, "Неверный токен: "+err.Error(), http.StatusUnauthorized)
			return
		}

		log.Printf("  ✅ Token parsed: userID=%d, email=%s, roles=%v", claims.UserID, claims.Email, claims.Roles)

		// Добавляем данные в контекст
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "email", claims.Email)
		ctx = context.WithValue(ctx, "roles", claims.Roles)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// SuperAdminMiddleware проверяет роль superadmin
func SuperAdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		roles, ok := r.Context().Value("roles").([]string)
		if !ok {
			SendError(w, "Доступ запрещен", http.StatusForbidden)
			return
		}

		// Проверяем наличие роли superadmin
		hasSuperAdmin := false
		for _, role := range roles {
			if role == "superadmin" {
				hasSuperAdmin = true
				break
			}
		}

		if !hasSuperAdmin {
			SendError(w, "Доступ запрещен. Требуются права суперадмина", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ParseToken парсит JWT токен локально
func ParseToken(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET not set")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
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
		return nil, fmt.Errorf("invalid claims")
	}

	userID, ok := claims["user_id"].(float64)
	if !ok {
		return nil, fmt.Errorf("invalid user_id")
	}

	email, ok := claims["email"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid email")
	}

	// Парсим roles
	var roles []string
	if rolesInterface, ok := claims["roles"].([]interface{}); ok {
		for _, r := range rolesInterface {
			if roleStr, ok := r.(string); ok {
				roles = append(roles, roleStr)
			}
		}
	} else if role, ok := claims["role"].(string); ok {
		// Поддержка старого формата с единственным role
		roles = []string{role}
	}

	return &Claims{
		UserID: int(userID),
		Email:  email,
		Roles:  roles,
	}, nil
}

// GetUserFromGateway получает данные пользователя через gateway
func GetUserFromGateway(authToken string) (*UserResponse, error) {
	req, err := http.NewRequest("GET", gatewayURL+"/api/auth/me", nil)
	if err != nil {
		return nil, err
	}

	req.AddCookie(&http.Cookie{
		Name:  "auth_token",
		Value: authToken,
	})

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gateway returned status %d", resp.StatusCode)
	}

	var userResp UserResponse
	if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
		return nil, err
	}

	return &userResp, nil
}

// SendError отправляет ошибку в JSON формате
func SendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
	})
}
