// В production используем Gateway URL
// В development используем прямые URL к backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('easypanel.host')
    ? 'https://my-projects-gateway-zp.crv1ic.easypanel.host'
    : 'http://localhost:8000');

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:7100';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Получаем токен из localStorage (если есть)
    // Gateway принимает токен как из cookie, так и из Authorization заголовка
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && token !== 'authenticated') {
        // Добавляем Authorization только если есть реальный токен
        // Если token === 'authenticated', значит используется cookie
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', { status: response.status, error: result.error });
        return {
          success: false,
          error: result.error || `API Error: ${response.statusText}`,
        };
      }

      // Бэкенд возвращает {success: true, data: ...}, извлекаем data
      return {
        success: true,
        data: result.data !== undefined ? result.data : result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {      
      const headers = await this.getHeaders();
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include', // Include cookies
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`❌ Fetch error for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies
        body: JSON.stringify(body),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error(`❌ Fetch error for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        credentials: 'include', // Include cookies
        body: JSON.stringify(body),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const options: RequestInit = {
        method: 'DELETE',
        headers,
        credentials: 'include', // Include cookies
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const apiClient = new ApiClient(API_URL);
export const authClient = new ApiClient(AUTH_URL);

// API методы для авторизации (используют Main Backend который проксирует к Auth Service)
export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiClient.post<{ user: User }>('/api/auth/register', { name, email, password }),
  
  login: (email: string, password: string) =>
    apiClient.post<{ user: User }>('/api/auth/login', { email, password }),
  
  logout: () =>
    apiClient.post<{ message: string }>('/api/auth/logout', {}),
  
  me: () =>
    apiClient.get<User>('/api/auth/me'),
};

export const usersApi = {
  getAll: () => apiClient.get<User[]>('/api/users'),
  
  getById: (id: number) => apiClient.get<User>(`/api/users/${id}`),
  
  create: (user: Partial<User>) => apiClient.post<User>('/api/users', user),
  
  update: (id: number, user: Partial<User>) => apiClient.put<User>(`/api/users/${id}`, user),
  
  delete: (id: number) => apiClient.delete<{ message: string }>(`/api/users/${id}`),
  
  // Обновление своего профиля
  updateProfile: (data: { 
    name?: string; 
    last_name?: string;
    bio?: string; 
    phone?: string; 
    location?: string;
    profile_visibility?: string;
    show_phone?: string;
    show_email?: string;
    allow_messages?: string;
    show_online?: string;
  }) =>
    apiClient.put<User>('/api/profile', data),
  
  // Загрузка аватара
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatar_url: string; message: string }>> => {
    try {
      // Импортируем функцию сжатия
      const { compressAvatarImage } = await import('./image-compression');
      
      // Сжимаем изображение
      const compressedFile = await compressAvatarImage(file);
      
      const formData = new FormData();
      formData.append('avatar', compressedFile);
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Ошибка загрузки аватара',
        };
      }
      
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  
  // Загрузка обложки
  uploadCover: async (file: File): Promise<ApiResponse<{ cover_url: string; message: string }>> => {
    try {
      // Импортируем функцию сжатия
      const { compressCoverImage } = await import('./image-compression');
      
      // Сжимаем изображение
      const compressedFile = await compressCoverImage(file);
      
      const formData = new FormData();
      formData.append('cover', compressedFile);
      
      // Получаем токен из localStorage
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/api/profile/cover`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Ошибка загрузки обложки',
        };
      }
      
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  
  // Удаление аватара
  deleteAvatar: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      // Получаем токен из localStorage
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/api/profile/avatar/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Ошибка удаления аватара',
        };
      }
      
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  
  // Удаление обложки
  deleteCover: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      // Получаем токен из localStorage
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/api/profile/cover/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Ошибка удаления обложки',
        };
      }
      
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// API методы для профиля
export const profileApi = {
  update: (data: {
    bio?: string;
    phone?: string;
    location?: string;
    avatar?: string;
    cover_photo?: string;
  }) => apiClient.put<User>('/api/profile', data),
};

// API методы для постов
export const postsApi = {
  getAll: () => apiClient.get<Post[]>('/api/posts'),
  
  getUserPosts: (userId: number, params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    const queryString = queryParams.toString();
    return apiClient.get<Post[]>(`/api/posts/user/${userId}${queryString ? `?${queryString}` : ''}`);
  },
  
  getPetPosts: (petId: number) => apiClient.get<Post[]>(`/api/posts/pet/${petId}`),
  
  getOrganizationPosts: (orgId: number) => apiClient.get<Post[]>(`/api/posts/organization/${orgId}`),
  
  create: (data: { content: string; post_type?: string }) =>
    apiClient.post<Post>('/api/posts', data),
  
  update: (id: number, data: { content?: string; post_type?: string }) =>
    apiClient.put<Post>(`/api/posts/${id}`, data),
  
  delete: (id: number) => apiClient.delete<{ message: string }>(`/api/posts/${id}`),
  
  // Лайки
  toggleLike: (postId: number) => 
    apiClient.post<{ liked: boolean; likes_count: number }>(`/api/posts/${postId}/like`, {}),
  
  getLikeStatus: (postId: number) => 
    apiClient.get<{ liked: boolean; likes_count: number }>(`/api/posts/${postId}/like`),
  
  getLikers: (postId: number) =>
    apiClient.get<Array<{ id: number; name: string; last_name?: string; avatar?: string }>>(`/api/posts/${postId}/likers`),
};

// API методы для комментариев
export const commentsApi = {
  getPostComments: (postId: number) => apiClient.get<Comment[]>(`/api/comments/post/${postId}`),
  
  create: (postId: number, data: { content: string; parent_id?: number; reply_to_user_id?: number }) =>
    apiClient.post<Comment>(`/api/comments/post/${postId}`, data),
  
  delete: (commentId: number) => apiClient.delete<{ message: string }>(`/api/comments/${commentId}`),
};

// API методы для питомцев
export const petsApi = {
  getUserPets: (userId: number) => apiClient.get<Pet[]>(`/api/pets/user/${userId}`),
  getCuratedPets: (userId: number) => apiClient.get<Pet[]>(`/api/pets/curated/${userId}`),
  
  create: (data: { name: string; species?: string; photo?: string }) =>
    apiClient.post<Pet>('/api/pets', data),
  
  delete: (id: number) => apiClient.delete<{ message: string }>(`/api/pets/${id}`),
};

// API методы для друзей
export const friendsApi = {
  // Получить список друзей
  getFriends: () => apiClient.get<Friendship[]>('/api/friends'),
  
  // Получить входящие запросы в друзья
  getRequests: () => apiClient.get<Friendship[]>('/api/friends/requests'),
  
  // Отправить запрос в друзья
  sendRequest: (friendId: number) => 
    apiClient.post<{ message: string }>('/api/friends/send', { friend_id: friendId }),
  
  // Принять запрос в друзья
  acceptRequest: (friendshipId: number) =>
    apiClient.post<{ message: string }>('/api/friends/accept', { friendship_id: friendshipId }),
  
  // Отклонить запрос в друзья
  rejectRequest: (friendshipId: number) =>
    apiClient.post<{ message: string }>('/api/friends/reject', { friendship_id: friendshipId }),
  
  // Удалить из друзей
  removeFriend: (friendshipId: number) =>
    apiClient.delete<{ message: string }>('/api/friends/remove', { friendship_id: friendshipId }),
  
  // Получить статус дружбы с пользователем
  getStatus: (friendId: number) =>
    apiClient.get<FriendshipStatus>(`/api/friends/status?friend_id=${friendId}`),
};

// API методы для уведомлений
export const notificationsApi = {
  // Получить список уведомлений
  getAll: () => apiClient.get<Notification[]>('/api/notifications'),
  
  // Получить количество непрочитанных
  getUnreadCount: () => apiClient.get<{ count: number }>('/api/notifications/unread'),
  
  // Отметить уведомление как прочитанное
  markAsRead: (notificationId: number) =>
    apiClient.put<{ message: string }>(`/api/notifications/${notificationId}`, {}),
  
  // Отметить все как прочитанные
  markAllAsRead: () =>
    apiClient.post<{ message: string }>('/api/notifications/read-all', {}),
};

// API методы для организаций
export const organizationsApi = {
  // Получить все организации
  getAll: () => apiClient.get<Organization[]>('/api/organizations/all'),
  
  // Получить организацию по ID
  getById: (id: number) => apiClient.get<Organization>(`/api/organizations/${id}`),
  
  // Создать организацию
  create: (data: CreateOrganizationRequest) =>
    apiClient.post<{ id: number }>('/api/organizations', data),
  
  // Обновить организацию
  update: (id: number, data: Partial<CreateOrganizationRequest>) =>
    apiClient.put<{ message: string }>(`/api/organizations/${id}`, data),
  
  // Удалить организацию
  delete: (id: number) => apiClient.delete<{ message: string }>(`/api/organizations/${id}`),
  
  // Получить организации пользователя
  getUserOrganizations: (userId: number) =>
    apiClient.get<Organization[]>(`/api/organizations/user/${userId}`),
  
  // Получить участников организации
  getMembers: (organizationId: number) =>
    apiClient.get<any[]>(`/api/organizations/members/${organizationId}`),
  
  // Добавить участника
  addMember: (organizationId: number, userId: number, role: string, position?: string) =>
    apiClient.post<{ message: string }>('/api/organizations/members/add', {
      organization_id: organizationId,
      user_id: userId,
      role,
      position: position || '',
    }),
  
  // Обновить участника
  updateMember: (memberId: number, role: string, position?: string) =>
    apiClient.put<{ message: string }>('/api/organizations/members/update', {
      member_id: memberId,
      role,
      position: position || '',
    }),
  
  // Удалить участника
  removeMember: (memberId: number) =>
    apiClient.delete<{ message: string }>('/api/organizations/members/remove', {
      member_id: memberId,
    }),
};

// Типы
export interface User {
  id: number;
  name: string;
  last_name?: string;
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatar?: string;
  cover_photo?: string;
  profile_visibility?: string;
  show_phone?: string;
  show_email?: string;
  allow_messages?: string;
  show_online?: string;
  verified?: boolean;
  verified_at?: string;
  created_at?: string;
  last_seen?: string; // Время последней активности
  is_online?: boolean; // Онлайн статус (активен в последние 5 минут)
}

export interface Post {
  id: number;
  author_id: number;
  author_type: string;
  content: string;
  post_type?: string;
  attached_pets: number[];
  attachments: Attachment[];
  tags: string[];
  status: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  user?: User;
  organization?: Organization;
  pets?: Pet[];
  poll?: Poll;
  has_poll?: boolean; // Есть ли опрос у поста
  comments_count: number;
  // Лайки
  liked?: boolean;
  likes_count?: number;
  // Геолокация
  location_lat?: number;
  location_lon?: number;
  location_name?: string;
}

export interface Attachment {
  url: string;
  type: string;
  file_name?: string;
  size?: number;
}

export interface Poll {
  id: number;
  post_id: number;
  question: string;
  options: PollOption[];
  multiple_choice: boolean;
  allow_vote_changes: boolean;
  anonymous_voting: boolean;
  end_date?: string;
  expires_at?: string;
  created_at: string;
  total_votes: number;
  total_voters: number;
  user_voted: boolean;
  user_votes?: number[];
  is_expired: boolean;
  voters?: PollVoter[];
}

export interface PollOption {
  id: number;
  poll_id: number;
  option_text: string;
  votes_count: number;
  percentage: number;
  user_voted: boolean;
}

export interface PollVoter {
  user_id: number;
  user_name: string;
  user_avatar?: string;
  voted_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  parent_id?: number;
  reply_to_user_id?: number;
  user?: User;
  reply_to_user?: User;
  replies?: Comment[];
}

export interface Pet {
  id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  color?: string;
  photo?: string;
  status?: string;
  is_sterilized?: boolean;
  is_vaccinated?: boolean;
  chip_number?: string;
  region?: string;
  city?: string;
  urgent?: boolean;
  contact_name?: string;
  contact_phone?: string;
  organization_id?: number;
  created_at: string;
}

// Типы для друзей
export interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  friend: User;
}

export interface FriendshipStatus {
  id?: number;
  status?: 'pending' | 'accepted' | 'rejected' | 'blocked' | 'none';
  is_outgoing?: boolean;
}

// Типы для уведомлений
export interface Notification {
  id: number;
  user_id: number;
  type: 'comment' | 'like' | 'friend_request' | 'friend_accepted';
  actor_id: number;
  entity_type?: string;
  entity_id?: number;
  message: string;
  is_read: boolean;
  created_at: string;
  actor?: User;
}

// Типы для организаций
export interface Organization {
  id: number;
  name: string;
  short_name?: string;
  legal_form?: string;
  type: string;
  inn: string;
  ogrn?: string;
  kpp?: string;
  registration_date?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_full?: string;
  address_postal_code?: string;
  address_region?: string;
  address_city?: string;
  address_street?: string;
  address_house?: string;
  address_office?: string;
  geo_lat?: number;
  geo_lon?: number;
  description?: string;
  bio?: string;
  logo?: string;
  cover_photo?: string;
  director_name?: string;
  director_position?: string;
  owner_user_id: number;
  profile_visibility?: string;
  show_phone?: string;
  show_email?: string;
  allow_messages?: string;
  is_verified: boolean;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationRequest {
  name: string;
  short_name?: string;
  legal_form?: string;
  type: string;
  inn: string;
  ogrn?: string;
  kpp?: string;
  registration_date?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_full?: string;
  address_postal_code?: string;
  address_region?: string;
  address_city?: string;
  address_street?: string;
  address_house?: string;
  address_office?: string;
  geo_lat?: number | null;
  geo_lon?: number | null;
  description?: string;
  bio?: string;
  director_name?: string;
  director_position?: string;
}
