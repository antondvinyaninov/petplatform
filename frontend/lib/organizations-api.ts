// API клиент для работы с организациями
import { apiClient } from './api';

export interface Organization {
  id: number;
  name: string;
  short_name?: string;
  legal_form?: string;
  type: string; // shelter, vet_clinic, pet_shop, foundation, kennel, other
  
  // Юридическая информация
  inn?: string;
  ogrn?: string;
  kpp?: string;
  registration_date?: string;
  
  // Контактная информация
  email?: string;
  phone?: string;
  website?: string;
  
  // Адрес
  address_full?: string;
  address_postal_code?: string;
  address_region?: string;
  address_city?: string;
  address_street?: string;
  address_house?: string;
  address_office?: string;
  
  // Координаты
  geo_lat?: number;
  geo_lon?: number;
  
  // Описание
  description?: string;
  bio?: string;
  
  // Медиа
  logo?: string;
  cover_photo?: string;
  
  // Руководство
  director_name?: string;
  director_position?: string;
  
  // Владелец
  owner_user_id: number;
  
  // Настройки приватности
  profile_visibility: string;
  show_phone: string;
  show_email: string;
  allow_messages: string;
  
  // Статус
  is_verified: boolean;
  is_active: boolean;
  status: string;
  
  // Метаданные
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  role: string; // owner, admin, moderator, member
  position?: string;
  can_post: boolean;
  can_edit: boolean;
  can_manage_members: boolean;
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface CreateOrganizationData {
  name: string;
  short_name?: string;
  legal_form?: string;
  type: string;
  inn?: string;
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
  is_representative?: boolean;
}

export interface UpdateOrganizationData {
  name?: string;
  short_name?: string;
  legal_form?: string;
  type?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_full?: string;
  address_city?: string;
  geo_lat?: number;
  geo_lon?: number;
  description?: string;
  bio?: string;
  director_name?: string;
  director_position?: string;
  profile_visibility?: string;
  show_phone?: string;
  show_email?: string;
  allow_messages?: string;
}

export const organizationsApi = {
  // Создать организацию
  async create(data: CreateOrganizationData) {
    return apiClient.post<{ id: number }>('/api/organizations', data);
  },

  // Получить организацию по ID
  async getById(id: number) {
    return apiClient.get<Organization>(`/api/organizations/${id}`);
  },

  // Обновить организацию
  async update(id: number, data: UpdateOrganizationData) {
    return apiClient.put<{ message: string }>(`/api/organizations/${id}`, data);
  },

  // Удалить организацию
  async delete(id: number) {
    return apiClient.delete<{ message: string }>(`/api/organizations/${id}`);
  },

  // Получить организации пользователя
  async getUserOrganizations(userId: number) {
    return apiClient.get<Organization[]>(`/api/organizations/user/${userId}`);
  },

  // Получить участников организации
  async getMembers(orgId: number) {
    return apiClient.get<OrganizationMember[]>(`/api/organizations/members/${orgId}`);
  },

  // Загрузить логотип
  async uploadLogo(orgId: number, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    
    // Для FormData используем прямой fetch с правильным URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/organizations/${orgId}/logo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return response.json();
  },

  // Загрузить обложку
  async uploadCover(orgId: number, file: File) {
    const formData = new FormData();
    formData.append('cover', file);
    
    // Для FormData используем прямой fetch с правильным URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/organizations/${orgId}/cover`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return response.json();
  },

  // Подать заявку на вступление
  async requestJoin(orgId: number) {
    return apiClient.post<{ message: string }>(`/api/organizations/${orgId}/join-request`, {});
  },

  // Добавить участника
  async addMember(orgId: number, userId: number, role: string, position?: string) {
    return apiClient.post<{ message: string }>(`/api/organizations/${orgId}/members`, {
      user_id: userId,
      role,
      position,
    });
  },

  // Обновить участника
  async updateMember(memberId: number, role: string, position?: string) {
    return apiClient.put<{ message: string }>(`/api/organizations/members/${memberId}`, {
      role,
      position,
    });
  },

  // Удалить участника
  async removeMember(memberId: number) {
    return apiClient.delete<{ message: string }>(`/api/organizations/members/${memberId}`);
  },

  // Заявить о владении организацией (если у нее нет владельца)
  async claimOwnership(orgId: number) {
    return apiClient.post<{ message: string }>(`/api/organizations/claim-ownership/${orgId}`, {});
  },

  // Проверить существование организации по ИНН
  async checkByInn(inn: string) {
    return apiClient.get<{ id: number; name: string } | null>(`/api/organizations/check-inn/${inn}`);
  },
};

// Типы организаций
export const ORGANIZATION_TYPES = {
  shelter: 'Приют для животных',
  vet_clinic: 'Ветеринарная клиника',
  pet_shop: 'Зоомагазин',
  foundation: 'Фонд помощи животным',
  kennel: 'Кинологический центр',
  other: 'Другое',
};

// Получить название типа организации
export function getOrganizationTypeName(type: string): string {
  return ORGANIZATION_TYPES[type as keyof typeof ORGANIZATION_TYPES] || 'Другое';
}
