package handlers

import (
	"backend/models"
	"backend/db"
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
