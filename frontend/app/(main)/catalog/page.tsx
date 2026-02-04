'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { getFavorites, addFavorite, removeFavorite } from '@/lib/favorites-api';
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

export default function CatalogPage() {
  const { user } = useAuth(); // Получаем информацию о пользователе
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSpecies, setFilterSpecies] = useState<string>('all');
  const [filterOrganization, setFilterOrganization] = useState<string>('all');
  const [filterFromOrganization, setFilterFromOrganization] = useState<boolean>(false);
  const [copiedPetId, setCopiedPetId] = useState<number | null>(null);
  const [favoritePetIds, setFavoritePetIds] = useState<Set<number>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<number | null>(null);

  useEffect(() => {
    loadPets();
    // Загружаем избранное только если пользователь авторизован
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadPets = async () => {
    try {
      console.log('🔍 Загрузка питомцев из каталога...');
      // TODO: PetID сервис пока не доступен
      // Показываем заглушку
      console.log('ℹ️ PetID сервис недоступен, показываем заглушку');
      setPets([]);
    } catch (error) {
      console.error('❌ Ошибка загрузки питомцев:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const favorites = await getFavorites();
      const petIds = new Set(favorites.map(f => f.pet_id));
      setFavoritePetIds(petIds);
    } catch (error) {
      // Не авторизован или ошибка - просто не загружаем избранное
      console.log('ℹ️ Favorites not loaded (user may not be authenticated)');
    }
  };

  const filteredPets = pets.filter(pet => {
    const matchesSearch = pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pet.breed?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || pet.status === filterStatus;
    const matchesSpecies = filterSpecies === 'all' || pet.species === filterSpecies;
    const matchesOrganization = filterOrganization === 'all' || pet.organization_type === filterOrganization;
    const matchesFromOrganization = !filterFromOrganization || pet.organization_id !== undefined;
    
    return matchesSearch && matchesStatus && matchesSpecies && matchesOrganization && matchesFromOrganization;
  });

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

  // Быстрые действия
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

  const handleFavorite = async (petId: number) => {
    // Проверяем авторизацию
    if (!user) {
      alert('Для добавления в избранное необходимо авторизоваться');
      return;
    }

    setFavoriteLoading(petId);
    try {
      const isFavorite = favoritePetIds.has(petId);
      
      if (isFavorite) {
        await removeFavorite(petId);
        setFavoritePetIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(petId);
          return newSet;
        });
      } else {
        await addFavorite(petId);
        setFavoritePetIds(prev => new Set(prev).add(petId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Ошибка при добавлении в избранное');
    } finally {
      setFavoriteLoading(null);
    }
  };

  const handleMessage = (petId: number, contactPhone?: string) => {
    // TODO: Открыть мессенджер с контактом
    console.log('Open messenger for pet:', petId, 'contact:', contactPhone);
    alert('Функция "Написать" будет реализована в следующей версии');
  };

  const statusLabels: Record<string, string> = {
    looking_for_home: 'Ищет дом',
    lost: 'Потерялся',
    found: 'Найден',
    needs_help: 'Требуется помощь',
  };

  const speciesLabels: Record<string, string> = {
    dog: '🐕 Собака',
    cat: '🐈 Кошка',
    bird: '🐦 Птица',
    other: '🐾 Другое',
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Каталог питомцев</h1>
        <p className="text-gray-600">Найдите питомца, который ищет дом или помогите найти потерявшегося</p>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по кличке или породе..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Фильтр по статусу */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="looking_for_home">Ищет дом</option>
            <option value="lost">Потерялся</option>
            <option value="found">Найден</option>
            <option value="needs_help">Требуется помощь</option>
          </select>

          {/* Фильтр по виду */}
          <select
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все виды</option>
            <option value="dog">Собаки</option>
            <option value="cat">Кошки</option>
            <option value="bird">Птицы</option>
            <option value="other">Другие</option>
          </select>

          {/* Фильтр по типу организации */}
          <select
            value={filterOrganization}
            onChange={(e) => setFilterOrganization(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Все организации</option>
            <option value="shelter">Приюты</option>
            <option value="vet_clinic">Ветклиники</option>
            <option value="foundation">Фонды</option>
            <option value="kennel">Питомники</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Найдено: {filteredPets.length} питомцев</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterFromOrganization}
                onChange={(e) => setFilterFromOrganization(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span>Только из организаций</span>
            </label>
          </div>
        </div>
      </div>

      {/* Список питомцев */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-pulse text-gray-400">Загрузка...</div>
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">🐾</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Каталог питомцев временно недоступен</h3>
          <p className="text-gray-500 mb-4">
            Для работы каталога требуется сервис PetID, который сейчас не запущен.
          </p>
          <p className="text-sm text-gray-400">
            Каталог будет доступен после запуска PetID сервиса на порту 8100
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPets.map((pet) => (
            <div
              key={pet.id}
              onClick={() => window.location.href = `/pets/${pet.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer group"
            >
              {/* Фото */}
              <div className="relative h-64 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
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
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {statusLabels[pet.status]}
                  </span>
                </div>
              </div>

              {/* Информация */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
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

                {/* Быстрые действия */}
                <div className="flex items-center gap-2 mb-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavorite(pet.id);
                    }}
                    disabled={favoriteLoading === pet.id}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      favoritePetIds.has(pet.id)
                        ? 'text-red-700 bg-red-50 hover:bg-red-100'
                        : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={favoritePetIds.has(pet.id) ? 'Удалить из избранного' : 'Добавить в избранное'}
                  >
                    {favoriteLoading === pet.id ? '⏳' : favoritePetIds.has(pet.id) ? '❤️' : '🤍'} 
                    {favoritePetIds.has(pet.id) ? 'В избранном' : 'Избранное'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(pet.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    title={copiedPetId === pet.id ? 'Ссылка скопирована!' : 'Поделиться'}
                  >
                    {copiedPetId === pet.id ? '✓ Скопировано' : '📤 Поделиться'}
                  </button>
                  {pet.contact_phone && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessage(pet.id, pet.contact_phone);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Написать"
                    >
                      💬 Написать
                    </button>
                  )}
                </div>

                {/* Контакты */}
                {pet.contact_phone && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Контакт:</div>
                    <div className="text-sm font-medium text-gray-900">{pet.contact_name || 'Не указан'}</div>
                    <a href={`tel:${pet.contact_phone}`} className="text-sm text-blue-600 hover:text-blue-700">
                      {pet.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
