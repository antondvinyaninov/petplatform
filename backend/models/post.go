package models

// Attachment представляет медиа-вложение (фото/видео)
type Attachment struct {
	URL      string `json:"url"`
	Type     string `json:"type"` // "image" или "video"
	FileName string `json:"file_name,omitempty"`
	Size     int64  `json:"size,omitempty"`
}

// Post - универсальный пост в стиле Threads
type Post struct {
	ID            int           `json:"id"`
	AuthorID      int           `json:"author_id"`
	AuthorType    string        `json:"author_type"` // "user" или "organization"
	Content       string        `json:"content"`
	AttachedPets  []int         `json:"attached_pets"`          // Массив PetID
	Attachments   []Attachment  `json:"attachments"`            // Массив медиа-файлов
	Tags          []string      `json:"tags"`                   // Метки: "ищет дом", "потерян", "найден"
	Status        string        `json:"status"`                 // "published", "scheduled", "draft"
	ScheduledAt   *string       `json:"scheduled_at,omitempty"` // Время публикации (ISO 8601)
	CreatedAt     string        `json:"created_at"`
	UpdatedAt     string        `json:"updated_at"`
	IsDeleted     bool          `json:"is_deleted"`
	User          *User         `json:"user,omitempty"`          // Автор (если user)
	Organization  *Organization `json:"organization,omitempty"`  // Автор (если organization)
	Pets          []Pet         `json:"pets,omitempty"`          // Прикреплённые питомцы (полные данные)
	Poll          *Poll         `json:"poll,omitempty"`          // Опрос (если есть)
	HasPoll       bool          `json:"has_poll"`                // Есть ли опрос у поста (для оптимизации)
	LikesCount    int           `json:"likes_count"`             // Количество лайков
	CommentsCount int           `json:"comments_count"`          // Количество комментариев
	CanEdit       bool          `json:"can_edit"`                // Может ли текущий пользователь редактировать пост
	LocationLat   *float64      `json:"location_lat,omitempty"`  // Широта местоположения
	LocationLon   *float64      `json:"location_lon,omitempty"`  // Долгота местоположения
	LocationName  *string       `json:"location_name,omitempty"` // Название места
}

// CreatePostRequest - запрос на создание поста
type CreatePostRequest struct {
	Content        string             `json:"content"`
	AttachedPets   []int              `json:"attached_pets,omitempty"`
	Attachments    []Attachment       `json:"attachments,omitempty"`
	Tags           []string           `json:"tags,omitempty"`
	Status         string             `json:"status,omitempty"`          // "published", "scheduled", "draft"
	ScheduledAt    *string            `json:"scheduled_at,omitempty"`    // Время публикации (ISO 8601)
	Poll           *CreatePollRequest `json:"poll,omitempty"`            // Опрос (если создается)
	AuthorType     string             `json:"author_type,omitempty"`     // "user" или "organization"
	OrganizationID *int               `json:"organization_id,omitempty"` // ID организации если author_type = "organization"
	LocationLat    *float64           `json:"location_lat,omitempty"`    // Широта местоположения
	LocationLon    *float64           `json:"location_lon,omitempty"`    // Долгота местоположения
	LocationName   *string            `json:"location_name,omitempty"`   // Название места
}

// UpdatePostRequest - запрос на обновление поста
type UpdatePostRequest struct {
	Content      string             `json:"content,omitempty"`
	AttachedPets []int              `json:"attached_pets,omitempty"`
	Attachments  []Attachment       `json:"attachments,omitempty"`
	Tags         []string           `json:"tags,omitempty"`
	Poll         *CreatePollRequest `json:"poll,omitempty"`          // Опрос (если добавляется)
	LocationLat  *float64           `json:"location_lat,omitempty"`  // Широта местоположения
	LocationLon  *float64           `json:"location_lon,omitempty"`  // Долгота местоположения
	LocationName *string            `json:"location_name,omitempty"` // Название места
}
