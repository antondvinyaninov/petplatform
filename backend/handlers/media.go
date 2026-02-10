package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"github.com/gorilla/mux"
)

// UploadPetPhotoHandler - загрузка фото питомца через Gateway
func UploadPetPhotoHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	petID := vars["id"]

	if petID == "" {
		sendError(w, "Неверный ID питомца", http.StatusBadRequest)
		return
	}

	// Получаем ID текущего пользователя
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		sendError(w, "Не удалось определить пользователя", http.StatusUnauthorized)
		return
	}

	// Проверяем владение питомцем
	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Получаем питомца для проверки владения
	petData, err := client.Get(fmt.Sprintf("/api/petid/pets/%s", petID))
	if err != nil {
		sendError(w, "Питомец не найден", http.StatusNotFound)
		return
	}

	if !checkPetOwnership(petData, userID) {
		sendError(w, "Доступ запрещен. Это не ваш питомец", http.StatusForbidden)
		return
	}

	// Парсим multipart form
	err = r.ParseMultipartForm(20 << 20) // 20 MB max
	if err != nil {
		sendError(w, "Ошибка парсинга файла", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		sendError(w, "Файл не найден", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Проверяем тип файла
	contentType := header.Header.Get("Content-Type")
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/jpg" && contentType != "image/webp" {
		sendError(w, "Неподдерживаемый формат файла. Используйте JPEG, PNG или WebP", http.StatusBadRequest)
		return
	}

	// Проверяем размер файла (макс 15MB)
	if header.Size > 15*1024*1024 {
		sendError(w, "Размер файла не должен превышать 15MB", http.StatusBadRequest)
		return
	}

	fmt.Printf("📸 [UploadPetPhoto] Uploading photo for pet_id=%s, user_id=%d, size=%d bytes\n", petID, userID, header.Size)

	// Создаем новый multipart writer для отправки на Gateway
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Добавляем файл
	part, err := writer.CreateFormFile("photo", header.Filename)
	if err != nil {
		sendError(w, "Ошибка подготовки файла", http.StatusInternalServerError)
		return
	}

	// Копируем содержимое файла
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		sendError(w, "Ошибка чтения файла", http.StatusInternalServerError)
		return
	}
	part.Write(fileBytes)

	// Добавляем дополнительные поля
	writer.WriteField("pet_id", petID)
	writer.WriteField("user_id", fmt.Sprintf("%d", userID))

	writer.Close()

	// Отправляем на Gateway
	gatewayURL := client.GetBaseURL()
	req, err := http.NewRequest("POST", gatewayURL+"/api/media/upload/pet-photo", body)
	if err != nil {
		sendError(w, "Ошибка создания запроса", http.StatusInternalServerError)
		return
	}

	// Копируем auth cookie
	if cookie, err := r.Cookie("auth_token"); err == nil {
		req.AddCookie(cookie)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	httpClient := &http.Client{}
	resp, err := httpClient.Do(req)
	if err != nil {
		fmt.Printf("❌ [UploadPetPhoto] Gateway error: %v\n", err)
		sendError(w, "Ошибка загрузки на сервер", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Читаем ответ от Gateway
	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		sendError(w, "Ошибка чтения ответа", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("❌ [UploadPetPhoto] Gateway returned status %d: %s\n", resp.StatusCode, string(responseData))
		sendError(w, "Ошибка загрузки фото", resp.StatusCode)
		return
	}

	// Парсим ответ от Gateway
	var uploadResponse struct {
		Success  bool   `json:"success"`
		PhotoURL string `json:"photo_url"`
		Message  string `json:"message"`
	}

	if err := json.Unmarshal(responseData, &uploadResponse); err != nil {
		sendError(w, "Ошибка парсинга ответа", http.StatusInternalServerError)
		return
	}

	if !uploadResponse.Success {
		sendError(w, uploadResponse.Message, http.StatusInternalServerError)
		return
	}

	fmt.Printf("✅ [UploadPetPhoto] Photo uploaded successfully: %s\n", uploadResponse.PhotoURL)

	// Обновляем питомца с новым URL фото
	updateData := map[string]interface{}{
		"photo_url": uploadResponse.PhotoURL,
	}

	fmt.Printf("📝 [UploadPetPhoto] Updating pet %s with photo_url: %s\n", petID, uploadResponse.PhotoURL)
	updateResponse, err := client.Put(fmt.Sprintf("/api/petid/pets/%s", petID), updateData)
	if err != nil {
		fmt.Printf("❌ [UploadPetPhoto] Failed to update pet with photo URL: %v\n", err)
		// Не возвращаем ошибку, так как фото уже загружено
	} else {
		fmt.Printf("✅ [UploadPetPhoto] Pet updated successfully: %s\n", string(updateResponse))
	}

	// Возвращаем успешный ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"photo_url": uploadResponse.PhotoURL,
		"message":   "Фото успешно загружено",
	})
}
