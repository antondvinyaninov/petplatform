package models

type Friendship struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	FriendID  int    `json:"friend_id"`
	Status    string `json:"status"` // pending, accepted, rejected, blocked
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type FriendshipResponse struct {
	ID        int          `json:"id"`
	UserID    int          `json:"user_id"`
	FriendID  int          `json:"friend_id"`
	Status    string       `json:"status"`
	Friend    UserResponse `json:"friend"`
	CreatedAt string       `json:"created_at"`
	UpdatedAt string       `json:"updated_at"`
}

type FriendRequest struct {
	FriendID int `json:"friend_id"`
}

type FriendActionRequest struct {
	FriendshipID int `json:"friendship_id"`
}
