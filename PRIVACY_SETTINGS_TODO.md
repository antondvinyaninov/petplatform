# TODO: Реализация настроек приватности

## Текущее состояние

✅ **Что работает:**
- Настройки сохраняются в БД (profile_visibility, show_phone, show_email, allow_messages, show_online)
- Настройки отображаются в форме редактирования профиля
- Настройки возвращаются в API `/api/users/{id}`

❌ **Что НЕ работает:**
- Настройки не применяются при отображении данных
- Все видят все данные независимо от настроек
- Нет проверки прав доступа

---

## Настройки приватности

### 1. profile_visibility - Видимость профиля
**Значения:**
- `public` - Все пользователи (по умолчанию)
- `friends` - Только друзья
- `private` - Только я

**Что скрывает:**
- Весь профиль (посты, друзья, питомцы, фото)
- При `private` - профиль виден только владельцу
- При `friends` - профиль виден только друзьям

**Где применять:**
- `GET /api/users/{id}` - проверять можно ли показать профиль
- `GET /api/posts?user_id={id}` - проверять можно ли показать посты
- `GET /api/friends?user_id={id}` - проверять можно ли показать друзей

### 2. show_phone - Видимость телефона
**Значения:**
- `everyone` - Все пользователи
- `friends` - Только друзья
- `nobody` - Никто (по умолчанию)

**Что скрывает:**
- Поле `phone` в ответе API

**Где применять:**
- `GET /api/users/{id}` - скрывать поле `phone` если нет прав

### 3. show_email - Видимость email
**Значения:**
- `everyone` - Все пользователи
- `friends` - Только друзья
- `nobody` - Никто (по умолчанию)

**Что скрывает:**
- Поле `email` в ответе API

**Где применять:**
- `GET /api/users/{id}` - скрывать поле `email` если нет прав

### 4. allow_messages - Кто может писать
**Значения:**
- `everyone` - Все пользователи (по умолчанию)
- `friends` - Только друзья
- `nobody` - Никто

**Что блокирует:**
- Отправку сообщений в мессенджере

**Где применять:**
- `POST /api/messages` - проверять можно ли отправить сообщение
- Frontend - скрывать кнопку "Написать" если нельзя

### 5. show_online - Показывать онлайн статус
**Значения:**
- `yes` - Да, показывать (по умолчанию)
- `no` - Нет, скрыть

**Что скрывает:**
- Поле `is_online` в ответе API
- Время последней активности `last_seen`

**Где применять:**
- `GET /api/users/{id}` - скрывать `is_online` и `last_seen` если `no`

---

## План реализации

### Шаг 1: Создать helper функцию проверки прав

**Файл:** `backend/handlers/privacy.go`

```go
package handlers

import "database"

// CanViewProfile проверяет может ли viewerID просматривать профиль targetID
func CanViewProfile(viewerID, targetID int) bool {
	// Владелец всегда видит свой профиль
	if viewerID == targetID {
		return true
	}

	// Получаем настройки приватности
	var visibility string
	query := ConvertPlaceholders(`SELECT profile_visibility FROM users WHERE id = ?`)
	err := database.DB.QueryRow(query, targetID).Scan(&visibility)
	if err != nil {
		return false
	}

	// public - все видят
	if visibility == "public" {
		return true
	}

	// private - только владелец
	if visibility == "private" {
		return false
	}

	// friends - только друзья
	if visibility == "friends" {
		return AreFriends(viewerID, targetID)
	}

	return false
}

// CanViewPhone проверяет может ли viewerID видеть телефон targetID
func CanViewPhone(viewerID, targetID int) bool {
	if viewerID == targetID {
		return true
	}

	var showPhone string
	query := ConvertPlaceholders(`SELECT show_phone FROM users WHERE id = ?`)
	err := database.DB.QueryRow(query, targetID).Scan(&showPhone)
	if err != nil {
		return false
	}

	if showPhone == "everyone" {
		return true
	}

	if showPhone == "friends" {
		return AreFriends(viewerID, targetID)
	}

	return false // nobody
}

// CanViewEmail проверяет может ли viewerID видеть email targetID
func CanViewEmail(viewerID, targetID int) bool {
	if viewerID == targetID {
		return true
	}

	var showEmail string
	query := ConvertPlaceholders(`SELECT show_email FROM users WHERE id = ?`)
	err := database.DB.QueryRow(query, targetID).Scan(&showEmail)
	if err != nil {
		return false
	}

	if showEmail == "everyone" {
		return true
	}

	if showEmail == "friends" {
		return AreFriends(viewerID, targetID)
	}

	return false // nobody
}

// CanSendMessage проверяет может ли senderID отправить сообщение recipientID
func CanSendMessage(senderID, recipientID int) bool {
	if senderID == recipientID {
		return true
	}

	var allowMessages string
	query := ConvertPlaceholders(`SELECT allow_messages FROM users WHERE id = ?`)
	err := database.DB.QueryRow(query, recipientID).Scan(&allowMessages)
	if err != nil {
		return false
	}

	if allowMessages == "everyone" {
		return true
	}

	if allowMessages == "friends" {
		return AreFriends(senderID, recipientID)
	}

	return false // nobody
}

// CanViewOnlineStatus проверяет может ли viewerID видеть онлайн статус targetID
func CanViewOnlineStatus(viewerID, targetID int) bool {
	if viewerID == targetID {
		return true
	}

	var showOnline string
	query := ConvertPlaceholders(`SELECT show_online FROM users WHERE id = ?`)
	err := database.DB.QueryRow(query, targetID).Scan(&showOnline)
	if err != nil {
		return false
	}

	return showOnline == "yes"
}

// AreFriends проверяет являются ли пользователи друзьями
func AreFriends(userID1, userID2 int) bool {
	var count int
	query := ConvertPlaceholders(`
		SELECT COUNT(*) FROM friendships 
		WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
		AND status = 'accepted'
	`)
	err := database.DB.QueryRow(query, userID1, userID2, userID2, userID1).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}
```

### Шаг 2: Применить в GetUserByIDHandler

**Файл:** `backend/handlers/users.go`

```go
func GetUserByIDHandler(w http.ResponseWriter, r *http.Request) {
	// ... получаем userID из URL ...
	// ... получаем viewerID из контекста ...

	// ✅ Проверяем права на просмотр профиля
	if !CanViewProfile(viewerID, userID) {
		sendErrorResponse(w, "Профиль скрыт настройками приватности", http.StatusForbidden)
		return
	}

	// ... загружаем данные пользователя ...

	// ✅ Скрываем телефон если нет прав
	if !CanViewPhone(viewerID, userID) {
		user.Phone = ""
	}

	// ✅ Скрываем email если нет прав
	if !CanViewEmail(viewerID, userID) {
		user.Email = ""
	}

	// ✅ Скрываем онлайн статус если нужно
	if !CanViewOnlineStatus(viewerID, userID) {
		user.IsOnline = false
		user.LastSeen = nil
	}

	sendSuccessResponse(w, user)
}
```

### Шаг 3: Применить в SendMessageHandler

**Файл:** `backend/handlers/messenger.go`

```go
func SendMessageHandler(w http.ResponseWriter, r *http.Request) {
	// ... получаем senderID и recipientID ...

	// ✅ Проверяем права на отправку сообщения
	if !CanSendMessage(senderID, recipientID) {
		sendErrorResponse(w, "Пользователь не принимает сообщения", http.StatusForbidden)
		return
	}

	// ... отправляем сообщение ...
}
```

### Шаг 4: Обновить Frontend

**Файл:** `frontend/app/(main)/[userId]/page.tsx`

```typescript
// Показывать сообщение если профиль скрыт
if (error?.status === 403) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-600">Этот профиль скрыт настройками приватности</p>
    </div>
  );
}

// Скрывать кнопку "Написать" если нельзя отправить сообщение
{canSendMessage && (
  <button onClick={handleSendMessage}>
    Написать сообщение
  </button>
)}
```

---

## Тестирование

### Сценарий 1: profile_visibility = "private"
- [ ] Другие пользователи видят "Профиль скрыт"
- [ ] Владелец видит свой профиль

### Сценарий 2: profile_visibility = "friends"
- [ ] Друзья видят профиль
- [ ] Не-друзья видят "Профиль скрыт"

### Сценарий 3: show_phone = "nobody"
- [ ] Телефон не отображается в API
- [ ] Владелец видит свой телефон

### Сценарий 4: show_email = "friends"
- [ ] Друзья видят email
- [ ] Не-друзья не видят email

### Сценарий 5: allow_messages = "friends"
- [ ] Друзья могут отправить сообщение
- [ ] Не-друзья получают ошибку 403
- [ ] Кнопка "Написать" скрыта для не-друзей

### Сценарий 6: show_online = "no"
- [ ] Онлайн статус не отображается
- [ ] last_seen не отображается

---

## Приоритет реализации

1. **Высокий:** `profile_visibility` - базовая приватность профиля
2. **Высокий:** `allow_messages` - контроль сообщений
3. **Средний:** `show_phone`, `show_email` - скрытие контактов
4. **Низкий:** `show_online` - скрытие онлайн статуса

---

**Дата создания:** 3 февраля 2026
**Статус:** Требуется реализация
