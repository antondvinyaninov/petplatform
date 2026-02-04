package models

import "time"

type User struct {
	ID                int        `json:"id"`
	Name              string     `json:"name"`
	LastName          string     `json:"last_name"`
	Email             string     `json:"email"`
	Password          string     `json:"-"`
	Bio               string     `json:"bio"`
	Phone             string     `json:"phone"`
	Location          string     `json:"location"`
	Avatar            string     `json:"avatar"`
	CoverPhoto        string     `json:"cover_photo"`
	ProfileVisibility string     `json:"profile_visibility"`
	ShowPhone         string     `json:"show_phone"`
	ShowEmail         string     `json:"show_email"`
	AllowMessages     string     `json:"allow_messages"`
	ShowOnline        string     `json:"show_online"`
	Verified          bool       `json:"verified"`
	VerifiedAt        *string    `json:"verified_at,omitempty"`
	VerifiedBy        *int       `json:"verified_by,omitempty"`
	CreatedAt         string     `json:"created_at"`
	LastSeen          *time.Time `json:"last_seen,omitempty"`
	IsOnline          bool       `json:"is_online"` // Онлайн статус (активен в последние 5 минут)
}

type UserResponse struct {
	ID                int        `json:"id"`
	Name              string     `json:"name"`
	LastName          string     `json:"last_name"`
	Email             string     `json:"email"`
	Bio               string     `json:"bio"`
	Phone             string     `json:"phone"`
	Location          string     `json:"location"`
	Avatar            string     `json:"avatar"`
	CoverPhoto        string     `json:"cover_photo"`
	ProfileVisibility string     `json:"profile_visibility"`
	ShowPhone         string     `json:"show_phone"`
	ShowEmail         string     `json:"show_email"`
	AllowMessages     string     `json:"allow_messages"`
	ShowOnline        string     `json:"show_online"`
	Verified          bool       `json:"verified"`
	VerifiedAt        *string    `json:"verified_at,omitempty"`
	CreatedAt         string     `json:"created_at"`
	LastSeen          *time.Time `json:"last_seen,omitempty"` // Время последней активности
	IsOnline          bool       `json:"is_online"`           // Онлайн статус (активен в последние 5 минут)
}

type CreateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type UpdateUserRequest struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}
