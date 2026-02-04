package main

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigins := map[string]bool{
			"http://localhost:3000":                                  true,
			"https://my-projects-zooplatforma.crv1ic.easypanel.host": true,
			"https://my-projects-gateway-zp.crv1ic.easypanel.host":   true,
		}
		return allowedOrigins[origin]
	},
}

func WebSocketProxyHandler(service *Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Проверяем JWT токен
		tokenString := extractToken(r)
		if tokenString == "" {
			log.Printf("❌ WebSocket: No token provided")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Валидируем токен
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			log.Printf("❌ WebSocket: Invalid token: %v", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		log.Printf("✅ WebSocket auth: user_id=%d, email=%s", claims.UserID, claims.Email)

		// 2. Формируем URL для backend WebSocket
		backendURL, err := url.Parse(service.URL)
		if err != nil {
			log.Printf("❌ Failed to parse backend URL: %v", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Меняем схему на ws:// или wss://
		if backendURL.Scheme == "https" {
			backendURL.Scheme = "wss"
		} else {
			backendURL.Scheme = "ws"
		}
		backendURL.Path = r.URL.Path
		backendURL.RawQuery = r.URL.RawQuery

		// 3. Upgrade клиентского соединения
		clientConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("❌ Failed to upgrade client connection: %v", err)
			return
		}
		defer clientConn.Close()

		// 4. Подключаемся к backend WebSocket с заголовками авторизации
		headers := http.Header{}
		headers.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
		headers.Set("X-User-Email", claims.Email)
		headers.Set("X-User-Role", claims.Role)

		backendConn, _, err := websocket.DefaultDialer.Dial(backendURL.String(), headers)
		if err != nil {
			log.Printf("❌ Failed to connect to backend WebSocket: %v", err)
			clientConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Backend unavailable"))
			return
		}
		defer backendConn.Close()

		log.Printf("✅ WebSocket proxy established: user_id=%d, path=%s", claims.UserID, r.URL.Path)

		// 5. Проксируем сообщения в обе стороны
		errChan := make(chan error, 2)

		// Client -> Backend
		go func() {
			for {
				messageType, message, err := clientConn.ReadMessage()
				if err != nil {
					errChan <- err
					return
				}
				if err := backendConn.WriteMessage(messageType, message); err != nil {
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
					errChan <- err
					return
				}
				if err := clientConn.WriteMessage(messageType, message); err != nil {
					errChan <- err
					return
				}
			}
		}()

		// Ждем ошибки или закрытия соединения
		err = <-errChan
		if err != nil && !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
			log.Printf("⚠️  WebSocket error: user_id=%d, error=%v", claims.UserID, err)
		}

		log.Printf("🔌 WebSocket closed: user_id=%d, path=%s", claims.UserID, r.URL.Path)
	}
}
