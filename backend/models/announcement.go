package models

import "time"

// PetAnnouncement - объявление о питомце
type PetAnnouncement struct {
	ID          int    `json:"id"`
	PetID       int    `json:"pet_id"`
	Type        string `json:"type"` // 'looking_for_home', 'found', 'lost', 'fundraising'
	Title       string `json:"title"`
	Description string `json:"description"`
	AuthorID    int    `json:"author_id"`

	// Контактное лицо
	ContactPersonID    *int    `json:"contact_person_id,omitempty"`
	ContactPersonName  *string `json:"contact_person_name,omitempty"`
	ContactPersonPhone *string `json:"contact_person_phone,omitempty"`

	// Локация
	LocationCity        *string `json:"location_city,omitempty"`
	LocationAddress     *string `json:"location_address,omitempty"`
	LocationCoordinates *string `json:"location_coordinates,omitempty"`

	// Дата события
	EventDate *time.Time `json:"event_date,omitempty"`
	EventTime *string    `json:"event_time,omitempty"`

	// Детали для "Потерян"
	LostLastSeenLocation    *string `json:"lost_last_seen_location,omitempty"`
	LostDistinctiveFeatures *string `json:"lost_distinctive_features,omitempty"`
	LostRewardAmount        *int    `json:"lost_reward_amount,omitempty"`

	// Детали для "Найден"
	FoundCurrentLocation *string `json:"found_current_location,omitempty"`
	FoundCondition       *string `json:"found_condition,omitempty"`

	// Детали для "Сбор средств"
	FundraisingGoalAmount    *int       `json:"fundraising_goal_amount,omitempty"`
	FundraisingCurrentAmount int        `json:"fundraising_current_amount"`
	FundraisingPurpose       *string    `json:"fundraising_purpose,omitempty"`
	FundraisingDeadline      *time.Time `json:"fundraising_deadline,omitempty"`
	FundraisingBankDetails   *string    `json:"fundraising_bank_details,omitempty"`

	// Статус
	Status       string  `json:"status"`
	StatusReason *string `json:"status_reason,omitempty"`
	IsPublished  bool    `json:"is_published"`
	ViewsCount   int     `json:"views_count"`

	// Метаданные
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	ClosedAt  *time.Time `json:"closed_at,omitempty"`

	// Связанные данные (загружаются отдельно)
	Author        *User                  `json:"author,omitempty"`
	ContactPerson *User                  `json:"contact_person,omitempty"`
	Pet           *PetDetail             `json:"pet,omitempty"`
	Posts         []AnnouncementPost     `json:"posts,omitempty"`
	Donations     []AnnouncementDonation `json:"donations,omitempty"`
}

// AnnouncementPost - публикация (обновление) к объявлению
type AnnouncementPost struct {
	ID             int       `json:"id"`
	AnnouncementID int       `json:"announcement_id"`
	AuthorID       int       `json:"author_id"`
	PostType       string    `json:"post_type"` // 'update', 'photo', 'observation', 'search', 'reward', 'donation'
	Content        string    `json:"content"`
	MediaURLs      *string   `json:"media_urls,omitempty"` // JSON массив
	DonationAmount *int      `json:"donation_amount,omitempty"`
	CreatedAt      time.Time `json:"created_at"`

	// Связанные данные
	Author *User `json:"author,omitempty"`
}

// AnnouncementDonation - пожертвование для сбора средств
type AnnouncementDonation struct {
	ID             int       `json:"id"`
	AnnouncementID int       `json:"announcement_id"`
	DonorID        *int      `json:"donor_id,omitempty"`
	DonorName      string    `json:"donor_name"`
	Amount         int       `json:"amount"`
	Message        *string   `json:"message,omitempty"`
	IsAnonymous    bool      `json:"is_anonymous"`
	CreatedAt      time.Time `json:"created_at"`

	// Связанные данные
	Donor *User `json:"donor,omitempty"`
}

// PetDetail - расширенная структура питомца (для связи с объявлением)
type PetDetail struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Name      string    `json:"name"`
	Species   string    `json:"species"`
	Breed     *string   `json:"breed,omitempty"`
	Gender    *string   `json:"gender,omitempty"`
	BirthDate *string   `json:"birth_date,omitempty"`
	Color     *string   `json:"color,omitempty"`
	Photo     *string   `json:"photo,omitempty"`
	Photos    *string   `json:"photos,omitempty"` // JSON массив
	CreatedAt time.Time `json:"created_at"`
}

// CreateAnnouncementRequest - запрос на создание объявления
type CreateAnnouncementRequest struct {
	PetID       int    `json:"pet_id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`

	// Контактное лицо
	ContactPersonID    *int    `json:"contact_person_id,omitempty"`
	ContactPersonName  *string `json:"contact_person_name,omitempty"`
	ContactPersonPhone *string `json:"contact_person_phone,omitempty"`

	// Локация
	LocationCity        *string `json:"location_city,omitempty"`
	LocationAddress     *string `json:"location_address,omitempty"`
	LocationCoordinates *string `json:"location_coordinates,omitempty"`

	// Дата события
	EventDate *string `json:"event_date,omitempty"`
	EventTime *string `json:"event_time,omitempty"`

	// Детали для "Потерян"
	LostLastSeenLocation    *string `json:"lost_last_seen_location,omitempty"`
	LostDistinctiveFeatures *string `json:"lost_distinctive_features,omitempty"`
	LostRewardAmount        *int    `json:"lost_reward_amount,omitempty"`

	// Детали для "Найден"
	FoundCurrentLocation *string `json:"found_current_location,omitempty"`
	FoundCondition       *string `json:"found_condition,omitempty"`

	// Детали для "Сбор средств"
	FundraisingGoalAmount  *int    `json:"fundraising_goal_amount,omitempty"`
	FundraisingPurpose     *string `json:"fundraising_purpose,omitempty"`
	FundraisingDeadline    *string `json:"fundraising_deadline,omitempty"`
	FundraisingBankDetails *string `json:"fundraising_bank_details,omitempty"`
}

// CreateAnnouncementPostRequest - запрос на создание публикации
type CreateAnnouncementPostRequest struct {
	PostType       string   `json:"post_type"`
	Content        string   `json:"content"`
	MediaURLs      []string `json:"media_urls,omitempty"`
	DonationAmount *int     `json:"donation_amount,omitempty"`
}

// CreateDonationRequest - запрос на создание пожертвования
type CreateDonationRequest struct {
	Amount      int     `json:"amount"`
	Message     *string `json:"message,omitempty"`
	IsAnonymous bool    `json:"is_anonymous"`
	DonorName   *string `json:"donor_name,omitempty"` // Для анонимных или незарегистрированных
}
