package models

// Poll представляет опрос
type Poll struct {
	ID               int    `json:"id"`
	PostID           int    `json:"post_id"`
	Question         string `json:"question"`
	MultipleChoice   bool   `json:"multiple_choice"`
	AllowVoteChanges bool   `json:"allow_vote_changes"`
	// AnonymousVoting удалено из схемы БД, но оставлено для совместимости с Frontend
	AnonymousVoting bool         `json:"anonymous_voting,omitempty"`
	ExpiresAt       *string      `json:"expires_at,omitempty"`
	CreatedAt       string       `json:"created_at"`
	Options         []PollOption `json:"options"`
	TotalVoters     int          `json:"total_voters"`
	UserVoted       bool         `json:"user_voted,omitempty"`
	UserVotes       []int        `json:"user_votes,omitempty"` // IDs опций, за которые проголосовал пользователь
	IsExpired       bool         `json:"is_expired"`
	Voters          []PollVoter  `json:"voters,omitempty"` // Список проголосовавших
}

// PollOption представляет вариант ответа в опросе
type PollOption struct {
	ID          int         `json:"id"`
	PollID      int         `json:"poll_id"`
	OptionText  string      `json:"option_text"`
	VotesCount  int         `json:"votes_count"`
	OptionOrder int         `json:"option_order"`
	Percentage  float64     `json:"percentage,omitempty"` // Процент голосов (вычисляется)
	Voters      []PollVoter `json:"voters,omitempty"`     // Список проголосовавших за этот вариант
}

// PollVoter представляет пользователя, проголосовавшего в опросе
type PollVoter struct {
	UserID   int    `json:"user_id"`
	UserName string `json:"user_name"`
	Avatar   string `json:"avatar,omitempty"`
}

// CreatePollRequest - запрос на создание опроса
type CreatePollRequest struct {
	Question         string   `json:"question"`
	Options          []string `json:"options"`
	MultipleChoice   bool     `json:"multiple_choice"`
	AllowVoteChanges bool     `json:"allow_vote_changes"`
	// AnonymousVoting удалено из схемы БД, но оставлено для совместимости с Frontend
	AnonymousVoting bool    `json:"anonymous_voting,omitempty"`
	ExpiresAt       *string `json:"expires_at,omitempty"`
}

// VoteRequest - запрос на голосование
type VoteRequest struct {
	OptionIDs []int `json:"option_ids"` // Массив ID опций (для множественного выбора)
}
