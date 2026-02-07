const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:80';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || `API Error: ${response.statusText}` };
      }
      return { success: true, data: result.data !== undefined ? result.data : result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const apiClient = new ApiClient(API_URL);

export const adminApi = {
  me: () => apiClient.get<AdminUser>('/api/admin/auth/me'),
  getUsers: () => apiClient.get<User[]>('/api/admin/users'),
  updateUser: (id: number, data: Partial<User>) => apiClient.put(`/api/admin/users/${id}`, data),
  deleteUser: (id: number) => apiClient.delete(`/api/admin/users/${id}`),
  getPosts: (status?: string) => apiClient.get<Post[]>(`/api/admin/posts${status ? `?status=${status}` : ''}`),
  updatePost: (id: number, data: { status: string }) => apiClient.put(`/api/admin/posts/${id}`, data),
  deletePost: (id: number) => apiClient.delete(`/api/admin/posts/${id}`),
  getStats: () => apiClient.get<Stats>('/api/admin/stats/overview'),
  getLogs: () => apiClient.get<Log[]>('/api/admin/logs'),
};

export interface AdminUser {
  id: number;
  email: string;
  role: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  status: string;
  created_at: string;
}

export interface Stats {
  total_users: number;
  total_posts: number;
  pending_posts: number;
  active_users_today: number;
}

export interface Log {
  id: number;
  action: string;
  target_type?: string;
  target_id?: number;
  details: string;
  ip_address?: string;
  created_at: string;
  admin_name: string;
}
