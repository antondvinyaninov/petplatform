'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  CalendarIcon, 
  CheckCircleIcon,
  ShareIcon,
  HeartIcon,
  ClockIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { postsApi, Post, Pet } from '../../../../lib/api';
import PostCard from '../../../components/posts/PostCard';
import PetEventsTimeline from '../../../components/pets/PetEventsTimeline';

export default function PetPage() {
  const params = useParams();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');

  useEffect(() => {
    if (params.id) {
      loadPet();
      loadPosts();
      loadCurrentUser();
    }
  }, [params.id]);

  const loadCurrentUser = async () => {
    try {
      const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:7100';
      const response = await fetch(`${authUrl}/api/auth/me`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCurrentUserId(result.data.id);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadPet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8100/api/pets/${params.id}`, {
        headers: {
          'X-User-ID': '1', // TODO: получать из AuthContext
        },
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setPet(result.data);
      }
    } catch (error) {
      console.error('Error loading pet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await postsApi.getPetPosts(Number(params.id));
      if (response.success && response.data) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const getAge = () => {
    if (!pet?.birth_date) return null;
    const birthDate = new Date(pet.birth_date);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
    } else if (months > 0) {
      return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`;
    }
    return 'Новорождённый';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-xl mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🐾</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Питомец не найден</h2>
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-600"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  const age = getAge();

  return (
    <div>
      {/* Cover and Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-2.5">
        {/* Cover Photo */}
        <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100">
          {pet.photo ? (
            <img 
              src={`http://localhost:8000${pet.photo}`}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
              🐾
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative -mt-16 sm:-mt-20">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-300 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {pet.photo ? (
                  <img 
                    src={`http://localhost:8000${pet.photo}`}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl">🐾</div>
                )}
              </div>
            </div>

            {/* Name and Info */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{pet.name}</h1>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{pet.species}</span>
                      {pet.breed && <span>• {pet.breed}</span>}
                    </div>
                    {age && (
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{age}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {currentUserId === pet.user_id && (
                    <a
                      href={`http://localhost:6100/pets/${pet.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
                    >
                      Редактировать
                    </a>
                  )}
                  <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <ShareIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <HeartIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-2.5">
          {/* Фотогалерея */}
          {(() => {
            try {
              const photosArray = pet.photo ? JSON.parse(pet.photo as string) : [];
              if (Array.isArray(photosArray) && photosArray.length > 0) {
                return (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Фотогалерея</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {photosArray.map((photo: string, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                          <img
                            src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `http://localhost:8000${photo}`}
                            alt={`${pet.name} - фото ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              // TODO: Открыть фото в полноэкранном режиме
                            }}
                            onError={(e) => {
                              console.error('Error loading image:', photo.substring(0, 50));
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EФото%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            } catch (e) {
              console.error('Error parsing photos:', e);
            }
            return null;
          })()}

          {/* О питомце */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">О питомце</h2>
            
            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Возраст */}
              {age && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Возраст</div>
                    <div className="text-lg font-semibold text-gray-900">{age}</div>
                    {pet.birth_date && (
                      <div className="text-sm text-gray-500">
                        Дата рождения: {new Date(pet.birth_date).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Пол */}
              {pet.gender && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{pet.gender === 'male' ? '♂' : '♀'}</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Пол</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {pet.gender === 'male' ? 'Самец' : 'Самка'}
                    </div>
                  </div>
                </div>
              )}

              {/* Окрас */}
              {pet.color && (
                <div className="flex items-start gap-4 md:col-span-2">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Окрас</div>
                    <div className="text-lg font-semibold text-gray-900">{pet.color}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Медицинская информация */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Медицинская информация</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Привит */}
              <div className={`p-4 rounded-xl border-2 ${pet.is_vaccinated ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  {pet.is_vaccinated ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">Привит</div>
                    <div className="text-sm text-gray-600">
                      {pet.is_vaccinated ? 'Да' : 'Нет данных'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Стерилизован */}
              <div className={`p-4 rounded-xl border-2 ${pet.is_sterilized ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  {pet.is_sterilized ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">Стерилизован</div>
                    <div className="text-sm text-gray-600">
                      {pet.is_sterilized ? 'Да' : 'Нет данных'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Чипирован */}
              <div className={`p-4 rounded-xl border-2 ${pet.chip_number ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  {pet.chip_number ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">Чипирован</div>
                    <div className="text-sm text-gray-600">
                      {pet.chip_number ? 'Да' : 'Нет данных'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === 'posts'
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <PhotoIcon className="w-5 h-5" />
                  <span>Посты</span>
                  {activeTab === 'posts' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab('events')}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === 'events'
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ClockIcon className="w-5 h-5" />
                  <span>История событий</span>
                  {activeTab === 'events' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                  )}
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'posts' ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Посты с {pet.name}</h2>
                  
                  {postsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Пока нет постов с этим питомцем</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <PetEventsTimeline 
                  petId={pet.id}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-2.5">
          {/* Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                <HeartIcon className="w-5 h-5" />
                В избранное
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:border-gray-300 transition-colors">
                <ShareIcon className="w-5 h-5" />
                Поделиться
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация</h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Кличка</div>
                <div className="font-semibold text-gray-900">{pet.name}</div>
              </div>
              
              {pet.species && (
                <div>
                  <div className="text-gray-500 mb-1">Вид</div>
                  <div className="font-semibold text-gray-900">{pet.species}</div>
                </div>
              )}

              {pet.breed && (
                <div>
                  <div className="text-gray-500 mb-1">Порода</div>
                  <div className="font-semibold text-gray-900">{pet.breed}</div>
                </div>
              )}

              {pet.gender && (
                <div>
                  <div className="text-gray-500 mb-1">Пол</div>
                  <div className="font-semibold text-gray-900">
                    {pet.gender === 'male' ? 'Самец' : 'Самка'}
                  </div>
                </div>
              )}

              {age && (
                <div>
                  <div className="text-gray-500 mb-1">Возраст</div>
                  <div className="font-semibold text-gray-900">{age}</div>
                </div>
              )}
            </div>
          </div>

          {/* Medical Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Здоровье</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Привит</span>
                <span className={`text-sm font-semibold ${pet.is_vaccinated ? 'text-green-600' : 'text-gray-400'}`}>
                  {pet.is_vaccinated ? '✓ Да' : 'Нет данных'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Стерилизован</span>
                <span className={`text-sm font-semibold ${pet.is_sterilized ? 'text-green-600' : 'text-gray-400'}`}>
                  {pet.is_sterilized ? '✓ Да' : 'Нет данных'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Чипирован</span>
                <span className={`text-sm font-semibold ${pet.chip_number ? 'text-green-600' : 'text-gray-400'}`}>
                  {pet.chip_number ? '✓ Да' : 'Нет данных'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
