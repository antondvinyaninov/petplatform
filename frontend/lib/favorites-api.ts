// API для работы с избранными питомцами
import { apiClient } from './api';

export interface Favorite {
  id: number;
  user_id: number;
  pet_id: number;
  created_at: string;
}

// Получить список избранных питомцев
export async function getFavorites(): Promise<Favorite[]> {
  const response = await apiClient.get<Favorite[]>('/api/favorites');
  return response.data || [];
}

// Добавить питомца в избранное
export async function addFavorite(petId: number): Promise<Favorite> {
  const response = await apiClient.post<Favorite>('/api/favorites', { pet_id: petId });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to add favorite');
  }
  return response.data;
}

// Удалить питомца из избранного
export async function removeFavorite(petId: number): Promise<void> {
  const response = await apiClient.delete(`/api/favorites/${petId}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to remove favorite');
  }
}
