package main

import (
	"log"
	"net/http"
	"net/url"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigins := map[string]bool{
			"http://localhost:3000":                                true,
			"https://my-projects-gateway-zp.crv1ic.easypanel.host": true,
		}
		return allowedOrigins[origin]
	},
}

func WebSocketProxyHandler(service *Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Формируем URL для backend WebSocket
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

		// Upgrade клиентского соединения
		clientConn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("❌ Failed to upgrade client connection: %v", err)
			return
		}
		defer clientConn.Close()

		// Подключаемся к backend WebSocket
		headers := http.Header{}
		// Копируем заголовки авторизации
		if userID := r.Header.Get("X-User-ID"); userID != "" {
			headers.Set("X-User-ID", userID)
		}
		if userEmail := r.Header.Get("X-User-Email"); userEmail != "" {
			headers.Set("X-User-Email", userEmail)
		}
		if userRole := r.Header.Get("X-User-Role"); userRole != "" {
			headers.Set("X-User-Role", userRole)
		}

		backendConn, _, err := websocket.DefaultDialer.Dial(backendURL.String(), headers)
		if err != nil {
			log.Printf("❌ Failed to connect to backend WebSocket: %v", err)
			clientConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Backend unavailable"))
			return
		}
		defer backendConn.Close()

		log.Printf("✅ WebSocket proxy established: %s", r.URL.Path)

		// Проксируем сообщения в обе стороны
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
			log.Printf("⚠️  WebSocket error: %v", err)
		}

		log.Printf("🔌 WebSocket closed: %s", r.URL.Path)
	}
}
