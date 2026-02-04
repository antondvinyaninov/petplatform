'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeartIcon } from '@heroicons/react/24/solid';
import { getFavorites, removeFavorite, type Favorite } from '@/lib/favorites-api';
import { useAuth } from '@/contexts/AuthContext';

interface Pet {
  id: number;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  photo?: string;
  status: string;
  city?: string;
  region?: string;
  urgent?: boolean;
  contact_name?: string;
  contact_phone?: string;
  story?: string;
  organization_id?: number;
  organization_name?: string;
  organization_type?: string;
}

interface FavoriteWithPet extends Favorite {
  pet?: Pet;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteWithPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [copiedPetId, setCopiedPetId] = useState<number | null>(null);
  const [petIdServiceAvailable, setPetIdServiceAvailable] = useState(true);

  useEffect(() => {
    // Проверяем авторизацию
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }

    if (user) {
      loadFavorites();
    }
  }, [user, authLoading, router]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const favoritesData = await getFavorites();
      
      // Проверяем доступность PetID сервиса
      let serviceAvailable = true;
      
      // Загружаем информацию о каждом питомце
      const favoritesWithPets = await Promise.all(
        favoritesData.map(async (favorite) => {
          try {
            // ⚠️ PetID сервис может быть не запущен - обрабатываем это
            const response = await fetch(`http://localhost:8100/api/pets/${favorite.pet_id}`);
            if (response.ok) {
              const result = await response.json();
              return {
                ...favorite,
                pet: result.data,
              };
            } else {
              serviceAvailable = false;
            }
          } catch (error) {
            console.error(`Error loading pet ${favorite.pet_id}:`, error);
            serviceAvailable = false;
          }
          return favorite;
        })
      );

      setPetIdServiceAvailable(serviceAvailable);
      setFavorites(favoritesWithPets as FavoriteWithPet[]);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (petId: number) => {
    if (!confirm('Удалить питомца из избранного?')) return;

    setRemovingId(petId);
    try {
      await removeFavorite(petId);
      setFavorites(prev => prev.filter(f => f.pet_id !== petId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Ошибка при удалении из избранного');
    } finally {
      setRemovingId(null);
    }
  };

  const handleShare = async (petId: number) => {
    const url = `${window.location.origin}/petid/${petId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPetId(petId);
      setTimeout(() => setCopiedPetId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleViewPet = (petId: number) => {
    router.push(`/petid/${petId}`);
  };

  const getAge = (birthDate?: string) => {
    if (!birthDate) return 'Возраст не указан';
    
    const birth = new Date(birthDate);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    } else if (months > 0) {
      return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
    }
    return 'Новорождённый';
  };

  const statusLabels: Record<string, string> = {
    looking_for_home: 'Ищет дом',
    lost: 'Потерялся',
    found: 'Найден',
    needs_help: 'Требуется помощь',
    home: 'Дома',
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 shadow-sm border border-red-100">
        <div className="flex items-center gap-3 mb-2">
          <HeartIcon className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900">Избранные питомцы</h1>
        </div>
        <p className="text-gray-600">Питомцы, которых вы добавили в избранное</p>
      </div>

      {/* Предупреждение если PetID сервис недоступен */}
      {!loading && !petIdServiceAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Сервис PetID недоступен
              </h3>
              <p className="text-yellow-800 mb-3">
                Для отображения подробной информации о питомцах требуется запущенный сервис PetID (порт 8100).
              </p>
              <p className="text-sm text-yellow-700">
                Ваши избранные питомцы сохранены, но их детали временно недоступны.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Счетчик */}
      {!loading && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Всего в избранном: <span className="font-semibold text-gray-900">{favorites.length}</span> питомцев
            </span>
            {favorites.length > 0 && (
              <button
                onClick={() => router.push('/catalog')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Добавить ещё →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Список избранных */}
      {authLoading || loading ? (
        <div className="text-center py-20">
          <div className="animate-pulse text-gray-400">Загрузка...</div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">💔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">У вас пока нет избранных</h3>
          <p className="text-gray-500 mb-6">Добавьте питомцев в избранное, чтобы не потерять их</p>
          <button
            onClick={() => router.push('/catalog')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Перейти в каталог
          </button>
        </div>
      ) : !petIdServiceAvailable ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Детали питомцев недоступны</h3>
          <p className="text-gray-500 mb-4">
            У вас {favorites.length} {favorites.length === 1 ? 'питомец' : 'питомца'} в избранном,
            но для отображения их деталей требуется запущенный сервис PetID.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Ваши избранные сохранены и будут доступны после запуска сервиса.
          </p>
          <button
            onClick={() => router.push('/catalog')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Вернуться в каталог
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => {
            if (!favorite.pet) return null;
            const pet = favorite.pet;
            return (
              <div
                key={favorite.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all duration-300 group"
              >
                {/* Фото */}
                <div 
                  className="relative h-64 bg-gradient-to-br from-red-50 to-pink-50 overflow-hidden cursor-pointer"
                  onClick={() => handleViewPet(pet.id)}
                >
                  {pet.photo ? (
                    <img
                      src={pet.photo}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      {pet.species === 'dog' && '🐕'}
                      {pet.species === 'cat' && '🐈'}
                      {pet.species === 'bird' && '🐦'}
                      {!pet.species && '🐾'}
                    </div>
                  )}
                  
                  {/* Срочно бадж */}
                  {pet.urgent && (
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-500 text-white shadow-sm">
                        СРОЧНО
                      </span>
                    </div>
                  )}

                  {/* Статус бадж */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm ${
                      pet.status === 'lost' ? 'bg-red-100 text-red-700' : 
                      pet.status === 'found' ? 'bg-blue-100 text-blue-700' :
                      pet.status === 'needs_help' ? 'bg-purple-100 text-purple-700' :
                      pet.status === 'home' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {statusLabels[pet.status] || pet.status}
                    </span>
                  </div>

                  {/* Бадж "В избранном" */}
                  <div className="absolute bottom-3 right-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-red-500 text-white shadow-sm">
                      <HeartIcon className="w-3 h-3" />
                      В избранном
                    </span>
                  </div>
                </div>

                {/* Информация */}
                <div className="p-5">
                  <h3 
                    className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors cursor-pointer"
                    onClick={() => handleViewPet(pet.id)}
                  >
                    {pet.name}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg mr-2">
                        {pet.species === 'dog' && '🐕'}
                        {pet.species === 'cat' && '🐈'}
                        {pet.species === 'bird' && '🐦'}
                        {!pet.species && '🐾'}
                      </span>
                      <span className="font-medium">{pet.breed || 'Порода не указана'}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {pet.gender === 'male' && '♂️ Самец'}
                        {pet.gender === 'female' && '♀️ Самка'}
                        {!pet.gender && '⚪ Не указан'}
                      </span>
                      <span className="text-gray-700 font-medium">{getAge(pet.birth_date)}</span>
                    </div>

                    {(pet.city || pet.region) && (
                      <div className="text-sm text-gray-600">
                        📍 {pet.city || pet.region}
                      </div>
                    )}

                    {/* Организация */}
                    {pet.organization_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">
                          🏢 {pet.organization_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {pet.story && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pet.story}</p>
                  )}

                  {/* Дата добавления в избранное */}
                  <div className="text-xs text-gray-400 mb-4">
                    Добавлено: {new Date(favorite.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>

                  {/* Действия */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleRemoveFavorite(pet.id)}
                      disabled={removingId === pet.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Удалить из избранного"
                    >
                      {removingId === pet.id ? '⏳' : '💔'} Удалить
                    </button>
                    <button
                      onClick={() => handleShare(pet.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      title={copiedPetId === pet.id ? 'Ссылка скопирована!' : 'Поделиться'}
                    >
                      {copiedPetId === pet.id ? '✓ Скопировано' : '📤 Поделиться'}
                    </button>
                    <button
                      onClick={() => handleViewPet(pet.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Подробнее"
                    >
                      👁️ Подробнее
                    </button>
                  </div>

                  {/* Контакты */}
                  {pet.contact_phone && (
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <div className="text-xs text-gray-500 mb-1">Контакт:</div>
                      <div className="text-sm font-medium text-gray-900">{pet.contact_name || 'Не указан'}</div>
                      <a href={`tel:${pet.contact_phone}`} className="text-sm text-blue-600 hover:text-blue-700">
                        {pet.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
