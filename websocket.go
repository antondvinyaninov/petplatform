package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
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

		// 3. Создаем WebSocket соединение к backend
		backendURL := service.URL
		backendURL = strings.Replace(backendURL, "http://", "ws://", 1)
		backendURL = strings.Replace(backendURL, "https://", "wss://", 1)
		backendURL += "/ws"

		// Создаем заголовки для backend
		backendHeaders := http.Header{}
		backendHeaders.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
		backendHeaders.Set("X-User-Email", claims.Email)
		backendHeaders.Set("X-User-Role", claims.Role)

		log.Printf("🔧 Connecting to backend WebSocket: %s", backendURL)
		log.Printf("🔧 Headers: X-User-ID=%d, X-User-Email=%s, X-User-Role=%s",
			claims.UserID, claims.Email, claims.Role)

		// Подключаемся к backend
		dialer := websocket.Dialer{}
		backendConn, resp, err := dialer.Dial(backendURL, backendHeaders)
		if err != nil {
			log.Printf("❌ Failed to connect to backend WebSocket: %v", err)
			if resp != nil {
				log.Printf("❌ Backend response status: %d", resp.StatusCode)
			}
			http.Error(w, "Backend unavailable", http.StatusBadGateway)
			return
		}
		defer backendConn.Close()

		log.Printf("✅ Connected to backend WebSocket for user_id=%d", claims.UserID)

		// 4. Upgrade клиентского соединения
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				allowedOrigins := map[string]bool{
					"https://my-projects-zooplatforma.crv1ic.easypanel.host": true,
					"https://my-projects-gateway-zp.crv1ic.easypanel.host":   true,
					"http://localhost:3000":                                  true,
				}
				return allowedOrigins[origin]
			},
		}

		clientConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("❌ Failed to upgrade client connection: %v", err)
			return
		}
		defer clientConn.Close()

		log.Printf("✅ Client WebSocket upgraded for user_id=%d", claims.UserID)

		// 5. Проксируем сообщения в обе стороны
		errChan := make(chan error, 2)

		// Client -> Backend
		go func() {
			for {
				messageType, message, err := clientConn.ReadMessage()
				if err != nil {
					if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
						log.Printf("❌ Client read error: %v", err)
					}
					errChan <- err
					return
				}

				if err := backendConn.WriteMessage(messageType, message); err != nil {
					log.Printf("❌ Backend write error: %v", err)
					errChan <- err
					return
				}
			}
		}()

		// Backend -> Client
		go func() {
			for {
				messageType, message, err := backendConn.ReadMessage()
				if err != nil {
					if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
						log.Printf("❌ Backend read error: %v", err)
					}
					errChan <- err
					return
				}

				if err := clientConn.WriteMessage(messageType, message); err != nil {
					log.Printf("❌ Client write error: %v", err)
					errChan <- err
					return
				}
			}
		}()

		// Ждем ошибки или закрытия
		err = <-errChan
		log.Printf("🔌 WebSocket closed for user_id=%d: %v", claims.UserID, err)
	}
}
