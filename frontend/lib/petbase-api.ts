// API клиент для ЗооБазы (PetID)
// Единый источник правды для всех данных о питомцах

const PETBASE_API_URL = process.env.NEXT_PUBLIC_PETBASE_API_URL || 'http://localhost:8100/api';

export interface Pet {
  id: number;
  user_id: number;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  color?: string;
  size?: string;
  weight?: number;
  chip_number?: string;
  tattoo_number?: string;
  ear_tag_number?: string;
  passport_number?: string;
  is_sterilized: boolean;
  sterilization_date?: string;
  is_vaccinated: boolean;
  health_notes?: string;
  character_traits?: string;
  special_needs?: string;
  status: string;
  status_updated_at?: string;
  photo?: string;
  photos?: string;
  story?: string;
  created_at: string;
  updated_at: string;
  // Поля паспорта
  distinctive_marks?: string;
  owner_name?: string;
  owner_address?: string;
  owner_phone?: string;
  owner_email?: string;
  blood_type?: string;
  allergies?: string;
  chronic_diseases?: string;
  current_medications?: string;
  pedigree_number?: string;
  registration_org?: string;
  // Куратор и локация
  curator_id?: number;
  curator_name?: string;
  curator_phone?: string;
  location?: string;
  foster_address?: string;
  shelter_name?: string;
  // Поля для каталога
  city?: string;
  region?: string;
  urgent?: boolean;
  contact_name?: string;
  contact_phone?: string;
  organization_id?: number;
}

export interface Species {
  id: number;
  name: string;
  name_en: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface Breed {
  id: number;
  species_id: number;
  species_name: string;
  name: string;
  name_en: string;
  description?: string;
  origin?: string;
  size?: string;
  weight_min?: number;
  weight_max?: number;
  lifespan_min?: number;
  lifespan_max?: number;
  temperament?: string;
  care_level?: string;
  photo?: string;
  created_at: string;
}

class PetBaseAPI {
  private baseURL: string;
  private getAuthToken: () => string | null;

  constructor(
    baseURL: string = PETBASE_API_URL,
    getAuthToken: () => string | null = () => {
      // В разработке используем X-User-ID заголовок
      // В продакшене это будет JWT токен из localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
      }
      return null;
    }
  ) {
    this.baseURL = baseURL;
    this.getAuthToken = getAuthToken;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      // JWT токен
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Временно для разработки: используем X-User-ID
      // TODO: Удалить после внедрения полноценной аутентификации
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
      if (userId) {
        headers['X-User-ID'] = userId;
      }
    }

    return headers;
  }

  // Питомцы
  async getPets(): Promise<Pet[]> {
    try {
      const response = await fetch(`${this.baseURL}/pets`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching pets:', error);
      return [];
    }
  }

  async getPet(id: number): Promise<Pet | null> {
    try {
      const response = await fetch(`${this.baseURL}/pets/${id}`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Error fetching pet ${id}:`, error);
      return null;
    }
  }

  async getPetsByUser(userId: number): Promise<Pet[]> {
    try {
      const response = await fetch(`${this.baseURL}/pets/user/${userId}`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error(`Error fetching pets for user ${userId}:`, error);
      return [];
    }
  }

  async getPetsByStatus(status: string): Promise<Pet[]> {
    try {
      const response = await fetch(`${this.baseURL}/pets/status/${status}`, {
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error(`Error fetching pets with status ${status}:`, error);
      return [];
    }
  }

  async createPet(pet: Partial<Pet>): Promise<Pet | null> {
    try {
      const response = await fetch(`${this.baseURL}/pets`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(pet),
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error creating pet:', error);
      return null;
    }
  }

  async updatePet(id: number, pet: Partial<Pet>): Promise<Pet | null> {
    try {
      const response = await fetch(`${this.baseURL}/pets/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(pet),
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      if (response.status === 403) {
        throw new Error('Forbidden: you can only edit your own pets');
      }
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Error updating pet ${id}:`, error);
      return null;
    }
  }

  async deletePet(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/pets/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      if (response.status === 401) {
        throw new Error('Unauthorized: please login');
      }
      
      if (response.status === 403) {
        throw new Error('Forbidden: you can only delete your own pets');
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error(`Error deleting pet ${id}:`, error);
      return false;
    }
  }

  // Виды (публичные endpoints)
  async getSpecies(): Promise<Species[]> {
    try {
      const response = await fetch(`${this.baseURL}/species`, {
        credentials: 'include',
      });
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching species:', error);
      return [];
    }
  }

  // Породы (публичные endpoints)
  async getBreeds(): Promise<Breed[]> {
    try {
      const response = await fetch(`${this.baseURL}/breeds`, {
        credentials: 'include',
      });
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching breeds:', error);
      return [];
    }
  }

  async getBreedsBySpecies(speciesId: number): Promise<Breed[]> {
    try {
      const response = await fetch(`${this.baseURL}/breeds/species/${speciesId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error(`Error fetching breeds for species ${speciesId}:`, error);
      return [];
    }
  }

  // Утилиты
  getPetCardUrl(petId: number): string {
    const frontendUrl = process.env.NEXT_PUBLIC_PETBASE_FRONTEND_URL || 'http://localhost:4100';
    return `${frontendUrl}/pets/${petId}`;
  }

  // Установить токен аутентификации
  setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Удалить токен (logout)
  clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Временный метод для разработки: установить user_id
  setUserId(userId: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_id', userId.toString());
    }
  }
}

export const petBaseAPI = new PetBaseAPI();
