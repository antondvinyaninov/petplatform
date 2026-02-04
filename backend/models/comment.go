package models

type Comment struct {
	ID            int        `json:"id"`
	PostID        int        `json:"post_id"`
	UserID        int        `json:"user_id"`
	Content       string     `json:"content"`
	CreatedAt     string     `json:"created_at"`
	ParentID      *int       `json:"parent_id,omitempty"`
	ReplyToUserID *int       `json:"reply_to_user_id,omitempty"`
	User          *User      `json:"user,omitempty"`
	ReplyToUser   *User      `json:"reply_to_user,omitempty"`
	Replies       []*Comment `json:"replies,omitempty"`
}

type CreateCommentRequest struct {
	Content       string `json:"content"`
	ParentID      *int   `json:"parent_id,omitempty"`
	ReplyToUserID *int   `json:"reply_to_user_id,omitempty"`
}
