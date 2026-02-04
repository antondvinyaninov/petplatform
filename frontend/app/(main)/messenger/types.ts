export interface User {
  id: number;
  name: string;
  last_name: string;
  avatar?: string;
  is_online?: boolean;
  last_seen?: string;
}

export interface MessageAttachment {
  id: number;
  message_id: number;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  file_name?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read?: boolean;
  attachments?: MessageAttachment[];
}

export interface Chat {
  id: number;
  other_user?: User;
  last_message?: Message;
  last_message_at?: string;
  unread_count: number;
}
