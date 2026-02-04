export type AnnouncementType = 'looking_for_home' | 'found' | 'lost' | 'fundraising';
export type AnnouncementStatus = 'active' | 'closed' | 'archived';
export type PostType = 'update' | 'photo' | 'observation' | 'search' | 'reward' | 'donation';

export interface PetDetail {
  id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  color?: string;
  photo?: string;
  photos?: string; // JSON массив
  status?: string;
  region?: string;
  city?: string;
  urgent?: boolean;
  contact_name?: string;
  contact_phone?: string;
  organization_id?: number;
  created_at: string;
}

export interface AnnouncementPost {
  id: number;
  announcement_id: number;
  author_id: number;
  post_type: PostType;
  content: string;
  media_urls?: string; // JSON массив
  donation_amount?: number;
  created_at: string;
  author?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
}

export interface AnnouncementDonation {
  id: number;
  announcement_id: number;
  donor_id?: number;
  donor_name: string;
  amount: number;
  message?: string;
  is_anonymous: boolean;
  created_at: string;
  donor?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
}

export interface PetAnnouncement {
  id: number;
  pet_id: number;
  type: AnnouncementType;
  title: string;
  description: string;
  author_id: number;
  
  // Контактное лицо
  contact_person_id?: number;
  contact_person_name?: string;
  contact_person_phone?: string;
  
  // Локация
  location_city?: string;
  location_address?: string;
  location_coordinates?: string;
  
  // Дата события
  event_date?: string;
  event_time?: string;
  
  // Детали для "Потерян"
  lost_last_seen_location?: string;
  lost_distinctive_features?: string;
  lost_reward_amount?: number;
  
  // Детали для "Найден"
  found_current_location?: string;
  found_condition?: string;
  
  // Детали для "Сбор средств"
  fundraising_goal_amount?: number;
  fundraising_current_amount: number;
  fundraising_purpose?: string;
  fundraising_deadline?: string;
  fundraising_bank_details?: string;
  
  // Статус
  status: AnnouncementStatus;
  status_reason?: string;
  is_published: boolean;
  views_count: number;
  
  // Метаданные
  created_at: string;
  updated_at: string;
  closed_at?: string;
  
  // Связанные данные
  author?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  contact_person?: {
    id: number;
    name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  pet?: PetDetail;
  posts?: AnnouncementPost[];
  donations?: AnnouncementDonation[];
}

export interface CreateAnnouncementRequest {
  pet_id: number;
  type: AnnouncementType;
  title: string;
  description: string;
  
  // Контактное лицо
  contact_person_id?: number;
  contact_person_name?: string;
  contact_person_phone?: string;
  
  // Локация
  location_city?: string;
  location_address?: string;
  location_coordinates?: string;
  
  // Дата события
  event_date?: string;
  event_time?: string;
  
  // Детали для "Потерян"
  lost_last_seen_location?: string;
  lost_distinctive_features?: string;
  lost_reward_amount?: number;
  
  // Детали для "Найден"
  found_current_location?: string;
  found_condition?: string;
  
  // Детали для "Сбор средств"
  fundraising_goal_amount?: number;
  fundraising_purpose?: string;
  fundraising_deadline?: string;
  fundraising_bank_details?: string;
}

export interface CreateAnnouncementPostRequest {
  post_type: PostType;
  content: string;
  media_urls?: string[];
  donation_amount?: number;
}

export interface CreateDonationRequest {
  amount: number;
  message?: string;
  is_anonymous: boolean;
  donor_name?: string;
}
