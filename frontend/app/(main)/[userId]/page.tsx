'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { postsApi, petsApi, usersApi, Post, Pet, User } from '../../../lib/api';
import { getMediaUrl, getFullName, formatLastSeen } from '../../../lib/utils';
import { 
  UserIcon, 
  MapPinIcon, 
  CalendarIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  PencilIcon,
  CameraIcon,
  HeartIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import PostComments from '../../components/shared/PostComments';
import PostCard from '../../components/posts/PostCard';
import CreatePost from '../../components/posts/CreatePost';
import MediaGallery from '../../components/profile/MediaGallery';
import MediaStats from '../../components/profile/MediaStats';
import FriendButton from '../../components/profile/FriendButton';
import FriendsListWidget from '../../components/profile/FriendsListWidget';

type TabType = 'posts' | 'media';

export default function UserProfilePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [curatedPets, setCuratedPets] = useState<Pet[]>([]);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const { user: currentUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Извлекаем ID из параметра (id1 -> 1)
  const userIdParam = params.userId as string;
  const userId = userIdParam?.startsWith('id') ? parseInt(userIdParam.slice(2)) : null;

  // Проверяем, это профиль текущего пользователя или чужой
  const isOwnProfile = currentUser && userId === currentUser.id;

  const loadUserProfile = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Всегда загружаем свежие данные с сервера для актуальной информации (верификация, и т.д.)
      const userResponse = await usersApi.getById(userId);
      if (userResponse.success && userResponse.data) {
        setProfileUser(userResponse.data);
      } else {
        // Если 401 и пользователь не авторизован - показываем сообщение
        if (!isAuthenticated) {
          setProfileUser(null);
          setLoading(false);
          return;
        }
        router.push('/');
        return;
      }

      // Загружаем посты (публичный endpoint)
      const postsResponse = await postsApi.getUserPosts(userId, { limit: 20, offset: 0 });
      if (postsResponse.success && postsResponse.data) {
        setPosts(postsResponse.data);
        setHasMore(postsResponse.data.length === 20);
        setOffset(20);
      }

      // Загружаем питомцев только для авторизованных
      if (isAuthenticated) {
        const [petsResponse, curatedPetsResponse] = await Promise.all([
          petsApi.getUserPets(userId),
          petsApi.getCuratedPets(userId),
        ]);

        if (petsResponse.success && petsResponse.data) {
          setPets(petsResponse.data);
        }

        if (curatedPetsResponse.success && curatedPetsResponse.data) {
          setCuratedPets(curatedPetsResponse.data);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      // Для неавторизованных показываем сообщение вместо редиректа
      if (!isAuthenticated) {
        setProfileUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!userId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const postsResponse = await postsApi.getUserPosts(userId, { limit: 20, offset });
      
      if (postsResponse.success && postsResponse.data) {
        setPosts(prev => [...prev, ...(postsResponse.data || [])]);
        setHasMore((postsResponse.data?.length || 0) === 20);
        setOffset(prev => prev + (postsResponse.data?.length || 0));
      }
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Проверяем только на клиенте
    if (typeof window === 'undefined') return;

    // Загружаем профиль для всех (авторизованных и нет)
    if (userId && !isLoading) {
      loadUserProfile();
    }
  }, [userId, isLoading]); // Убрали проверку авторизации

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && activeTab === 'posts') {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, activeTab, offset]);

  const handleEditClick = () => {
    router.push('/profile/edit');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div>
        {/* Баннер для неавторизованных пользователей */}
        {!isAuthenticated && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Войдите, чтобы увидеть профиль</p>
                <p className="text-xs text-gray-600">Для просмотра профилей пользователей необходимо войти в свой аккаунт.</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button 
                  onClick={() => router.push('/auth')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Зарегистрироваться
                </button>
                <button 
                  onClick={() => router.push('/auth')}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors whitespace-nowrap"
                  style={{ backgroundColor: '#1B76FF' }}
                >
                  Войти
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md">
            <p className="text-gray-700 font-medium text-lg mb-2">Профиль недоступен</p>
            <p className="text-gray-500 mb-4">
              {!isAuthenticated 
                ? 'Войдите в свой аккаунт, чтобы просматривать профили пользователей'
                : 'Пользователь не найден'
              }
            </p>
            {!isAuthenticated && (
              <button 
                onClick={() => router.push('/auth')}
                className="px-6 py-2 text-white rounded-lg font-medium"
                style={{ backgroundColor: '#1B76FF' }}
              >
                Войти / Регистрация
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const profile = {
    name: profileUser.name,
    lastName: profileUser.last_name,
    avatar: profileUser.avatar || null,
    coverPhoto: profileUser.cover_photo || null,
    location: profileUser.location || 'Не указано',
    joinDate: profileUser.created_at ? new Date(profileUser.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : 'Недавно',
    phone: profileUser.phone || 'Не указан',
    email: profileUser.email,
    bio: profileUser.bio || 'Информация не заполнена',
  };

  return (
    <div>
      {/* Баннер для неавторизованных пользователей */}
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Читайте только самое интересное</p>
              <p className="text-xs text-gray-600">Мы нашли много записей по вашему вкусу и собрали их целую ленту — просто войдите в свой аккаунт.</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button 
                onClick={() => router.push('/auth')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Зарегистрироваться
              </button>
              <button 
                onClick={() => router.push('/auth')}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors whitespace-nowrap"
                style={{ backgroundColor: '#1B76FF' }}
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Обложка профиля */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-2.5">
        {/* Cover Photo - показываем только если есть */}
        {profile.coverPhoto && (
          <div className="relative h-48 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
            <img src={getMediaUrl(profile.coverPhoto) || ''} alt="Cover" className="w-full h-full object-cover" />
            {isOwnProfile && (
              <button 
                className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                title="Изменить обложку"
              >
                <CameraIcon className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Profile Info */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className={`relative ${profile.coverPhoto ? '-mt-16 sm:-mt-20' : ''}`}>
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-300 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {profile.avatar ? (
                  <img src={getMediaUrl(profile.avatar) || ''} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-500" />
                )}
              </div>
              {/* Статус онлайн индикатор на аватаре */}
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white flex-shrink-0 ${
                profileUser.is_online ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              {isOwnProfile && (
                <button 
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
                  title="Изменить фото"
                >
                  <CameraIcon className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* Name and Actions */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                      {getFullName(profile.name, profile.lastName)}
                    </h1>
                    {profileUser.verified && (
                      <CheckBadgeIcon 
                        className="w-6 h-6 text-blue-500 flex-shrink-0" 
                        title="Проверенный пользователь"
                      />
                    )}
                    {/* Статус онлайн */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        profileUser.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        {profileUser.is_online ? (
                          'Онлайн'
                        ) : profileUser.last_seen ? (
                          <>
                            Был{profileUser.last_name ? 'а' : ''} {formatLastSeen(profileUser.last_seen)}
                          </>
                        ) : (
                          'Статус неизвестен'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{profile.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">На платформе с {profile.joinDate}</span>
                    </div>
                  </div>
                </div>

                {isOwnProfile ? (
                  <button 
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
                    style={{ backgroundColor: '#1B76FF' }}
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Редактировать профиль</span>
                    <span className="sm:hidden">Редактировать</span>
                  </button>
                ) : userId && isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <FriendButton userId={userId} currentUserId={currentUser?.id || 0} />
                    <button 
                      onClick={() => router.push(`/messenger?user=${userId}`)}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
                      style={{ backgroundColor: '#1B76FF' }}
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>Написать</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Left Column - Activity */}
        <div className="lg:col-span-2 space-y-2.5">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('posts')}
                className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'posts'
                    ? 'border-[#1B76FF] text-[#1B76FF]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Публикации
              </button>
              {/* Вкладка Медиа - только для владельца профиля */}
              {isOwnProfile && (
                <button 
                  onClick={() => setActiveTab('media')}
                  className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'media'
                      ? 'border-[#1B76FF] text-[#1B76FF]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Медиа
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {activeTab === 'posts' && (
                <div className="space-y-2.5">
                  {/* Форма создания поста (только для своего профиля) */}
                  {isOwnProfile && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <CreatePost onPostCreated={loadUserProfile} />
                    </div>
                  )}

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Пока нет публикаций</p>
                    </div>
                  ) : (
                    <>
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                      
                      {/* Элемент для наблюдения (infinite scroll trigger) */}
                      <div ref={observerTarget} className="h-10 flex items-center justify-center">
                        {loadingMore && (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
                        )}
                        {!hasMore && posts.length > 0 && (
                          <p className="text-sm text-gray-500">Все посты загружены</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'media' && userId && (
                <MediaGallery userId={userId} mediaType="all" />
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="lg:col-span-1 space-y-2.5">
          {/* О себе */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">О себе</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
          </div>

          {/* Контактная информация */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Контакты</h2>
            <div className="space-y-3">
              {/* Статус онлайн */}
              <div className="flex items-center gap-3 text-sm">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  profileUser.is_online ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <div>
                  <span className="text-gray-700 font-medium">
                    {profileUser.is_online ? (
                      'Онлайн'
                    ) : profileUser.last_seen ? (
                      <>
                        Был{profileUser.last_name ? 'а' : ''} {formatLastSeen(profileUser.last_seen)}
                      </>
                    ) : (
                      'Статус неизвестен'
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <PhoneIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{profile.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{profile.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPinIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{profile.location}</span>
              </div>
            </div>
          </div>

          {/* Друзья */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            {userId && <FriendsListWidget userId={userId} limit={6} />}
          </div>

          {/* Мои питомцы - только для авторизованных */}
          {isAuthenticated && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Питомцы</h2>
              {isOwnProfile && (
                <button 
                  onClick={() => window.location.href = 'http://localhost:6100'}
                  className="text-sm font-medium" 
                  style={{ color: '#1B76FF' }}
                  title="Перейти в кабинет владельца для управления питомцами"
                >
                  Добавить
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
              </div>
            ) : pets.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                <p>Питомцы не добавлены</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {pets.map((pet) => {
                  const photoUrl = getMediaUrl(pet.photo);
                  const hasPhoto = pet.photo && pet.photo.trim() !== '';
                  
                  return (
                    <div
                      key={pet.id}
                      onClick={() => router.push(`/pets/${pet.id}`)}
                      className="relative w-full rounded-lg bg-gray-200 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer group overflow-hidden"
                      style={{ aspectRatio: '1/1' }}
                    >
                      {hasPhoto ? (
                        <img 
                          src={photoUrl || ''} 
                          alt={pet.name || 'Питомец'} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width={76}
                          height={76}
                          onError={(e) => {
                            console.error('❌ Failed to load pet image:', pet.name, photoUrl);
                            // Показываем placeholder при ошибке
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={(e) => {
                            // Логирование отключено для чистоты консоли
                            // console.log('✅ Successfully loaded pet image:', pet.name || `Pet ${pet.id}`);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <span className="text-3xl mb-1">
                            {pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐕' : '🐾'}
                          </span>
                          <span className="text-xs text-gray-600 text-center font-medium">{pet.name || 'Питомец'}</span>
                        </div>
                      )}
                      {hasPhoto && pet.name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-medium">{pet.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Курирую - только для авторизованных */}
          {isAuthenticated && curatedPets.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Курирую</h2>
                {isOwnProfile && (
                  <button 
                    onClick={() => window.location.href = 'http://localhost:6200'}
                    className="text-sm font-medium" 
                    style={{ color: '#1B76FF' }}
                    title="Перейти в кабинет волонтёра"
                  >
                    Управление
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {curatedPets.map((pet) => {
                  const photoUrl = getMediaUrl(pet.photo);
                  const hasPhoto = pet.photo && pet.photo.trim() !== '';
                  
                  return (
                    <div
                      key={pet.id}
                      onClick={() => window.location.href = `http://localhost:4100/pets/${pet.id}`}
                      className="relative w-full rounded-lg bg-gray-200 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer group overflow-hidden"
                      style={{ aspectRatio: '1/1' }}
                    >
                      {hasPhoto ? (
                        <img 
                          src={photoUrl || ''} 
                          alt={pet.name || 'Питомец'} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width={76}
                          height={76}
                          onError={(e) => {
                            console.error('❌ Failed to load pet image:', pet.name, photoUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <span className="text-3xl mb-1">
                            {pet.species === 'cat' ? '🐱' : pet.species === 'dog' ? '🐕' : '🐾'}
                          </span>
                          <span className="text-xs text-gray-600 text-center font-medium">{pet.name || 'Питомец'}</span>
                        </div>
                      )}
                      {hasPhoto && pet.name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-xs font-medium">{pet.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Статистика медиа */}
          {isOwnProfile && <MediaStats />}
        </div>
      </div>
    </div>
  );
}
