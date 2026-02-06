package main

import (
	"database/sql"
	"log"
	"net/http"
)

// GetAllPostsWithPollsHandler возвращает список всех постов с опросами для админки
func GetAllPostsWithPollsHandler(w http.ResponseWriter, r *http.Request) {
	// Сначала проверим, есть ли вообще посты
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM posts WHERE is_deleted = false").Scan(&count)
	if err != nil {
		log.Printf("❌ Failed to count posts: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	log.Printf("📊 Total posts in database: %d", count)

	// Полный запрос со всеми полями включая опросы
	query := `
		SELECT 
			p.id,
			p.author_id as user_id,
			p.content,
			p.created_at,
			p.updated_at,
			p.likes_count,
			p.comments_count,
			p.media_urls,
			p.attachments,
			p.tags,
			p.attached_pets,
			p.location_lat,
			p.location_lon,
			p.location_name,
			p.status,
			COALESCE(u.name || ' ' || u.last_name, u.name) as user_name,
			-- Добавляем данные опроса
			polls.id as poll_id,
			polls.question as poll_question,
			polls.multiple_choice as poll_multiple_choice,
			polls.expires_at as poll_expires_at,
			-- Опции опроса в JSON
			COALESCE(
				json_agg(
					json_build_object(
						'id', poll_options.id,
						'text', poll_options.option_text,
						'votes_count', poll_options.votes_count
					) ORDER BY poll_options.id
				) FILTER (WHERE poll_options.id IS NOT NULL),
				'[]'
			) as poll_options
		FROM posts p
		LEFT JOIN users u ON u.id = p.author_id
		LEFT JOIN polls ON polls.post_id = p.id
		LEFT JOIN poll_options ON poll_options.poll_id = polls.id
		WHERE p.is_deleted = false
		GROUP BY p.id, u.id, u.name, u.last_name, polls.id, polls.question, polls.multiple_choice, polls.expires_at
		ORDER BY p.created_at DESC
		LIMIT 100
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ Failed to get posts with polls: %v", err)
		respondError(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	posts := []map[string]interface{}{}
	for rows.Next() {
		var id int
		var userID sql.NullInt64
		var content string
		var createdAt, updatedAt sql.NullTime
		var likesCount, commentsCount int
		var mediaURLs, attachments, tags, attachedPets, locationName, status, userName sql.NullString
		var locationLat, locationLon sql.NullFloat64
		// Поля опроса
		var pollID sql.NullInt64
		var pollQuestion sql.NullString
		var pollMultipleChoice sql.NullBool
		var pollExpiresAt sql.NullTime
		var pollOptionsJSON string

		err := rows.Scan(&id, &userID, &content, &createdAt, &updatedAt,
			&likesCount, &commentsCount, &mediaURLs, &attachments, &tags,
			&attachedPets, &locationLat, &locationLon, &locationName, &status, &userName,
			&pollID, &pollQuestion, &pollMultipleChoice, &pollExpiresAt, &pollOptionsJSON)
		if err != nil {
			log.Printf("❌ Failed to scan post: %v", err)
			continue
		}

		post := map[string]interface{}{
			"id":             id,
			"content":        content,
			"likes_count":    likesCount,
			"comments_count": commentsCount,
		}

		// Даты
		if createdAt.Valid {
			post["created_at"] = createdAt.Time
		} else {
			post["created_at"] = nil
		}
		if updatedAt.Valid {
			post["updated_at"] = updatedAt.Time
		} else {
			post["updated_at"] = nil
		}

		// Nullable поля
		if userID.Valid {
			post["user_id"] = userID.Int64
		} else {
			post["user_id"] = nil
		}

		if userName.Valid {
			post["user_name"] = userName.String
		} else {
			post["user_name"] = nil
		}

		if mediaURLs.Valid {
			post["media_urls"] = mediaURLs.String
		} else {
			post["media_urls"] = nil
		}

		if attachments.Valid {
			post["attachments"] = attachments.String
		} else {
			post["attachments"] = nil
		}

		if tags.Valid {
			post["tags"] = tags.String
		} else {
			post["tags"] = nil
		}

		if attachedPets.Valid {
			post["attached_pets"] = attachedPets.String
		} else {
			post["attached_pets"] = nil
		}

		if locationLat.Valid {
			post["location_lat"] = locationLat.Float64
		} else {
			post["location_lat"] = nil
		}

		if locationLon.Valid {
			post["location_lon"] = locationLon.Float64
		} else {
			post["location_lon"] = nil
		}

		if locationName.Valid {
			post["location_name"] = locationName.String
		} else {
			post["location_name"] = nil
		}

		if status.Valid {
			post["status"] = status.String
		} else {
			post["status"] = nil
		}

		// Добавляем данные опроса если есть
		if pollID.Valid {
			poll := map[string]interface{}{
				"id":              pollID.Int64,
				"question":        nil,
				"multiple_choice": false,
				"expires_at":      nil,
				"options":         pollOptionsJSON, // JSON строка с опциями
			}

			if pollQuestion.Valid {
				poll["question"] = pollQuestion.String
			}
			if pollMultipleChoice.Valid {
				poll["multiple_choice"] = pollMultipleChoice.Bool
			}
			if pollExpiresAt.Valid {
				poll["expires_at"] = pollExpiresAt.Time
			}

			post["poll"] = poll
		} else {
			post["poll"] = nil
		}

		posts = append(posts, post)
	}

	log.Printf("✅ Returning %d posts with polls", len(posts))
	respondJSON(w, posts)
}
