package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type TelegramMessage struct {
	ChatID    string `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode"`
}

// SendTelegramNotification отправляет уведомление в Telegram
func SendTelegramNotification(message string) error {
	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	chatID := os.Getenv("TELEGRAM_CHAT_ID")

	// Если токен или chat ID не настроены, пропускаем отправку
	if botToken == "" || chatID == "" {
		log.Println("⚠️  Telegram notifications disabled (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set)")
		return nil
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	payload := TelegramMessage{
		ChatID:    chatID,
		Text:      message,
		ParseMode: "HTML",
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal telegram message: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to send telegram message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API returned status %d", resp.StatusCode)
	}

	log.Println("✅ Telegram notification sent successfully")
	return nil
}

// NotifyNewRegistration отправляет уведомление о новой регистрации
func NotifyNewRegistration(user *User) {
	message := fmt.Sprintf(
		"🎉 <b>Новая регистрация!</b>\n\n"+
			"👤 <b>Имя:</b> %s %s\n"+
			"📧 <b>Email:</b> %s\n"+
			"🕐 <b>Время:</b> %s\n"+
			"🆔 <b>ID:</b> %d",
		user.Name,
		user.LastName,
		user.Email,
		user.CreatedAt.Format("02.01.2006 15:04:05"),
		user.ID,
	)

	// Отправляем асинхронно, чтобы не блокировать регистрацию
	go func() {
		if err := SendTelegramNotification(message); err != nil {
			log.Printf("❌ Failed to send telegram notification: %v", err)
		}
	}()
}
