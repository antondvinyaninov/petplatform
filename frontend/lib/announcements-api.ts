import type {
  PetAnnouncement,
  CreateAnnouncementRequest,
  CreateAnnouncementPostRequest,
  CreateDonationRequest,
  AnnouncementType,
} from '../types/announcement';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    ? '' // Пустая строка = относительные пути (/api/...)
    : 'http://localhost:8000');

// Получить список объявлений
export async function getAnnouncements(filters?: {
  type?: AnnouncementType;
  city?: string;
  author_id?: number;
}): Promise<PetAnnouncement[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.city) params.append('city', filters.city);
  if (filters?.author_id) params.append('author_id', filters.author_id.toString());

  const url = `${API_URL}/api/announcements${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch announcements');
  }

  const result = await response.json();
  return result.data || [];
}

// Получить конкретное объявление
export async function getAnnouncement(id: number): Promise<PetAnnouncement> {
  const response = await fetch(`${API_URL}/api/announcements/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch announcement');
  }

  const result = await response.json();
  return result.data;
}

// Создать объявление
export async function createAnnouncement(data: CreateAnnouncementRequest): Promise<{ id: number }> {
  const response = await fetch(`${API_URL}/api/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create announcement');
  }

  const result = await response.json();
  return result.data;
}

// Обновить объявление
export async function updateAnnouncement(id: number, data: Partial<CreateAnnouncementRequest>): Promise<void> {
  const response = await fetch(`${API_URL}/api/announcements/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update announcement');
  }
}

// Удалить объявление
export async function deleteAnnouncement(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/announcements/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete announcement');
  }
}

// Создать публикацию к объявлению
export async function createAnnouncementPost(
  announcementId: number,
  data: CreateAnnouncementPostRequest
): Promise<{ id: number }> {
  const response = await fetch(`${API_URL}/api/announcements/${announcementId}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create post');
  }

  const result = await response.json();
  return result.data;
}

// Создать пожертвование
export async function createDonation(
  announcementId: number,
  data: CreateDonationRequest
): Promise<{ id: number }> {
  const response = await fetch(`${API_URL}/api/announcements/${announcementId}/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create donation');
  }

  const result = await response.json();
  return result.data;
}
