package models

import "time"

// AdminLog представляет запись в логе действий администратора
type AdminLog struct {
	ID         int       `json:"id"`
	AdminID    int       `json:"admin_id"`
	AdminEmail string    `json:"admin_email"`
	ActionType string    `json:"action_type"`
	TargetType string    `json:"target_type"`
	TargetID   int       `json:"target_id"`
	TargetName string    `json:"target_name,omitempty"`
	Details    string    `json:"details,omitempty"`
	IPAddress  string    `json:"ip_address,omitempty"`
	UserAgent  string    `json:"user_agent,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// Типы действий
const (
	ActionVerifyUser   = "verify_user"
	ActionUnverifyUser = "unverify_user"
	ActionGrantRole    = "grant_role"
	ActionRevokeRole   = "revoke_role"
	ActionDeletePost   = "delete_post"
	ActionDeleteUser   = "delete_user"
	ActionUpdateOrg    = "update_organization"
	ActionDeleteOrg    = "delete_organization"
)

// Типы целей
const (
	TargetUser         = "user"
	TargetPost         = "post"
	TargetRole         = "role"
	TargetOrganization = "organization"
)

// AdminLogResponse для API ответа
type AdminLogResponse struct {
	ID         int    `json:"id"`
	AdminID    int    `json:"admin_id"`
	AdminEmail string `json:"admin_email"`
	ActionType string `json:"action_type"`
	TargetType string `json:"target_type"`
	TargetID   int    `json:"target_id"`
	TargetName string `json:"target_name,omitempty"`
	Details    string `json:"details,omitempty"`
	IPAddress  string `json:"ip_address,omitempty"`
	CreatedAt  string `json:"created_at"`
}
