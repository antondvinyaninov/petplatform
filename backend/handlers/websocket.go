package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Разрешаем подключения с localhost для разработки
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000" || origin == "http://localhost:3001"
	},
}

// WebSocketMessage - структура сообщения через WebSocket
type WebSocketMessage struct {
	Type string      `json:"type"` // "unread_count", "new_message", etc.
	Data interface{} `json:"data"`
}

// Client - WebSocket клиент
type Client struct {
	UserID int
	Conn   *websocket.Conn
	Send   chan WebSocketMessage
}

// Hub - управляет WebSocket подключениями
type Hub struct {
	clients    map[int]*Client // userID -> Client
	register   chan *Client
	unregister chan *Client
	broadcast  chan WebSocketMessage
	mu         sync.RWMutex
	db         *sql.DB
}

var hub *Hub

// InitWebSocketHub - инициализирует WebSocket hub
func InitWebSocketHub(db *sql.DB) {
	hub = &Hub{
		clients:    make(map[int]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan WebSocketMessage),
		db:         db,
	}
	go hub.run()
}

// run - основной цикл hub
func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("🔌 WebSocket: User %d connected (total: %d)", client.UserID, len(h.clients))

			// Отправляем текущее количество непрочитанных сообщений
			go h.sendUnreadCount(client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("🔌 WebSocket: User %d disconnected (total: %d)", client.UserID, len(h.clients))

		case message := <-h.broadcast:
			// Broadcast to all clients
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client.UserID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// sendUnreadCount - отправляет количество непрочитанных сообщений пользователю
func (h *Hub) sendUnreadCount(userID int) {
	var count int
	err := h.db.QueryRow(`
		SELECT COUNT(*)
		FROM messages
		WHERE receiver_id = $1 AND is_read = FALSE
	`, userID).Scan(&count)

	if err != nil {
		log.Printf("❌ Error getting unread count for user %d: %v", userID, err)
		return
	}

	h.mu.RLock()
	client, ok := h.clients[userID]
	h.mu.RUnlock()

	if ok {
		client.Send <- WebSocketMessage{
			Type: "unread_count",
			Data: map[string]int{"count": count},
		}
	}
}

// NotifyUnreadCount - уведомляет пользователя об изменении количества непрочитанных
func NotifyUnreadCount(userID int) {
	if hub == nil {
		return
	}
	go hub.sendUnreadCount(userID)
}

// NotifyNewMessage - уведомляет пользователя о новом сообщении
func NotifyNewMessage(userID int, message interface{}) {
	if hub == nil {
		return
	}

	hub.mu.RLock()
	client, ok := hub.clients[userID]
	hub.mu.RUnlock()

	if ok {
		client.Send <- WebSocketMessage{
			Type: "new_message",
			Data: message,
		}
	}
}

// HandleWebSocket - обработчик WebSocket подключений
func HandleWebSocket(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем userID из контекста (установлен middleware)
		userID, ok := r.Context().Value("userID").(int)
		if !ok || userID == 0 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Upgrade HTTP connection to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("❌ WebSocket upgrade error: %v", err)
			return
		}

		// Создаем клиента
		client := &Client{
			UserID: userID,
			Conn:   conn,
			Send:   make(chan WebSocketMessage, 256),
		}

		// Регистрируем клиента
		hub.register <- client

		// Запускаем горутины для чтения и записи
		go client.writePump()
		go client.readPump()
	}
}

// writePump - отправляет сообщения клиенту
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub закрыл канал
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Отправляем JSON сообщение
			if err := c.Conn.WriteJSON(message); err != nil {
				log.Printf("❌ WebSocket write error: %v", err)
				return
			}

		case <-ticker.C:
			// Ping для поддержания соединения
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump - читает сообщения от клиента
func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg map[string]interface{}
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ WebSocket read error: %v", err)
			}
			break
		}

		// Обрабатываем сообщения от клиента (если нужно)
		log.Printf("📨 WebSocket message from user %d: %v", c.UserID, msg)
	}
}

// BroadcastToAll - отправляет сообщение всем подключенным клиентам
func BroadcastToAll(messageType string, data interface{}) {
	if hub == nil {
		return
	}

	hub.broadcast <- WebSocketMessage{
		Type: messageType,
		Data: data,
	}
}

// GetConnectedUsersCount - возвращает количество подключенных пользователей
func GetConnectedUsersCount() int {
	if hub == nil {
		return 0
	}

	hub.mu.RLock()
	defer hub.mu.RUnlock()
	return len(hub.clients)
}
