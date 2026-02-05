package handlers

import (
	"backend/models"
	"backend/storage"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// GetChatsHandler возвращает список диалогов пользователя
func GetChatsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(int)
		if !ok || userID == 0 {
			http.Error(w, `{"success":false,"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		// Оптимизированный запрос с JOIN вместо N+1 запросов
		query := ConvertPlaceholders(`
			SELECT 
				c.id, c.user1_id, c.user2_id, c.last_message_id, c.last_message_at, c.created_at,
				u.id as other_user_id, u.name, u.last_name, u.avatar, 
				CASE WHEN ua.last_seen IS NOT NULL AND ua.last_seen > NOW() - INTERVAL '5 minutes' THEN 1 ELSE 0 END as is_online,
				ua.last_seen,
				m.id as msg_id, m.sender_id, m.content, m.is_read, m.created_at as msg_created_at,
				COALESCE((
					SELECT COUNT(*) 
					FROM messages 
					WHERE chat_id = c.id AND receiver_id = ? AND is_read = FALSE
				), 0) as unread_count
			FROM chats c
			LEFT JOIN users u ON (
				CASE 
					WHEN c.user1_id = ? THEN c.user2_id 
					ELSE c.user1_id 
				END = u.id
			)
			LEFT JOIN user_activity ua ON u.id = ua.user_id
			LEFT JOIN messages m ON c.last_message_id = m.id
			WHERE c.user1_id = ? OR c.user2_id = ?
			ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
		`)

		log.Printf("🔍 GetChatsHandler: userID=%d", userID)
		rows, err := db.Query(query, userID, userID, userID, userID)
		if err != nil {
			log.Printf("❌ Error fetching chats: %v", err)
			http.Error(w, "Failed to fetch chats", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var chats []models.Chat
		for rows.Next() {
			var chat models.Chat
			var otherUser models.User
			var lastMessage models.Message
			var msgID, msgSenderID sql.NullInt64
			var msgContent sql.NullString
			var msgIsRead sql.NullBool
			var msgCreatedAt sql.NullString
			var unreadCount int
			var avatar sql.NullString
			var lastSeen sql.NullString

			err := rows.Scan(
				&chat.ID, &chat.User1ID, &chat.User2ID,
				&chat.LastMessageID, &chat.LastMessageAt, &chat.CreatedAt,
				&otherUser.ID, &otherUser.Name, &otherUser.LastName,
				&avatar, &otherUser.IsOnline, &lastSeen,
				&msgID, &msgSenderID, &msgContent, &msgIsRead, &msgCreatedAt,
				&unreadCount,
			)
			if err != nil {
				log.Printf("Error scanning chat: %v", err)
				continue
			}

			// Обрабатываем NULL значения
			if avatar.Valid {
				otherUser.Avatar = avatar.String
			}
			if lastSeen.Valid {
				parsedTime, err := time.Parse(time.RFC3339, lastSeen.String)
				if err == nil {
					otherUser.LastSeen = &parsedTime
				}
			}

			chat.OtherUser = &otherUser
			chat.UnreadCount = unreadCount

			// Если есть последнее сообщение
			if msgID.Valid {
				lastMessage.ID = int(msgID.Int64)
				if msgSenderID.Valid {
					lastMessage.SenderID = int(msgSenderID.Int64)
				}
				if msgContent.Valid {
					lastMessage.Content = msgContent.String
				}
				if msgIsRead.Valid {
					lastMessage.IsRead = msgIsRead.Bool
				}
				if msgCreatedAt.Valid {
					// Парсим строку в time.Time
					if t, err := time.Parse("2006-01-02 15:04:05", msgCreatedAt.String); err == nil {
						lastMessage.CreatedAt = &t
					}
				}
				chat.LastMessage = &lastMessage
			}

			chats = append(chats, chat)
		}

		if chats == nil {
			chats = []models.Chat{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(chats)
	}
}

// GetChatMessagesHandler возвращает сообщения конкретного чата
func GetChatMessagesHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()

		log.Printf("🔍 [DEBUG] GetChatMessagesHandler called: method=%s, path=%s", r.Method, r.URL.Path)
		log.Printf("🔍 [DEBUG] Headers: X-User-ID=%s, X-User-Email=%s", r.Header.Get("X-User-ID"), r.Header.Get("X-User-Email"))

		userID, ok := r.Context().Value("userID").(int)
		if !ok || userID == 0 {
			log.Printf("❌ [DEBUG] No userID in context! ok=%v, userID=%d", ok, userID)
			http.Error(w, `{"success":false,"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		log.Printf("✅ [DEBUG] UserID from context: %d", userID)

		// Получаем ID чата из URL
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) < 4 {
			http.Error(w, "Invalid chat ID", http.StatusBadRequest)
			return
		}
		chatID, err := strconv.Atoi(pathParts[3])
		if err != nil {
			http.Error(w, "Invalid chat ID", http.StatusBadRequest)
			return
		}

		log.Printf("⏱️ [TIMING] GetChatMessagesHandler START: chatID=%d, userID=%d", chatID, userID)

		// Оптимизация: проверяем доступ И загружаем сообщения одним запросом
		queryStart := time.Now()
		query := ConvertPlaceholders(`
			SELECT 
				m.id, m.chat_id, m.sender_id, m.receiver_id, 
				m.content, m.is_read, m.read_at, m.created_at
			FROM messages m
			INNER JOIN chats c ON m.chat_id = c.id
			WHERE m.chat_id = ? AND (c.user1_id = ? OR c.user2_id = ?)
			ORDER BY m.created_at ASC
		`)

		log.Printf("🔍 [DEBUG] Executing query: chatID=%d, userID=%d", chatID, userID)
		rows, err := db.Query(query, chatID, userID, userID)
		if err != nil {
			log.Printf("❌ Error fetching messages: %v", err)
			http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		log.Printf("⏱️ [TIMING] Query execution (with access check): %v", time.Since(queryStart))

		// Сканируем строки
		scanStart := time.Now()
		var messages []models.Message
		rowCount := 0
		for rows.Next() {
			rowCount++
			var msg models.Message
			var readAtStr, createdAtStr sql.NullString

			err := rows.Scan(
				&msg.ID, &msg.ChatID, &msg.SenderID, &msg.ReceiverID,
				&msg.Content, &msg.IsRead, &readAtStr, &createdAtStr,
			)
			if err != nil {
				log.Printf("❌ Error scanning message row %d: %v", rowCount, err)
				continue
			}

			// Парсим даты
			if createdAtStr.Valid {
				formats := []string{
					time.RFC3339Nano,
					time.RFC3339,
					"2006-01-02 15:04:05.999999-07:00",
					"2006-01-02 15:04:05",
				}
				var t time.Time
				var err error
				for _, format := range formats {
					t, err = time.Parse(format, createdAtStr.String)
					if err == nil {
						msg.CreatedAt = &t
						break
					}
				}
				if err != nil {
					log.Printf("⚠️ Failed to parse created_at: %s, error: %v", createdAtStr.String, err)
				}
			}

			if readAtStr.Valid {
				formats := []string{
					time.RFC3339Nano,
					time.RFC3339,
					"2006-01-02 15:04:05.999999-07:00",
					"2006-01-02 15:04:05",
				}
				var t time.Time
				var err error
				for _, format := range formats {
					t, err = time.Parse(format, readAtStr.String)
					if err == nil {
						msg.ReadAt = &t
						break
					}
				}
			}

			messages = append(messages, msg)
		}
		log.Printf("⏱️ [TIMING] Scanning %d rows: %v", rowCount, time.Since(scanStart))

		// Если сообщений нет, проверяем существует ли чат и есть ли доступ
		if len(messages) == 0 {
			var chatExists bool
			err := db.QueryRow(ConvertPlaceholders(`
				SELECT EXISTS(
					SELECT 1 FROM chats 
					WHERE id = ? AND (user1_id = ? OR user2_id = ?)
				)
			`), chatID, userID, userID).Scan(&chatExists)

			if err != nil || !chatExists {
				log.Printf("❌ User %d has no access to chat %d", userID, chatID)
				http.Error(w, "Access denied", http.StatusForbidden)
				return
			}
			// Чат существует, просто пустой
			log.Printf("✅ Chat %d is empty", chatID)
		}

		// Оптимизация: загружаем всех отправителей одним запросом
		loadSendersStart := time.Now()
		senderIDs := make(map[int]bool)
		for _, msg := range messages {
			senderIDs[msg.SenderID] = true
		}

		senders := make(map[int]*models.User)
		if len(senderIDs) > 0 {
			// Формируем список ID для IN (...)
			var ids []int
			for id := range senderIDs {
				ids = append(ids, id)
			}

			// Загружаем всех отправителей одним запросом (только нужные поля для мессенджера)
			placeholders := make([]string, len(ids))
			args := make([]interface{}, len(ids))
			for i, id := range ids {
				placeholders[i] = "?"
				args[i] = id
			}

			query := ConvertPlaceholders(fmt.Sprintf(`
				SELECT u.id, u.name, u.last_name, u.avatar, ua.last_seen
				FROM users u
				LEFT JOIN user_activity ua ON u.id = ua.user_id
				WHERE u.id IN (%s)
			`, strings.Join(placeholders, ",")))

			rows, err := db.Query(query, args...)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var user models.User
					var lastSeen sql.NullTime
					var avatar sql.NullString

					err := rows.Scan(&user.ID, &user.Name, &user.LastName, &avatar, &lastSeen)
					if err == nil {
						if avatar.Valid {
							user.Avatar = avatar.String
						}
						if lastSeen.Valid {
							user.LastSeen = &lastSeen.Time
							user.IsOnline = time.Since(lastSeen.Time) < 5*time.Minute
						}
						senders[user.ID] = &user
					}
				}
			}
		}
		log.Printf("⏱️ [TIMING] Loading %d unique senders: %v", len(senders), time.Since(loadSendersStart))

		// Оптимизация: загружаем все attachments одним запросом
		loadAttachmentsStart := time.Now()
		messageIDs := make([]int, len(messages))
		for i, msg := range messages {
			messageIDs[i] = msg.ID
		}

		attachmentsByMessage := make(map[int][]models.MessageAttachment)
		if len(messageIDs) > 0 {
			placeholders := make([]string, len(messageIDs))
			args := make([]interface{}, len(messageIDs))
			for i, id := range messageIDs {
				placeholders[i] = "?"
				args[i] = id
			}

			query := ConvertPlaceholders(fmt.Sprintf(`
				SELECT id, message_id, file_path, file_type, file_size, created_at
				FROM message_attachments
				WHERE message_id IN (%s)
				ORDER BY created_at ASC
			`, strings.Join(placeholders, ",")))

			rows, err := db.Query(query, args...)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var attachment models.MessageAttachment
					err := rows.Scan(
						&attachment.ID, &attachment.MessageID, &attachment.FilePath,
						&attachment.FileType, &attachment.FileSize, &attachment.CreatedAt,
					)
					if err == nil {
						attachmentsByMessage[attachment.MessageID] = append(
							attachmentsByMessage[attachment.MessageID],
							attachment,
						)
					}
				}
			}
		}
		log.Printf("⏱️ [TIMING] Loading attachments for %d messages: %v", len(messageIDs), time.Since(loadAttachmentsStart))

		// Присваиваем загруженные данные к сообщениям
		assignStart := time.Now()
		for i := range messages {
			if sender, ok := senders[messages[i].SenderID]; ok {
				messages[i].Sender = sender
			}
			if attachments, ok := attachmentsByMessage[messages[i].ID]; ok {
				messages[i].Attachments = attachments
			} else {
				messages[i].Attachments = []models.MessageAttachment{}
			}
		}
		log.Printf("⏱️ [TIMING] Assigning data to messages: %v", time.Since(assignStart))

		// Отмечаем все сообщения как прочитанные
		go markMessagesAsRead(db, chatID, userID)

		if messages == nil {
			messages = []models.Message{}
		}

		totalDuration := time.Since(startTime)
		log.Printf("⏱️ [TIMING] TOTAL GetChatMessagesHandler: %v (returned %d messages)", totalDuration, len(messages))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(messages)
	}
}

// SendMessageHandler отправляет текстовое сообщение
func SendMessageHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(int)
		if !ok || userID == 0 {
			http.Error(w, `{"success":false,"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		var req struct {
			ReceiverID int    `json:"receiver_id"`
			Content    string `json:"content"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.ReceiverID == 0 || req.Content == "" {
			http.Error(w, "Receiver ID and content are required", http.StatusBadRequest)
			return
		}

		if req.ReceiverID == userID {
			http.Error(w, "Cannot send message to yourself", http.StatusBadRequest)
			return
		}

		// Проверяем, существует ли получатель
		receiverExists, err := userExists(db, req.ReceiverID)
		if err != nil || !receiverExists {
			http.Error(w, "Receiver not found", http.StatusNotFound)
			return
		}

		// Ищем или создаем чат
		chatID, err := getOrCreateChat(db, userID, req.ReceiverID)
		if err != nil {
			log.Printf("❌ Error getting/creating chat: %v", err)
			http.Error(w, "Failed to create chat", http.StatusInternalServerError)
			return
		}

		// Создаем сообщение
		var messageID int
		err = db.QueryRow(ConvertPlaceholders(`
			INSERT INTO messages (chat_id, sender_id, receiver_id, content, created_at)
			VALUES (?, ?, ?, ?, ?)
			RETURNING id
		`), chatID, userID, req.ReceiverID, req.Content, time.Now()).Scan(&messageID)

		if err != nil {
			log.Printf("❌ Error creating message: %v", err)
			http.Error(w, "Failed to send message", http.StatusInternalServerError)
			return
		}

		// Обновляем last_message в чате
		_, err = db.Exec(ConvertPlaceholders(`
			UPDATE chats 
			SET last_message_id = ?, last_message_at = ?
			WHERE id = ?
		`), messageID, time.Now(), chatID)

		if err != nil {
			log.Printf("⚠️ Warning: Failed to update chat last_message: %v", err)
		}

		// Получаем созданное сообщение
		message, err := getMessageByID(db, messageID)
		if err != nil {
			log.Printf("❌ Error fetching created message: %v", err)
			http.Error(w, "Message sent but failed to fetch", http.StatusInternalServerError)
			return
		}

		log.Printf("✅ Message sent: user %d -> user %d in chat %d", userID, req.ReceiverID, chatID)

		// 🔔 Отправляем WebSocket уведомление получателю
		NotifyNewMessage(req.ReceiverID, message)
		NotifyUnreadCount(req.ReceiverID)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(message)
	}
}

// GetUnreadCountHandler возвращает количество непрочитанных сообщений
func GetUnreadCountHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value("userID").(int)
		if !ok || userID == 0 {
			http.Error(w, `{"success":false,"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		var count int
		err := db.QueryRow(ConvertPlaceholders(`
			SELECT COUNT(*) 
			FROM messages 
			WHERE receiver_id = ? AND is_read = FALSE
		`), userID).Scan(&count)

		if err != nil {
			log.Printf("❌ Error counting unread messages: %v", err)
			sendErrorResponse(w, "Failed to count unread messages", http.StatusInternalServerError)
			return
		}

		log.Printf("✅ Unread messages count: user_id=%d, count=%d", userID, count)
		sendSuccessResponse(w, map[string]int{"count": count})
	}
}

// SendMediaMessageHandler отправляет сообщение с медиа (фото/видео)
func SendMediaMessageHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value("userID").(int)

		// Парсим multipart form
		err := r.ParseMultipartForm(50 << 20) // 50 MB max
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}

		// Получаем receiver_id
		receiverIDStr := r.FormValue("receiver_id")
		if receiverIDStr == "" {
			http.Error(w, "Receiver ID is required", http.StatusBadRequest)
			return
		}

		receiverID, err := strconv.Atoi(receiverIDStr)
		if err != nil {
			http.Error(w, "Invalid receiver ID", http.StatusBadRequest)
			return
		}

		if receiverID == userID {
			http.Error(w, "Cannot send message to yourself", http.StatusBadRequest)
			return
		}

		// Получаем текст сообщения (опционально)
		content := r.FormValue("content")

		// Получаем файлы
		files := r.MultipartForm.File["media"]
		if len(files) == 0 {
			http.Error(w, "At least one media file is required", http.StatusBadRequest)
			return
		}

		// Проверяем, существует ли получатель
		receiverExists, err := userExists(db, receiverID)
		if err != nil || !receiverExists {
			http.Error(w, "Receiver not found", http.StatusNotFound)
			return
		}

		// Ищем или создаем чат
		chatID, err := getOrCreateChat(db, userID, receiverID)
		if err != nil {
			log.Printf("❌ Error getting/creating chat: %v", err)
			http.Error(w, "Failed to create chat", http.StatusInternalServerError)
			return
		}

		// Создаем сообщение
		var messageID int
		err = db.QueryRow(ConvertPlaceholders(`
			INSERT INTO messages (chat_id, sender_id, receiver_id, content, created_at)
			VALUES (?, ?, ?, ?, ?)
			RETURNING id
		`), chatID, userID, receiverID, content, time.Now()).Scan(&messageID)

		if err != nil {
			log.Printf("❌ Error creating message: %v", err)
			http.Error(w, "Failed to send message", http.StatusInternalServerError)
			return
		}

		// Сохраняем файлы и создаем attachments
		var attachments []models.MessageAttachment
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				log.Printf("❌ Error opening file: %v", err)
				continue
			}
			defer file.Close()

			// Определяем тип файла
			fileType := "file" // По умолчанию - обычный файл
			contentType := fileHeader.Header.Get("Content-Type")

			if strings.HasPrefix(contentType, "image/") {
				fileType = "image"
			} else if strings.HasPrefix(contentType, "video/") {
				fileType = "video"
			}

			log.Printf("📎 File type detected: %s (Content-Type: %s)", fileType, contentType)

			// Генерируем уникальное имя файла
			ext := filepath.Ext(fileHeader.Filename)
			newFilename := fmt.Sprintf("messages/%s%s", uuid.New().String(), ext)

			// Сохраняем файл (в S3 или локально)
			filePath, err := storage.SaveFile(file, newFilename, contentType)
			if err != nil {
				log.Printf("❌ Error saving file: %v", err)
				continue
			}

			log.Printf("✅ File saved: %s", filePath)

			// Создаем запись в БД
			var attachID int
			err = db.QueryRow(ConvertPlaceholders(`
				INSERT INTO message_attachments (message_id, file_path, file_type, file_size, created_at)
				VALUES (?, ?, ?, ?, ?)
				RETURNING id
			`), messageID, filePath, fileType, fileHeader.Size, time.Now()).Scan(&attachID)

			if err != nil {
				log.Printf("❌ Error creating attachment: %v", err)
				continue
			}

			attachments = append(attachments, models.MessageAttachment{
				ID:        attachID,
				MessageID: messageID,
				FilePath:  filePath,
				FileType:  fileType,
				FileSize:  int(fileHeader.Size),
				CreatedAt: time.Now(),
			})
		}

		// Обновляем last_message в чате
		_, err = db.Exec(ConvertPlaceholders(`
			UPDATE chats 
			SET last_message_id = ?, last_message_at = ?
			WHERE id = ?
		`), messageID, time.Now(), chatID)

		if err != nil {
			log.Printf("⚠️ Warning: Failed to update chat last_message: %v", err)
		}

		// Получаем созданное сообщение
		message, err := getMessageByID(db, messageID)
		if err != nil {
			log.Printf("❌ Error fetching created message: %v", err)
			http.Error(w, "Message sent but failed to fetch", http.StatusInternalServerError)
			return
		}

		// Добавляем attachments к сообщению
		message.Attachments = attachments

		log.Printf("✅ Media message sent: user %d -> user %d in chat %d (%d attachments)", userID, receiverID, chatID, len(attachments))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(message)
	}
}

// Вспомогательные функции

func getOrCreateChat(db *sql.DB, user1ID, user2ID int) (int, error) {
	// Нормализуем порядок пользователей (меньший ID всегда первый)
	if user1ID > user2ID {
		user1ID, user2ID = user2ID, user1ID
	}

	// Ищем существующий чат
	var chatID int
	err := db.QueryRow(ConvertPlaceholders(`
		SELECT id FROM chats 
		WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
	`), user1ID, user2ID, user2ID, user1ID).Scan(&chatID)

	if err == nil {
		return chatID, nil
	}

	// Создаем новый чат
	var newChatID int
	err = db.QueryRow(ConvertPlaceholders(`
		INSERT INTO chats (user1_id, user2_id, created_at)
		VALUES (?, ?, ?)
		RETURNING id
	`), user1ID, user2ID, time.Now()).Scan(&newChatID)

	if err != nil {
		return 0, err
	}

	return newChatID, nil
}

func isUserInChat(db *sql.DB, chatID, userID int) bool {
	var count int
	err := db.QueryRow(ConvertPlaceholders(`
		SELECT COUNT(*) FROM chats 
		WHERE id = ? AND (user1_id = ? OR user2_id = ?)
	`), chatID, userID, userID).Scan(&count)

	return err == nil && count > 0
}

func getMessageByID(db *sql.DB, messageID int) (*models.Message, error) {
	var msg models.Message
	err := db.QueryRow(ConvertPlaceholders(`
		SELECT id, chat_id, sender_id, receiver_id, content, is_read, read_at, created_at
		FROM messages WHERE id = ?
	`), messageID).Scan(
		&msg.ID, &msg.ChatID, &msg.SenderID, &msg.ReceiverID,
		&msg.Content, &msg.IsRead, &msg.ReadAt, &msg.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Получаем отправителя
	sender, err := getUserByID(db, msg.SenderID)
	if err == nil {
		msg.Sender = sender
		log.Printf("✅ Sender loaded: %s", sender.Name)
	} else {
		log.Printf("⚠️ Failed to get sender for message %d: %v", msg.ID, err)
	}

	log.Printf("🔍 Getting attachments for message %d", msg.ID)
	// Получаем attachments
	attachments, err := getMessageAttachments(db, messageID)
	if err == nil {
		msg.Attachments = attachments
		log.Printf("✅ Attachments loaded: %d items", len(attachments))
	} else {
		log.Printf("⚠️ Failed to get attachments for message %d: %v", msg.ID, err)
	}

	return &msg, nil
}

func getMessageAttachments(db *sql.DB, messageID int) ([]models.MessageAttachment, error) {
	rows, err := db.Query(ConvertPlaceholders(`
		SELECT id, message_id, file_path, file_type, file_size, created_at
		FROM message_attachments
		WHERE message_id = ?
		ORDER BY created_at ASC
	`), messageID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []models.MessageAttachment
	for rows.Next() {
		var attachment models.MessageAttachment
		err := rows.Scan(
			&attachment.ID, &attachment.MessageID, &attachment.FilePath,
			&attachment.FileType, &attachment.FileSize, &attachment.CreatedAt,
		)
		if err != nil {
			log.Printf("⚠️ Error scanning attachment: %v", err)
			continue
		}
		attachments = append(attachments, attachment)
	}

	return attachments, nil
}

func saveUploadedFile(file multipart.File, filename string) (string, error) {
	// Генерируем уникальное имя файла
	ext := filepath.Ext(filename)
	newFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Создаем папку для медиа сообщений
	uploadDir := "../../uploads/messages"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %v", err)
	}

	// Сохраняем файл
	filePath := filepath.Join(uploadDir, newFilename)
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %v", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("failed to save file: %v", err)
	}

	// Возвращаем относительный путь для URL
	return fmt.Sprintf("/uploads/messages/%s", newFilename), nil
}

func getUnreadCount(db *sql.DB, chatID, userID int) (int, error) {
	var count int
	err := db.QueryRow(ConvertPlaceholders(`
		SELECT COUNT(*) FROM messages 
		WHERE chat_id = ? AND receiver_id = ? AND is_read = FALSE
	`), chatID, userID).Scan(&count)

	return count, err
}

func markMessagesAsRead(db *sql.DB, chatID, userID int) {
	_, err := db.Exec(ConvertPlaceholders(`
		UPDATE messages 
		SET is_read = TRUE, read_at = ?
		WHERE chat_id = ? AND receiver_id = ? AND is_read = FALSE
	`), time.Now(), chatID, userID)

	if err != nil {
		log.Printf("⚠️ Warning: Failed to mark messages as read: %v", err)
	}
}

func userExists(db *sql.DB, userID int) (bool, error) {
	var count int
	err := db.QueryRow(ConvertPlaceholders("SELECT COUNT(*) FROM users WHERE id = ?"), userID).Scan(&count)
	return count > 0, err
}

func getUserByID(db *sql.DB, userID int) (*models.User, error) {
	var user models.User
	var lastSeen sql.NullTime
	var avatar, coverPhoto, bio, location, phone sql.NullString

	err := db.QueryRow(ConvertPlaceholders(`
		SELECT u.id, u.email, u.name, u.last_name, u.avatar, u.cover_photo, u.bio, 
		       u.location, u.phone, u.created_at, ua.last_seen
		FROM users u
		LEFT JOIN user_activity ua ON u.id = ua.user_id
		WHERE u.id = ?
	`), userID).Scan(
		&user.ID, &user.Email, &user.Name, &user.LastName, &avatar,
		&coverPhoto, &bio, &location, &phone,
		&user.CreatedAt, &lastSeen,
	)

	if err != nil {
		return nil, err
	}

	// Обрабатываем NULL значения
	if avatar.Valid {
		user.Avatar = avatar.String
	}
	if coverPhoto.Valid {
		user.CoverPhoto = coverPhoto.String
	}
	if bio.Valid {
		user.Bio = bio.String
	}
	if location.Valid {
		user.Location = location.String
	}
	if phone.Valid {
		user.Phone = phone.String
	}

	// Устанавливаем last_seen если есть
	if lastSeen.Valid {
		user.LastSeen = &lastSeen.Time
		// Проверяем онлайн статус (активен в последние 5 минут)
		user.IsOnline = time.Since(lastSeen.Time) < 5*time.Minute
	} else {
		user.IsOnline = false
	}

	return &user, nil
}
