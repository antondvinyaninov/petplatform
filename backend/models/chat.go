package models

import (
	"time"
)

// Chat представляет диалог между двумя пользователями
type Chat struct {
	ID            int        `json:"id"`
	User1ID       int        `json:"user1_id"`
	User2ID       int        `json:"user2_id"`
	LastMessageID *int       `json:"last_message_id"`
	LastMessageAt *time.Time `json:"last_message_at"`
	CreatedAt     time.Time  `json:"created_at"`

	// Дополнительные поля для UI
	OtherUser   *User    `json:"other_user,omitempty"`
	LastMessage *Message `json:"last_message,omitempty"`
	UnreadCount int      `json:"unread_count"`
}

// Message представляет сообщение в чате
type Message struct {
	ID         int        `json:"id"`
	ChatID     int        `json:"chat_id"`
	SenderID   int        `json:"sender_id"`
	ReceiverID int        `json:"receiver_id"`
	Content    string     `json:"content"`
	IsRead     bool       `json:"is_read"`
	ReadAt     *time.Time `json:"read_at"`
	CreatedAt  *time.Time `json:"created_at"` // Используем указатель для поддержки NULL

	// Дополнительные поля для UI
	Sender      *User               `json:"sender,omitempty"`
	Attachments []MessageAttachment `json:"attachments,omitempty"`
}

// MessageAttachment представляет вложение в сообщении
type MessageAttachment struct {
	ID        int       `json:"id"`
	MessageID int       `json:"message_id"`
	FilePath  string    `json:"file_path"`
	FileType  string    `json:"file_type"` // 'image' или 'video'
	FileSize  int       `json:"file_size"`
	CreatedAt time.Time `json:"created_at"`
}
