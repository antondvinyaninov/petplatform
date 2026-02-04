package handlers

import (
	"backend/models"
	"backend/db"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// CreateOrganizationHandler создает новую организацию
func CreateOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		models.CreateOrganizationRequest
		IsRepresentative bool `json:"is_representative"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	log.Printf("📝 Creating organization: name=%s, is_representative=%v", req.Name, req.IsRepresentative)

	// Определяем owner_user_id: если представитель - userID, иначе NULL
	var ownerUserID interface{}
	if req.IsRepresentative {
		ownerUserID = userID
	} else {
		ownerUserID = nil
	}

	// Создаем организацию (только обязательные поля + те что передаются)
	query := ConvertPlaceholders(`
		INSERT INTO organizations (
			name, type,
			short_name, legal_form,
			inn, ogrn, kpp, registration_date,
			email, phone, website,
			address_full, address_postal_code, address_region, address_city,
			address_street, address_house, address_office,
			geo_lat, geo_lon,
			description, bio,
			director_name, director_position,
			owner_user_id,
			state_status, state_liquidation_date, state_registration_date,
			capital, employee_count,
			okved, okved_type, okveds,
			okpo, oktmo, okato, okogu, okfs, okopf,
			tax_system, finance_income, finance_expense, finance_year,
			branch_type, branch_count,
			founders, managers, predecessors, successors, licenses,
			emails_json, phones_json
		) VALUES (
			?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
			?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
		) RETURNING id
	`)

	var orgID int64
	err := db.DB.QueryRow(
		query,
		req.Name, req.Type,
		req.ShortName, req.LegalForm,
		req.INN, req.OGRN, req.KPP, req.RegistrationDate,
		req.Email, req.Phone, req.Website,
		req.AddressFull, req.AddressPostalCode, req.AddressRegion, req.AddressCity,
		req.AddressStreet, req.AddressHouse, req.AddressOffice,
		req.GeoLat, req.GeoLon,
		req.Description, req.Bio,
		req.DirectorName, req.DirectorPosition,
		ownerUserID,
		req.StateStatus, req.StateLiquidationDate, req.StateRegistrationDate,
		req.Capital, req.EmployeeCount,
		req.OKVED, req.OKVEDType, req.OKVEDs,
		req.OKPO, req.OKTMO, req.OKATO, req.OKOGU, req.OKFS, req.OKOPF,
		req.TaxSystem, req.FinanceIncome, req.FinanceExpense, req.FinanceYear,
		req.BranchType, req.BranchCount,
		req.Founders, req.Managers, req.Predecessors, req.Successors, req.Licenses,
		req.EmailsJSON, req.PhonesJSON,
	).Scan(&orgID)

	if err != nil {
		log.Printf("❌ Failed to create organization: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Failed to create organization: "+err.Error())
		return
	}

	log.Printf("✅ Organization created: id=%d, name=%s, inn=%s, status=%v", orgID, req.Name, stringOrEmpty(req.INN), stringOrEmpty(req.StateStatus))

	// Добавляем создателя как owner ТОЛЬКО если он представитель
	if req.IsRepresentative {
		_, err = db.DB.Exec(ConvertPlaceholders(`
			INSERT INTO organization_members (organization_id, user_id, role, can_post, can_edit, can_manage_members)
			VALUES (?, ?, 'owner', true, true, true)
		`), orgID, userID)

		if err != nil {
			log.Printf("❌ Failed to add owner: %v", err)
			sendJSONError(w, http.StatusInternalServerError, "Failed to add owner: "+err.Error())
			return
		}
		log.Printf("✅ User %d added as owner of organization %d", userID, orgID)
	} else {
		log.Printf("ℹ️ Organization %d created without owner (public info)", orgID)
	}

	sendJSONSuccess(w, map[string]interface{}{"id": orgID})
}

// OrganizationHandler обрабатывает запросы к конкретной организации (GET, PUT)
func OrganizationHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		GetOrganizationHandler(w, r)
	case http.MethodPut:
		UpdateOrganizationHandler(w, r)
	default:
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// GetOrganizationHandler получает организацию по ID
func GetOrganizationHandler(w http.ResponseWriter, r *http.Request) {

	// Извлекаем ID из URL
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	orgID := parts[len(parts)-1]

	var org models.Organization
	query := ConvertPlaceholders(`
		SELECT 
			id, name, short_name, legal_form, type,
			inn, ogrn, kpp, registration_date,
			email, phone, website,
			address_full, address_postal_code, address_region, address_city,
			address_street, address_house, address_office,
			geo_lat, geo_lon,
			description, bio,
			logo, cover_photo,
			director_name, director_position,
			owner_user_id,
			profile_visibility, show_phone, show_email, allow_messages,
			is_verified, is_active, status,
			created_at, updated_at
		FROM organizations
		WHERE id = ?
	`)

	err := db.DB.QueryRow(query, orgID).Scan(
		&org.ID, &org.Name, &org.ShortName, &org.LegalForm, &org.Type,
		&org.INN, &org.OGRN, &org.KPP, &org.RegistrationDate,
		&org.Email, &org.Phone, &org.Website,
		&org.AddressFull, &org.AddressPostalCode, &org.AddressRegion, &org.AddressCity,
		&org.AddressStreet, &org.AddressHouse, &org.AddressOffice,
		&org.GeoLat, &org.GeoLon,
		&org.Description, &org.Bio,
		&org.Logo, &org.CoverPhoto,
		&org.DirectorName, &org.DirectorPosition,
		&org.OwnerUserID,
		&org.ProfileVisibility, &org.ShowPhone, &org.ShowEmail, &org.AllowMessages,
		&org.IsVerified, &org.IsActive, &org.Status,
		&org.CreatedAt, &org.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		sendJSONError(w, http.StatusNotFound, "Organization not found")
		return
	}
	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to get organization: "+err.Error())
		return
	}

	sendJSONSuccess(w, org)
}

// GetAllOrganizationsHandler получает все активные организации
func GetAllOrganizationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	query := `
		SELECT 
			id, name, short_name, type, logo, bio,
			address_city, address_region, is_verified, created_at
		FROM organizations
		ORDER BY created_at DESC
	`

	rows, err := db.DB.Query(query)
	if err != nil {
		log.Printf("❌ GetAllOrganizationsHandler error: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Failed to get organizations: "+err.Error())
		return
	}
	defer rows.Close()

	organizations := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name string
		var shortName, orgType, logo, bio, city, region sql.NullString
		var isVerified bool
		var createdAt time.Time

		err := rows.Scan(&id, &name, &shortName, &orgType, &logo, &bio, &city, &region, &isVerified, &createdAt)
		if err != nil {
			log.Printf("❌ Scan error: %v", err)
			continue
		}

		organizations = append(organizations, map[string]interface{}{
			"id":             id,
			"name":           name,
			"short_name":     shortName.String,
			"type":           orgType.String,
			"logo":           logo.String,
			"bio":            bio.String,
			"address_city":   city.String,
			"address_region": region.String,
			"is_verified":    isVerified,
			"created_at":     createdAt,
		})
	}

	log.Printf("✅ GetAllOrganizationsHandler: returned %d organizations", len(organizations))
	sendJSONSuccess(w, organizations)
}

// UpdateOrganizationHandler обновляет организацию
func UpdateOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Извлекаем ID из URL
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	orgID := parts[len(parts)-1]

	// Проверяем права доступа
	var canEdit bool
	err := db.DB.QueryRow(ConvertPlaceholders(`
		SELECT can_edit FROM organization_members
		WHERE organization_id = ? AND user_id = ?
	`), orgID, userID).Scan(&canEdit)

	if err == sql.ErrNoRows || !canEdit {
		sendJSONError(w, http.StatusForbidden, "You don't have permission to edit this organization")
		return
	}

	var req models.UpdateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Обновляем только переданные поля
	query := `UPDATE organizations SET updated_at = ?`
	args := []interface{}{time.Now()}

	if req.Name != nil {
		query += ", name = ?"
		args = append(args, *req.Name)
	}
	if req.ShortName != nil {
		query += ", short_name = ?"
		args = append(args, *req.ShortName)
	}
	if req.Description != nil {
		query += ", description = ?"
		args = append(args, *req.Description)
	}
	if req.Bio != nil {
		query += ", bio = ?"
		args = append(args, *req.Bio)
	}

	query += " WHERE id = ?"
	args = append(args, orgID)

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to update organization: "+err.Error())
		return
	}

	sendJSONSuccess(w, map[string]interface{}{"message": "Organization updated successfully"})
}

// DeleteOrganizationHandler удаляет организацию
func DeleteOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Извлекаем ID из URL
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	orgID := parts[len(parts)-1]

	// Проверяем, что пользователь - владелец
	var ownerID int
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT owner_user_id FROM organizations WHERE id = ?"), orgID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		sendJSONError(w, http.StatusNotFound, "Organization not found")
		return
	}
	if ownerID != userID {
		sendJSONError(w, http.StatusForbidden, "Only owner can delete organization")
		return
	}

	_, err = db.DB.Exec(ConvertPlaceholders("DELETE FROM organizations WHERE id = ?"), orgID)
	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to delete organization: "+err.Error())
		return
	}

	sendJSONSuccess(w, map[string]interface{}{"message": "Organization deleted successfully"})
}

// GetUserOrganizationsHandler получает все организации пользователя
func GetUserOrganizationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Извлекаем userID из URL
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	userIDStr := parts[len(parts)-1]
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	query := `
		SELECT 
			o.id, o.name, o.short_name, o.type, o.logo, o.bio,
			o.address_city, o.address_region, o.is_verified, o.created_at,
			om.role
		FROM organizations o
		JOIN organization_members om ON o.id = om.organization_id
		WHERE om.user_id = ?
		ORDER BY o.created_at DESC
	`

	rows, err := db.DB.Query(query, userID)
	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to get organizations: "+err.Error())
		return
	}
	defer rows.Close()

	organizations := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name string
		var shortName, orgType, logo, bio, city, region, role sql.NullString
		var isVerified bool
		var createdAt time.Time

		err := rows.Scan(&id, &name, &shortName, &orgType, &logo, &bio, &city, &region, &isVerified, &createdAt, &role)
		if err != nil {
			continue
		}

		organizations = append(organizations, map[string]interface{}{
			"id":             id,
			"name":           name,
			"short_name":     shortName.String,
			"type":           orgType.String,
			"logo":           logo.String,
			"bio":            bio.String,
			"address_city":   city.String,
			"address_region": region.String,
			"is_verified":    isVerified,
			"created_at":     createdAt,
			"role":           role.String,
		})
	}

	sendJSONSuccess(w, organizations)
}

// GetOrganizationMembersHandler получает участников организации
func GetOrganizationMembersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Извлекаем ID из URL: /api/organizations/members/{id}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	orgID := parts[len(parts)-1] // Последняя часть - это ID

	query := ConvertPlaceholders(`
		SELECT 
			om.id, om.organization_id, om.user_id, om.role, om.position,
			om.can_post, om.joined_at,
			u.name, u.last_name, u.avatar
		FROM organization_members om
		JOIN users u ON om.user_id = u.id
		WHERE om.organization_id = ?
		ORDER BY 
			CASE om.role
				WHEN 'owner' THEN 1
				WHEN 'admin' THEN 2
				WHEN 'moderator' THEN 3
				ELSE 4
			END,
			om.joined_at ASC
	`)

	rows, err := db.DB.Query(query, orgID)
	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to get members: "+err.Error())
		return
	}
	defer rows.Close()

	members := []models.OrganizationMember{}
	for rows.Next() {
		var member models.OrganizationMember
		var lastName, avatar, position sql.NullString

		err := rows.Scan(
			&member.ID, &member.OrganizationID, &member.UserID, &member.Role, &position,
			&member.CanPost, &member.JoinedAt,
			&member.UserName, &lastName, &avatar,
		)
		if err != nil {
			continue
		}

		// Устанавливаем права на основе роли
		switch member.Role {
		case "owner":
			member.CanEdit = true
			member.CanManageMembers = true
		case "admin":
			member.CanEdit = true
			member.CanManageMembers = true
		case "moderator":
			member.CanEdit = false
			member.CanManageMembers = false
		default:
			member.CanEdit = false
			member.CanManageMembers = false
		}

		if lastName.Valid && lastName.String != "" {
			member.UserName += " " + lastName.String
		}
		if avatar.Valid {
			member.UserAvatar = &avatar.String
		}
		if position.Valid {
			member.Position = &position.String
		}

		members = append(members, member)
	}

	sendJSONSuccess(w, members)
}

// Helper functions
func sendJSONSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

func sendJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// AddMemberHandler добавляет участника в организацию
func AddMemberHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		OrganizationID int    `json:"organization_id"`
		UserID         int    `json:"user_id"`
		Role           string `json:"role"`
		Position       string `json:"position"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Проверяем права доступа (только owner и admin могут добавлять)
	var canManage bool
	err := db.DB.QueryRow(ConvertPlaceholders(`
		SELECT can_manage_members FROM organization_members
		WHERE organization_id = ? AND user_id = ?
	`), req.OrganizationID, userID).Scan(&canManage)

	if err == sql.ErrNoRows || !canManage {
		sendJSONError(w, http.StatusForbidden, "You don't have permission to manage members")
		return
	}

	// Проверяем, что пользователь еще не является участником
	var exists bool
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT EXISTS(SELECT 1 FROM organization_members WHERE organization_id = ? AND user_id = ?)
	`), req.OrganizationID, req.UserID).Scan(&exists)

	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}

	if exists {
		sendJSONError(w, http.StatusBadRequest, "User is already a member")
		return
	}

	// Устанавливаем права в зависимости от роли
	canPost := req.Role == "owner" || req.Role == "admin" || req.Role == "moderator"
	canEdit := req.Role == "owner" || req.Role == "admin"
	canManageMembers := req.Role == "owner" || req.Role == "admin"

	// Добавляем участника
	_, err = db.DB.Exec(ConvertPlaceholders(`
		INSERT INTO organization_members (organization_id, user_id, role, position, can_post, can_edit, can_manage_members)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`), req.OrganizationID, req.UserID, req.Role, req.Position, canPost, canEdit, canManageMembers)

	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to add member: "+err.Error())
		return
	}

	sendJSONSuccess(w, map[string]interface{}{"message": "Member added successfully"})
}

// UpdateMemberHandler обновляет роль участника
func UpdateMemberHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		MemberID int    `json:"member_id"`
		Role     string `json:"role"`
		Position string `json:"position"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Получаем organization_id участника
	var orgID int
	err := db.DB.QueryRow(ConvertPlaceholders("SELECT organization_id FROM organization_members WHERE id = ?"), req.MemberID).Scan(&orgID)
	if err == sql.ErrNoRows {
		sendJSONError(w, http.StatusNotFound, "Member not found")
		return
	}

	// Проверяем права доступа
	var canManage bool
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT can_manage_members FROM organization_members
		WHERE organization_id = ? AND user_id = ?
	`), orgID, userID).Scan(&canManage)

	if err == sql.ErrNoRows || !canManage {
		sendJSONError(w, http.StatusForbidden, "You don't have permission to manage members")
		return
	}

	// Устанавливаем права в зависимости от роли
	canPost := req.Role == "owner" || req.Role == "admin" || req.Role == "moderator"
	canEdit := req.Role == "owner" || req.Role == "admin"
	canManageMembers := req.Role == "owner" || req.Role == "admin"

	// Обновляем участника
	_, err = db.DB.Exec(ConvertPlaceholders(`
		UPDATE organization_members 
		SET role = ?, position = ?, can_post = ?, can_edit = ?, can_manage_members = ?
		WHERE id = ?
	`), req.Role, req.Position, canPost, canEdit, canManageMembers, req.MemberID)

	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to update member: "+err.Error())
		return
	}

	sendJSONSuccess(w, map[string]interface{}{"message": "Member updated successfully"})
}

// RemoveMemberHandler удаляет участника из организации
func RemoveMemberHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		MemberID int `json:"member_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Получаем информацию об участнике
	var orgID, memberUserID int
	var memberRole string
	err := db.DB.QueryRow(ConvertPlaceholders(`
		SELECT organization_id, user_id, role FROM organization_members WHERE id = ?
	`), req.MemberID).Scan(&orgID, &memberUserID, &memberRole)

	if err == sql.ErrNoRows {
		sendJSONError(w, http.StatusNotFound, "Member not found")
		return
	}

	// Нельзя удалить owner
	if memberRole == "owner" {
		sendJSONError(w, http.StatusForbidden, "Cannot remove organization owner")
		return
	}

	// Проверяем права доступа
	var canManage bool
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT can_manage_members FROM organization_members
		WHERE organization_id = ? AND user_id = ?
	`), orgID, userID).Scan(&canManage)

	if err == sql.ErrNoRows || !canManage {
		sendJSONError(w, http.StatusForbidden, "You don't have permission to manage members")
		return
	}

	// Удаляем участника
	_, err = db.DB.Exec(ConvertPlaceholders("DELETE FROM organization_members WHERE id = ?"), req.MemberID)
	if err != nil {
		sendJSONError(w, http.StatusInternalServerError, "Failed to remove member: "+err.Error())
		return
	}

	sendJSONSuccess(w, map[string]interface{}{"message": "Member removed successfully"})
}

// ClaimOwnershipHandler - заявка на владение организацией
func ClaimOwnershipHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := r.Context().Value("userID").(int)
	if userID == 0 {
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Извлекаем ID из URL
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	orgIDStr := parts[len(parts)-2] // /api/organizations/{id}/claim-ownership
	orgID, err := strconv.Atoi(orgIDStr)
	if err != nil {
		sendJSONError(w, http.StatusBadRequest, "Invalid organization ID")
		return
	}

	// Проверяем что организация существует
	var exists bool
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT EXISTS(SELECT 1 FROM organizations WHERE id = ?)
	`), orgID).Scan(&exists)

	if err != nil || !exists {
		sendJSONError(w, http.StatusNotFound, "Organization not found")
		return
	}

	// Проверяем что у организации нет owner
	var hasOwner bool
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT EXISTS(
			SELECT 1 FROM organization_members 
			WHERE organization_id = ? AND role = 'owner'
		)
	`), orgID).Scan(&hasOwner)

	if err != nil {
		log.Printf("❌ Error checking owner: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if hasOwner {
		sendJSONError(w, http.StatusBadRequest, "Organization already has an owner")
		return
	}

	// Проверяем что пользователь еще не является участником
	var isMember bool
	err = db.DB.QueryRow(ConvertPlaceholders(`
		SELECT EXISTS(
			SELECT 1 FROM organization_members 
			WHERE organization_id = ? AND user_id = ?
		)
	`), orgID, userID).Scan(&isMember)

	if err != nil {
		log.Printf("❌ Error checking membership: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if isMember {
		sendJSONError(w, http.StatusBadRequest, "You are already a member of this organization")
		return
	}

	// Добавляем пользователя как owner
	_, err = db.DB.Exec(ConvertPlaceholders(`
		INSERT INTO organization_members (organization_id, user_id, role, can_post, can_edit, can_manage_members, joined_at)
		VALUES (?, ?, 'owner', true, true, true, ?)
	`), orgID, userID, time.Now())

	if err != nil {
		log.Printf("❌ Failed to add owner: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Failed to claim ownership")
		return
	}

	log.Printf("✅ User %d claimed ownership of organization %d", userID, orgID)
	sendJSONSuccess(w, map[string]interface{}{
		"message": "You are now the owner of this organization",
	})
}

// GetMyOrganizationsHandler возвращает организации пользователя где он owner или admin
func GetMyOrganizationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userIDValue := r.Context().Value("userID")
	log.Printf("🔍 GetMyOrganizationsHandler: userIDValue=%v, type=%T", userIDValue, userIDValue)

	if userIDValue == nil {
		log.Printf("❌ userID not found in context")
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized: userID not found in context")
		return
	}

	userID, ok := userIDValue.(int)
	if !ok || userID == 0 {
		log.Printf("❌ invalid userID type or zero: %v", userIDValue)
		sendJSONError(w, http.StatusUnauthorized, "Unauthorized: invalid userID")
		return
	}

	log.Printf("✅ userID extracted: %d", userID)

	// Helper для конвертации ? в $1, $2 для PostgreSQL
	convertPlaceholders := func(query string) string {
		if os.Getenv("ENVIRONMENT") == "production" {
			// PostgreSQL - конвертируем ? в $1, $2, $3...
			result := ""
			paramNum := 1
			for _, char := range query {
				if char == '?' {
					result += fmt.Sprintf("$%d", paramNum)
					paramNum++
				} else {
					result += string(char)
				}
			}
			return result
		}
		return query // SQLite - оставляем как есть
	}

	// Получаем организации где пользователь owner или admin с правом публикации
	query := `
		SELECT 
			o.id, o.name, o.type, o.logo, o.bio,
			om.role, om.can_post
		FROM organizations o
		INNER JOIN organization_members om ON o.id = om.organization_id
		WHERE om.user_id = ? 
		AND om.role IN ('owner', 'admin')
		AND om.can_post = TRUE
		ORDER BY o.name ASC
	`

	query = convertPlaceholders(query)

	log.Printf("🔍 Executing query for userID=%d", userID)
	rows, err := db.DB.Query(query, userID)
	if err != nil {
		log.Printf("❌ Query error: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Failed to fetch organizations: "+err.Error())
		return
	}
	defer rows.Close()

	organizations := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var name string
		var orgType, logo, bio sql.NullString
		var role string
		var canPost bool

		if err := rows.Scan(&id, &name, &orgType, &logo, &bio, &role, &canPost); err != nil {
			log.Printf("❌ Scan error: %v", err)
			sendJSONError(w, http.StatusInternalServerError, "Failed to scan organization: "+err.Error())
			return
		}

		org := map[string]interface{}{
			"id":       id,
			"name":     name,
			"type":     "",
			"logo":     nil,
			"bio":      nil,
			"role":     role,
			"can_post": canPost,
		}
		if orgType.Valid {
			org["type"] = orgType.String
		}
		if logo.Valid {
			org["logo"] = logo.String
		}
		if bio.Valid {
			org["bio"] = bio.String
		}

		organizations = append(organizations, org)
		log.Printf("✅ Found organization: id=%d, name=%s, role=%s, can_post=%v", id, name, role, canPost)
	}

	log.Printf("📋 Total organizations found: %d", len(organizations))
	sendJSONSuccess(w, map[string]interface{}{
		"organizations": organizations,
	})
}

// CheckOrganizationByInnHandler проверяет существование организации по ИНН
func CheckOrganizationByInnHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendJSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Извлекаем ИНН из URL
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		sendJSONError(w, http.StatusBadRequest, "Invalid URL")
		return
	}
	inn := parts[len(parts)-1]

	if inn == "" {
		sendJSONError(w, http.StatusBadRequest, "INN is required")
		return
	}

	var id int
	var name string
	err := db.DB.QueryRow(ConvertPlaceholders(`
		SELECT id, name FROM organizations WHERE inn = ? LIMIT 1
	`), inn).Scan(&id, &name)

	if err == sql.ErrNoRows {
		// Организация не найдена - это нормально
		sendJSONSuccess(w, nil)
		return
	}

	if err != nil {
		log.Printf("❌ Error checking organization by INN: %v", err)
		sendJSONError(w, http.StatusInternalServerError, "Database error")
		return
	}

	// Организация найдена
	sendJSONSuccess(w, map[string]interface{}{
		"id":   id,
		"name": name,
	})
}
