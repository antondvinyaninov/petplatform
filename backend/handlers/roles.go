package handlers

import (
	"backend/models"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// GetUserRolesHandler возвращает все роли пользователя
func GetUserRolesHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Получаем user_id из URL
		pathParts := strings.Split(r.URL.Path, "/")
		if len(pathParts) < 5 {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}
		userID, err := strconv.Atoi(pathParts[4])
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		// Получаем роли пользователя
		query := `
			SELECT 
				ur.id, ur.user_id, ur.role, ur.granted_by, 
				ur.granted_at, ur.expires_at, ur.is_active, ur.notes
			FROM user_roles ur
			WHERE ur.user_id = ? AND ur.is_active = 1
			ORDER BY ur.granted_at DESC
		`

		rows, err := db.Query(query, userID)
		if err != nil {
			log.Printf("❌ Error fetching user roles: %v", err)
			http.Error(w, "Failed to fetch roles", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var roles []models.UserRole
		for rows.Next() {
			var role models.UserRole
			var notes sql.NullString

			err := rows.Scan(
				&role.ID, &role.UserID, &role.Role, &role.GrantedBy,
				&role.GrantedAt, &role.ExpiresAt, &role.IsActive, &notes,
			)
			if err != nil {
				log.Printf("❌ Error scanning role: %v", err)
				continue
			}

			// Обработка NULL значения для notes
			if notes.Valid {
				role.Notes = notes.String
			} else {
				role.Notes = ""
			}

			// Получаем информацию о пользователе, который назначил роль
			if role.GrantedBy != nil {
				grantedByUser, err := getUserByID(db, *role.GrantedBy)
				if err == nil {
					role.GrantedByUser = grantedByUser
				}
			}

			roles = append(roles, role)
		}

		if roles == nil {
			roles = []models.UserRole{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    roles,
		})
	}
}

// GrantRoleHandler назначает роль пользователю
func GrantRoleHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		currentUserID := r.Context().Value("userID").(int)

		// Проверяем, что текущий пользователь - superadmin или moderator
		if !hasRole(db, currentUserID, models.RoleSuperAdmin) && !hasRole(db, currentUserID, models.RoleModerator) {
			http.Error(w, "Access denied: insufficient permissions", http.StatusForbidden)
			return
		}

		var req struct {
			UserID    int     `json:"user_id"`
			Role      string  `json:"role"`
			Notes     string  `json:"notes"`
			ExpiresAt *string `json:"expires_at"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Валидация
		if req.UserID == 0 || req.Role == "" {
			http.Error(w, "User ID and role are required", http.StatusBadRequest)
			return
		}

		if !models.IsValidRole(req.Role) {
			http.Error(w, "Invalid role", http.StatusBadRequest)
			return
		}

		// Проверяем, существует ли пользователь
		userExists, err := userExists(db, req.UserID)
		if err != nil || !userExists {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Проверяем, нет ли уже такой роли
		if hasRole(db, req.UserID, req.Role) {
			http.Error(w, "User already has this role", http.StatusConflict)
			return
		}

		// Парсим expires_at если указан
		var expiresAt *time.Time
		if req.ExpiresAt != nil && *req.ExpiresAt != "" {
			t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
			if err != nil {
				http.Error(w, "Invalid expires_at format", http.StatusBadRequest)
				return
			}
			expiresAt = &t
		}

		// Создаем роль
		query := ConvertPlaceholders(`
			INSERT INTO user_roles (user_id, role, granted_by, granted_at, expires_at, is_active, notes)
			VALUES (?, ?, ?, ?, ?, 1, ?) RETURNING id
		`)

		var roleID int64
		err = db.QueryRow(query, req.UserID, req.Role, currentUserID, time.Now(), expiresAt, req.Notes).Scan(&roleID)

		if err != nil {
			log.Printf("❌ Error granting role: %v", err)
			http.Error(w, "Failed to grant role", http.StatusInternalServerError)
			return
		}

		log.Printf("✅ Role granted: user %d got role '%s' by user %d", req.UserID, req.Role, currentUserID)

		// Получаем email администратора и имя пользователя для лога
		var adminEmail, userName string
		db.QueryRow(ConvertPlaceholders("SELECT email FROM users WHERE id = ?"), currentUserID).Scan(&adminEmail)
		db.QueryRow(ConvertPlaceholders("SELECT name FROM users WHERE id = ?"), req.UserID).Scan(&userName)

		// Создаём лог
		ipAddress := r.RemoteAddr
		userAgent := r.Header.Get("User-Agent")
		details := "Role: " + req.Role
		if req.Notes != "" {
			details += ", Notes: " + req.Notes
		}
		CreateAdminLog(
			currentUserID,
			adminEmail,
			"grant_role",
			"role",
			req.UserID,
			userName,
			details,
			ipAddress,
			userAgent,
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"role_id": roleID,
			"message": "Role granted successfully",
		})
	}
}

// RevokeRoleHandler отзывает роль у пользователя
func RevokeRoleHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		currentUserID := r.Context().Value("userID").(int)

		// Проверяем, что текущий пользователь - superadmin или moderator
		if !hasRole(db, currentUserID, models.RoleSuperAdmin) && !hasRole(db, currentUserID, models.RoleModerator) {
			http.Error(w, "Access denied: insufficient permissions", http.StatusForbidden)
			return
		}

		var req struct {
			UserID int    `json:"user_id"`
			Role   string `json:"role"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Валидация
		if req.UserID == 0 || req.Role == "" {
			http.Error(w, "User ID and role are required", http.StatusBadRequest)
			return
		}

		// Нельзя отозвать роль 'user'
		if req.Role == models.RoleUser {
			http.Error(w, "Cannot revoke 'user' role", http.StatusBadRequest)
			return
		}

		// Деактивируем роль
		result, err := db.Exec(ConvertPlaceholders(`
			UPDATE user_roles 
			SET is_active = 0
			WHERE user_id = ? AND role = ? AND is_active = 1
		`), req.UserID, req.Role)

		if err != nil {
			log.Printf("❌ Error revoking role: %v", err)
			http.Error(w, "Failed to revoke role", http.StatusInternalServerError)
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			http.Error(w, "Role not found or already revoked", http.StatusNotFound)
			return
		}

		log.Printf("✅ Role revoked: user %d lost role '%s' by user %d", req.UserID, req.Role, currentUserID)

		// Получаем email администратора и имя пользователя для лога
		var adminEmail, userName string
		db.QueryRow(ConvertPlaceholders("SELECT email FROM users WHERE id = ?"), currentUserID).Scan(&adminEmail)
		db.QueryRow(ConvertPlaceholders("SELECT name FROM users WHERE id = ?"), req.UserID).Scan(&userName)

		// Создаём лог
		ipAddress := r.RemoteAddr
		userAgent := r.Header.Get("User-Agent")
		CreateAdminLog(
			currentUserID,
			adminEmail,
			"revoke_role",
			"role",
			req.UserID,
			userName,
			"Role: "+req.Role,
			ipAddress,
			userAgent,
		)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Role revoked successfully",
		})
	}
}

// GetAllRolesHandler возвращает список всех доступных ролей
func GetAllRolesHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		roles := []map[string]interface{}{
			{
				"value":       models.RoleUser,
				"label":       "Пользователь",
				"description": "Обычный пользователь платформы",
			},
			{
				"value":       models.RoleVolunteer,
				"label":       "Волонтёр",
				"description": "Зоопомощник, помогает бездомным животным",
			},
			{
				"value":       models.RoleShelterAdmin,
				"label":       "Администратор приюта",
				"description": "Управляет приютом и его животными",
			},
			{
				"value":       models.RoleClinicAdmin,
				"label":       "Администратор ветклиники",
				"description": "Управляет ветклиникой и медицинскими записями",
			},
			{
				"value":       models.RoleModerator,
				"label":       "Модератор",
				"description": "Модерирует контент и пользователей",
			},
			{
				"value":       models.RoleSuperAdmin,
				"label":       "Суперадминистратор",
				"description": "Полный доступ ко всем функциям платформы",
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    roles,
		})
	}
}

// Вспомогательные функции

func hasRole(db *sql.DB, userID int, role string) bool {
	var count int
	err := db.QueryRow(ConvertPlaceholders(`
		SELECT COUNT(*) FROM user_roles 
		WHERE user_id = ? AND role = ? AND is_active = 1
		AND (expires_at IS NULL OR expires_at > ?)
	`), userID, role, time.Now()).Scan(&count)

	return err == nil && count > 0
}

func getUserActiveRoles(db *sql.DB, userID int) ([]string, error) {
	rows, err := db.Query(ConvertPlaceholders(`
		SELECT role FROM user_roles 
		WHERE user_id = ? AND is_active = 1
		AND (expires_at IS NULL OR expires_at > ?)
		ORDER BY granted_at DESC
	`), userID, time.Now())

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			continue
		}
		roles = append(roles, role)
	}

	return roles, nil
}
