package models

import "time"

// UserRole представляет роль пользователя в системе
type UserRole struct {
	ID        int        `json:"id"`
	UserID    int        `json:"user_id"`
	Role      string     `json:"role"`
	GrantedBy *int       `json:"granted_by"`
	GrantedAt time.Time  `json:"granted_at"`
	ExpiresAt *time.Time `json:"expires_at"`
	IsActive  bool       `json:"is_active"`
	Notes     string     `json:"notes"`

	// Дополнительные поля для UI
	User          *User `json:"user,omitempty"`
	GrantedByUser *User `json:"granted_by_user,omitempty"`
}

// RoleType - типы ролей в системе
const (
	RoleUser         = "user"          // Обычный пользователь
	RoleVolunteer    = "volunteer"     // Волонтёр
	RoleShelterAdmin = "shelter_admin" // Администратор приюта
	RoleClinicAdmin  = "clinic_admin"  // Администратор ветклиники
	RoleModerator    = "moderator"     // Модератор контента
	RoleSuperAdmin   = "superadmin"    // Суперадминистратор
)

// ValidRoles - список всех валидных ролей
var ValidRoles = []string{
	RoleUser,
	RoleVolunteer,
	RoleShelterAdmin,
	RoleClinicAdmin,
	RoleModerator,
	RoleSuperAdmin,
}

// IsValidRole проверяет, является ли роль валидной
func IsValidRole(role string) bool {
	for _, validRole := range ValidRoles {
		if role == validRole {
			return true
		}
	}
	return false
}

// RolePermissions - права доступа для каждой роли
var RolePermissions = map[string][]string{
	RoleUser: {
		"create_post",
		"edit_own_post",
		"delete_own_post",
		"create_comment",
		"edit_own_comment",
		"delete_own_comment",
		"manage_own_pets",
	},
	RoleVolunteer: {
		"create_post",
		"edit_own_post",
		"delete_own_post",
		"create_comment",
		"edit_own_comment",
		"delete_own_comment",
		"manage_own_pets",
		"help_pets",
		"create_announcements",
	},
	RoleShelterAdmin: {
		"create_post",
		"edit_own_post",
		"delete_own_post",
		"create_comment",
		"edit_own_comment",
		"delete_own_comment",
		"manage_shelter_pets",
		"manage_shelter_staff",
		"view_shelter_analytics",
	},
	RoleClinicAdmin: {
		"create_post",
		"edit_own_post",
		"delete_own_post",
		"create_comment",
		"edit_own_comment",
		"delete_own_comment",
		"manage_clinic_pets",
		"manage_clinic_staff",
		"view_clinic_analytics",
		"manage_medical_records",
	},
	RoleModerator: {
		"view_all_posts",
		"moderate_posts",
		"moderate_comments",
		"view_reports",
		"ban_users",
		"verify_users",
	},
	RoleSuperAdmin: {
		"*", // Все права
	},
}

// HasPermission проверяет, есть ли у роли определенное право
func HasPermission(role, permission string) bool {
	permissions, exists := RolePermissions[role]
	if !exists {
		return false
	}

	// Суперадмин имеет все права
	for _, p := range permissions {
		if p == "*" || p == permission {
			return true
		}
	}

	return false
}
