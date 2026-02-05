package handlers

import (
	"backend/db"
	"backend/models"
	"encoding/json"
	"fmt"
	"strings"
)

// loadPollsForPostsBatch - оптимизированная загрузка опросов одним запросом
func loadPollsForPostsBatch(posts []models.Post, userID int) []models.Post {
	if len(posts) == 0 {
		return posts
	}

	// Собираем все ID постов
	postIDs := make([]int, len(posts))
	for i, post := range posts {
		postIDs[i] = post.ID
	}

	// Создаём плейсхолдеры для IN запроса
	placeholders := strings.Repeat("?,", len(postIDs)-1) + "?"
	args := make([]interface{}, len(postIDs))
	for i, id := range postIDs {
		args[i] = id
	}

	// Загружаем ВСЕ опросы одним запросом
	query := fmt.Sprintf(`
		SELECT 
			p.id, p.post_id, p.question, p.multiple_choice, p.anonymous_voting, 
			p.expires_at, p.created_at,
			po.id, po.poll_id, po.option_text, po.votes_count, po.option_order
		FROM polls p
		LEFT JOIN poll_options po ON p.id = po.poll_id
		WHERE p.post_id IN (%s)
		ORDER BY p.post_id, po.option_order
	`, placeholders)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return posts
	}
	defer rows.Close()

	// Группируем опросы по post_id
	pollsMap := make(map[int]*models.Poll)

	for rows.Next() {
		var poll models.Poll
		var option models.PollOption
		var optionID, pollID, optionOrder *int
		var optionText *string
		var votesCount *int

		err := rows.Scan(
			&poll.ID, &poll.PostID, &poll.Question, &poll.MultipleChoice, &poll.AnonymousVoting,
			&poll.ExpiresAt, &poll.CreatedAt,
			&optionID, &pollID, &optionText, &votesCount, &optionOrder,
		)
		if err != nil {
			continue
		}

		// Если опрос ещё не в map, добавляем
		if _, exists := pollsMap[poll.PostID]; !exists {
			pollsMap[poll.PostID] = &poll
			pollsMap[poll.PostID].Options = []models.PollOption{}
		}

		// Добавляем опцию если она есть
		if optionID != nil {
			option.ID = *optionID
			option.PollID = *pollID
			option.OptionText = *optionText
			option.VotesCount = *votesCount
			option.OptionOrder = *optionOrder
			pollsMap[poll.PostID].Options = append(pollsMap[poll.PostID].Options, option)
		}
	}

	// Если нужно загрузить голоса пользователя - делаем это одним запросом
	if userID > 0 {
		pollIDs := make([]int, 0, len(pollsMap))
		for _, poll := range pollsMap {
			pollIDs = append(pollIDs, poll.ID)
		}

		if len(pollIDs) > 0 {
			placeholders := strings.Repeat("?,", len(pollIDs)-1) + "?"
			args := make([]interface{}, len(pollIDs)+1)
			args[0] = userID
			for i, id := range pollIDs {
				args[i+1] = id
			}

			voteQuery := fmt.Sprintf(`
				SELECT poll_id, option_id 
				FROM poll_votes 
				WHERE user_id = ? AND poll_id IN (%s)
			`, placeholders)

			voteRows, err := db.DB.Query(voteQuery, args...)
			if err == nil {
				defer voteRows.Close()

				userVotesMap := make(map[int][]int) // poll_id -> []option_id
				for voteRows.Next() {
					var pollID, optionID int
					voteRows.Scan(&pollID, &optionID)
					userVotesMap[pollID] = append(userVotesMap[pollID], optionID)
				}

				// Добавляем голоса к опросам
				for postID, poll := range pollsMap {
					if votes, exists := userVotesMap[poll.ID]; exists {
						pollsMap[postID].UserVotes = votes
					}
				}
			}
		}
	}

	// Прикрепляем опросы к постам
	for i := range posts {
		if poll, exists := pollsMap[posts[i].ID]; exists {
			posts[i].Poll = poll
		}
	}

	return posts
}

// loadPetsForPostsBatch - оптимизированная загрузка питомцев одним запросом
func loadPetsForPostsBatch(posts []models.Post) []models.Post {
	if len(posts) == 0 {
		return posts
	}

	// Собираем все ID питомцев из всех постов
	petIDsSet := make(map[int]bool)
	postPetsMap := make(map[int][]int) // post_id -> []pet_id

	for _, post := range posts {
		if len(post.AttachedPets) > 0 && len(post.AttachedPets) <= 5 {
			postPetsMap[post.ID] = post.AttachedPets
			for _, petID := range post.AttachedPets {
				petIDsSet[petID] = true
			}
		}
	}

	if len(petIDsSet) == 0 {
		return posts
	}

	// Конвертируем set в slice
	petIDs := make([]int, 0, len(petIDsSet))
	for petID := range petIDsSet {
		petIDs = append(petIDs, petID)
	}

	// Загружаем ВСЕ питомцы одним запросом
	placeholders := strings.Repeat("?,", len(petIDs)-1) + "?"
	args := make([]interface{}, len(petIDs))
	for i, id := range petIDs {
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT 
			p.id, p.user_id, p.name, p.species, p.breed, p.gender, p.birth_date, 
			p.color, p.size, p.photo, p.status, p.city, p.region, p.urgent, p.story,
			p.organization_id, o.name as organization_name, o.type as organization_type,
			p.created_at
		FROM pets p
		LEFT JOIN organizations o ON p.organization_id = o.id
		WHERE p.id IN (%s)
	`, placeholders)

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return posts
	}
	defer rows.Close()

	// Создаём map питомцев по ID
	petsMap := make(map[int]models.Pet)

	for rows.Next() {
		var pet models.Pet
		var organizationName, organizationType *string

		err := rows.Scan(
			&pet.ID, &pet.UserID, &pet.Name, &pet.Species, &pet.Breed, &pet.Gender, &pet.BirthDate,
			&pet.Color, &pet.Size, &pet.Photo, &pet.Status, &pet.City, &pet.Region, &pet.Urgent, &pet.Story,
			&pet.OrganizationID, &organizationName, &organizationType,
			&pet.CreatedAt,
		)
		if err != nil {
			continue
		}

		if organizationName != nil {
			pet.OrganizationName = *organizationName
		}
		if organizationType != nil {
			pet.OrganizationType = *organizationType
		}

		petsMap[pet.ID] = pet
	}

	// Прикрепляем питомцев к постам
	for i := range posts {
		if petIDs, exists := postPetsMap[posts[i].ID]; exists {
			pets := make([]models.Pet, 0, len(petIDs))
			for _, petID := range petIDs {
				if pet, found := petsMap[petID]; found {
					pets = append(pets, pet)
				}
			}
			posts[i].Pets = pets
		}
	}

	return posts
}

// loadPostsOptimized - универсальная функция для загрузки постов с оптимизацией
// Параметры filters:
// - "author_id" (int) - фильтр по автору
// - "author_type" (string) - "user" или "organization"
// - "pet_id" (int) - фильтр по питомцу
// - "filter" (string) - "for-you", "following", "city"
// - "limit" (int) - количество постов
// - "offset" (int) - смещение для пагинации
func loadPostsOptimized(currentUserID int, filters map[string]interface{}) []models.Post {
	// Базовый запрос с JOIN для получения всех данных за один раз
	query := `
		SELECT p.id, p.author_id, p.author_type, p.content, p.attached_pets, 
		       p.attachments, p.tags, p.status, p.scheduled_at, p.created_at, p.updated_at,
		       p.location_lat, p.location_lon, p.location_name,
		       o.name as org_name, o.short_name as org_short_name, o.logo as org_logo,
		       u.name as user_name, u.last_name as user_last_name, u.avatar as user_avatar,
		       p.likes_count, p.comments_count,
		       CASE 
		           WHEN p.author_type = 'user' AND EXISTS (
		               SELECT 1 FROM friendships f 
		               WHERE ((f.user_id = ? AND f.friend_id = p.author_id) 
		                   OR (f.friend_id = ? AND f.user_id = p.author_id))
		                   AND f.status = 'accepted'
		           ) THEN 1
		           ELSE 0
		       END as is_friend,
		       EXISTS (SELECT 1 FROM polls WHERE post_id = p.id) as has_poll
		FROM posts p
		LEFT JOIN organizations o ON p.author_id = o.id AND p.author_type = 'organization'
		LEFT JOIN users u ON p.author_id = u.id AND p.author_type = 'user'
		WHERE p.is_deleted = FALSE AND p.status = 'published'
	`

	args := []interface{}{currentUserID, currentUserID}

	// Применяем фильтры
	if authorID, ok := filters["author_id"].(int); ok {
		query += " AND p.author_id = ?"
		args = append(args, authorID)
	}

	if authorType, ok := filters["author_type"].(string); ok {
		query += " AND p.author_type = ?"
		args = append(args, authorType)
	}

	if petID, ok := filters["pet_id"].(int); ok {
		query += " AND EXISTS (SELECT 1 FROM post_pets pp WHERE pp.post_id = p.id AND pp.pet_id = ?)"
		args = append(args, petID)
	}

	if filter, ok := filters["filter"].(string); ok {
		switch filter {
		case "following":
			if currentUserID > 0 {
				query += ` AND p.author_type = 'user' AND p.author_id != ? AND EXISTS (
					SELECT 1 FROM friendships f 
					WHERE ((f.user_id = ? AND f.friend_id = p.author_id) 
						OR (f.friend_id = ? AND f.user_id = p.author_id))
						AND f.status = 'accepted'
				)`
				args = append(args, currentUserID, currentUserID, currentUserID)
			}
		case "city":
			if currentUserID > 0 {
				var userCity string
				db.DB.QueryRow(ConvertPlaceholders("SELECT location FROM users WHERE id = ?"), currentUserID).Scan(&userCity)
				if userCity != "" {
					query += ` AND (
						(p.author_type = 'user' AND u.location = ?) OR
						(p.author_type = 'organization' AND o.address_city = ?)
					)`
					args = append(args, userCity, userCity)
				}
			}
		}
	}

	// Сортировка
	query += " ORDER BY is_friend DESC, p.created_at DESC"

	// Пагинация
	limit := 20
	if l, ok := filters["limit"].(int); ok && l > 0 && l <= 100 {
		limit = l
	}
	query += " LIMIT ?"
	args = append(args, limit)

	if offset, ok := filters["offset"].(int); ok && offset > 0 {
		query += " OFFSET ?"
		args = append(args, offset)
	}

	// Конвертируем плейсхолдеры
	query = ConvertPlaceholders(query)

	// Выполняем запрос
	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return []models.Post{}
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		var attachedPetsJSON, attachmentsJSON, tagsJSON string
		var orgName, orgShortName, orgLogo *string
		var userName, userLastName, userAvatar *string
		var isFriend int
		var hasPoll bool

		err := rows.Scan(
			&post.ID, &post.AuthorID, &post.AuthorType, &post.Content,
			&attachedPetsJSON, &attachmentsJSON, &tagsJSON,
			&post.Status, &post.ScheduledAt,
			&post.CreatedAt, &post.UpdatedAt,
			&post.LocationLat, &post.LocationLon, &post.LocationName,
			&orgName, &orgShortName, &orgLogo,
			&userName, &userLastName, &userAvatar,
			&post.LikesCount, &post.CommentsCount,
			&isFriend,
			&hasPoll,
		)
		if err != nil {
			continue
		}

		post.HasPoll = hasPoll

		// Десериализуем JSON массивы
		json.Unmarshal([]byte(attachedPetsJSON), &post.AttachedPets)
		json.Unmarshal([]byte(attachmentsJSON), &post.Attachments)
		json.Unmarshal([]byte(tagsJSON), &post.Tags)

		// Инициализируем пустые массивы если nil
		if post.AttachedPets == nil {
			post.AttachedPets = []int{}
		}
		if post.Attachments == nil {
			post.Attachments = []models.Attachment{}
		}
		if post.Tags == nil {
			post.Tags = []string{}
		}

		// Добавляем данные организации
		if post.AuthorType == "organization" && orgName != nil {
			org := models.Organization{
				ID:        post.AuthorID,
				Name:      *orgName,
				ShortName: orgShortName,
				Logo:      orgLogo,
			}
			post.Organization = &org
		}

		// Добавляем данные пользователя
		if post.AuthorType == "user" && userName != nil {
			user := models.User{
				ID:   post.AuthorID,
				Name: *userName,
			}
			if userLastName != nil {
				user.LastName = *userLastName
			}
			if userAvatar != nil {
				user.Avatar = *userAvatar
			}
			post.User = &user
		}

		posts = append(posts, post)
	}

	if len(posts) == 0 {
		return []models.Post{}
	}

	// Batch-загрузка питомцев
	posts = loadPetsForPostsBatch(posts)

	// Batch-загрузка опросов для постов с has_poll=true
	for i := range posts {
		if posts[i].HasPoll {
			poll, err := loadPollForPost(posts[i].ID, currentUserID)
			if err == nil {
				posts[i].Poll = poll
			}
		}
	}

	// Проверяем права на редактирование
	for i := range posts {
		posts[i].CanEdit = checkCanEditPost(currentUserID, &posts[i])
	}

	return posts
}
