package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

func WebSocketProxyHandler(service *Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Читаем токен из cookie или query
		var tokenString string

		cookie, err := r.Cookie("auth_token")
		if err == nil {
			tokenString = cookie.Value
		}

		if tokenString == "" {
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			log.Printf("❌ WebSocket: No token provided")
			http.Error(w, "Unauthorized: no token", http.StatusUnauthorized)
			return
		}

		// 2. Валидируем токен
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			log.Printf("❌ WebSocket: Invalid token: %v", err)
			http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
			return
		}

		log.Printf("✅ WebSocket auth: user_id=%d, email=%s", claims.UserID, claims.Email)

		// 3. Создаем ReverseProxy с правильной настройкой
		target, err := url.Parse(service.URL)
		if err != nil {
			log.Printf("❌ Failed to parse backend URL: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(target)

		// Настраиваем Director для WebSocket
		originalDirector := proxy.Director
		proxy.Director = func(req *http.Request) {
			originalDirector(req)

			// Устанавливаем путь и хост
			req.URL.Path = "/ws"
			req.Host = target.Host

			// КРИТИЧНО: Добавляем заголовки X-User-* для backend
			req.Header.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
			req.Header.Set("X-User-Email", claims.Email)
			req.Header.Set("X-User-Role", claims.Role)

			log.Printf("🔧 WebSocket headers set: X-User-ID=%d, X-User-Email=%s, X-User-Role=%s",
				claims.UserID, claims.Email, claims.Role)
		}

		// ModifyResponse для WebSocket (пропускаем без изменений)
		proxy.ModifyResponse = func(resp *http.Response) error {
			return nil
		}

		// Проксируем запрос
		proxy.ServeHTTP(w, r)

		log.Printf("✅ WebSocket proxied for user_id=%d", claims.UserID)
	}
}
