package models

import "time"

// Organization представляет организацию (приют, ветклиника, зоомагазин и т.д.)
type Organization struct {
	ID        int     `json:"id"`
	Name      string  `json:"name"`
	ShortName *string `json:"short_name,omitempty"`
	LegalForm *string `json:"legal_form,omitempty"`
	Type      string  `json:"type"` // shelter, vet_clinic, pet_shop, foundation, kennel, other

	// Юридическая информация
	INN              *string `json:"inn,omitempty"`
	OGRN             *string `json:"ogrn,omitempty"`
	KPP              *string `json:"kpp,omitempty"`
	RegistrationDate *string `json:"registration_date,omitempty"`

	// Контактная информация
	Email   *string `json:"email,omitempty"`
	Phone   *string `json:"phone,omitempty"`
	Website *string `json:"website,omitempty"`

	// Адрес
	AddressFull       *string `json:"address_full,omitempty"`
	AddressPostalCode *string `json:"address_postal_code,omitempty"`
	AddressRegion     *string `json:"address_region,omitempty"`
	AddressCity       *string `json:"address_city,omitempty"`
	AddressStreet     *string `json:"address_street,omitempty"`
	AddressHouse      *string `json:"address_house,omitempty"`
	AddressOffice     *string `json:"address_office,omitempty"`

	// Координаты
	GeoLat *float64 `json:"geo_lat,omitempty"`
	GeoLon *float64 `json:"geo_lon,omitempty"`

	// Описание
	Description *string `json:"description,omitempty"`
	Bio         *string `json:"bio,omitempty"`

	// Медиа
	Logo       *string `json:"logo,omitempty"`
	CoverPhoto *string `json:"cover_photo,omitempty"`

	// Руководство
	DirectorName     *string `json:"director_name,omitempty"`
	DirectorPosition *string `json:"director_position,omitempty"`

	// Владелец
	OwnerUserID *int `json:"owner_user_id,omitempty"`

	// Настройки приватности
	ProfileVisibility string `json:"profile_visibility"` // public, private
	ShowPhone         string `json:"show_phone"`         // everyone, nobody
	ShowEmail         string `json:"show_email"`         // everyone, nobody
	AllowMessages     string `json:"allow_messages"`     // everyone, nobody

	// Статус
	IsVerified bool   `json:"is_verified"`
	IsActive   bool   `json:"is_active"`
	Status     string `json:"status"` // active, inactive, blocked

	// Метаданные
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// OrganizationMember представляет участника организации
type OrganizationMember struct {
	ID               int       `json:"id"`
	OrganizationID   int       `json:"organization_id"`
	UserID           int       `json:"user_id"`
	Role             string    `json:"role"` // owner, admin, moderator, member
	Position         *string   `json:"position,omitempty"`
	CanPost          bool      `json:"can_post"`
	CanEdit          bool      `json:"can_edit"`
	CanManageMembers bool      `json:"can_manage_members"`
	JoinedAt         time.Time `json:"joined_at"`

	// Дополнительная информация о пользователе (для отображения)
	UserName   string  `json:"user_name,omitempty"`
	UserAvatar *string `json:"user_avatar,omitempty"`
}

// OrganizationPet представляет связь организации с питомцем
type OrganizationPet struct {
	ID             int       `json:"id"`
	OrganizationID int       `json:"organization_id"`
	PetID          int       `json:"pet_id"`
	AddedAt        time.Time `json:"added_at"`
	Notes          *string   `json:"notes,omitempty"`
}

// CreateOrganizationRequest - запрос на создание организации
type CreateOrganizationRequest struct {
	Name      string  `json:"name" binding:"required"`
	ShortName *string `json:"short_name"`
	LegalForm *string `json:"legal_form"`
	Type      string  `json:"type" binding:"required"` // shelter, vet_clinic, pet_shop, foundation, kennel, other

	INN              *string `json:"inn"`
	OGRN             *string `json:"ogrn"`
	KPP              *string `json:"kpp"`
	RegistrationDate *string `json:"registration_date"`

	Email   *string `json:"email"`
	Phone   *string `json:"phone"`
	Website *string `json:"website"`

	AddressFull       *string `json:"address_full"`
	AddressPostalCode *string `json:"address_postal_code"`
	AddressRegion     *string `json:"address_region"`
	AddressCity       *string `json:"address_city"`
	AddressStreet     *string `json:"address_street"`
	AddressHouse      *string `json:"address_house"`
	AddressOffice     *string `json:"address_office"`

	GeoLat *float64 `json:"geo_lat"`
	GeoLon *float64 `json:"geo_lon"`

	Description *string `json:"description"`
	Bio         *string `json:"bio"`

	DirectorName     *string `json:"director_name"`
	DirectorPosition *string `json:"director_position"`

	// Расширенные поля от DaData
	StateStatus           *string `json:"state_status"`
	StateLiquidationDate  *string `json:"state_liquidation_date"`
	StateRegistrationDate *string `json:"state_registration_date"`
	Capital               *int64  `json:"capital"`
	EmployeeCount         *int    `json:"employee_count"`
	OKVED                 *string `json:"okved"`
	OKVEDType             *string `json:"okved_type"`
	OKVEDs                *string `json:"okveds"` // JSON string
	OKPO                  *string `json:"okpo"`
	OKTMO                 *string `json:"oktmo"`
	OKATO                 *string `json:"okato"`
	OKOGU                 *string `json:"okogu"`
	OKFS                  *string `json:"okfs"`
	OKOPF                 *string `json:"okopf"`
	TaxSystem             *string `json:"tax_system"`
	FinanceIncome         *int64  `json:"finance_income"`
	FinanceExpense        *int64  `json:"finance_expense"`
	FinanceYear           *int    `json:"finance_year"`
	BranchType            *string `json:"branch_type"`
	BranchCount           *int    `json:"branch_count"`
	Founders              *string `json:"founders"`     // JSON string
	Managers              *string `json:"managers"`     // JSON string
	Predecessors          *string `json:"predecessors"` // JSON string
	Successors            *string `json:"successors"`   // JSON string
	Licenses              *string `json:"licenses"`     // JSON string
	EmailsJSON            *string `json:"emails_json"`  // JSON string
	PhonesJSON            *string `json:"phones_json"`  // JSON string
}

// UpdateOrganizationRequest - запрос на обновление организации
type UpdateOrganizationRequest struct {
	Name      *string `json:"name"`
	ShortName *string `json:"short_name"`
	LegalForm *string `json:"legal_form"`
	Type      *string `json:"type"`

	Email   *string `json:"email"`
	Phone   *string `json:"phone"`
	Website *string `json:"website"`

	AddressFull       *string `json:"address_full"`
	AddressPostalCode *string `json:"address_postal_code"`
	AddressRegion     *string `json:"address_region"`
	AddressCity       *string `json:"address_city"`
	AddressStreet     *string `json:"address_street"`
	AddressHouse      *string `json:"address_house"`
	AddressOffice     *string `json:"address_office"`

	GeoLat *float64 `json:"geo_lat"`
	GeoLon *float64 `json:"geo_lon"`

	Description *string `json:"description"`
	Bio         *string `json:"bio"`

	DirectorName     *string `json:"director_name"`
	DirectorPosition *string `json:"director_position"`

	ProfileVisibility *string `json:"profile_visibility"`
	ShowPhone         *string `json:"show_phone"`
	ShowEmail         *string `json:"show_email"`
	AllowMessages     *string `json:"allow_messages"`
}

// AddMemberRequest - запрос на добавление участника
type AddMemberRequest struct {
	UserID           int     `json:"user_id" binding:"required"`
	Role             string  `json:"role" binding:"required"` // admin, moderator, member
	Position         *string `json:"position"`
	CanPost          bool    `json:"can_post"`
	CanEdit          bool    `json:"can_edit"`
	CanManageMembers bool    `json:"can_manage_members"`
}

// UpdateMemberRequest - запрос на обновление участника
type UpdateMemberRequest struct {
	Role             *string `json:"role"`
	Position         *string `json:"position"`
	CanPost          *bool   `json:"can_post"`
	CanEdit          *bool   `json:"can_edit"`
	CanManageMembers *bool   `json:"can_manage_members"`
}
