'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { usersApi } from '../../../../lib/api';
import { getMediaUrl } from '../../../../lib/utils';
import { UserIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import CityAutocomplete from '../../../components/shared/CityAutocomplete';

export default function EditProfilePage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'contacts' | 'privacy'>('profile');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    last_name: '',
    bio: '',
    phone: '',
    location: '',
    profile_visibility: 'public',
    show_phone: 'nobody',
    show_email: 'nobody',
    allow_messages: 'everyone',
    show_online: 'yes',
  });
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Проверяем только на клиенте
    if (typeof window === 'undefined') return;

    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
      return;
    }

    // Загружаем данные только при первой загрузке страницы
    if (user && isInitialLoad) {
      console.log('Loading user data:', user); // Для отладки
      setEditForm({
        name: user.name || '',
        last_name: user.last_name || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        profile_visibility: user.profile_visibility || 'public',
        show_phone: user.show_phone || 'nobody',
        show_email: user.show_email || 'nobody',
        allow_messages: user.allow_messages || 'everyone',
        show_online: user.show_online || 'yes',
      });
      // ✅ Используем getMediaUrl для преобразования относительных путей в полные URL
      setAvatarPreview(getMediaUrl(user.avatar) || null);
      setCoverPreview(getMediaUrl(user.cover_photo) || null);
      setIsInitialLoad(false);
    }
  }, [user, isLoading, isAuthenticated, router, isInitialLoad]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 10MB)');
      return;
    }

    // Показываем превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Загружаем на сервер
    setIsUploadingAvatar(true);
    try {
      const response = await usersApi.uploadAvatar(file);
      
      if (response.success && response.data) {
        // Обновляем данные пользователя
        await refreshUser();
        // ✅ Используем getMediaUrl для преобразования URL
        setAvatarPreview(getMediaUrl(response.data.avatar_url) || null);
        toast.success('Аватар успешно обновлен!');
      } else {
        toast.error(response.error || 'Ошибка загрузки аватара');
        // Возвращаем старый аватар
        setAvatarPreview(getMediaUrl(user?.avatar) || null);
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      toast.error('Ошибка загрузки аватара');
      setAvatarPreview(getMediaUrl(user?.avatar) || null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 10MB)');
      return;
    }

    // Показываем превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Загружаем на сервер
    setIsUploadingCover(true);
    try {
      const response = await usersApi.uploadCover(file);
      
      if (response.success && response.data) {
        // Обновляем данные пользователя
        await refreshUser();
        // ✅ Используем getMediaUrl для преобразования URL
        setCoverPreview(getMediaUrl(response.data.cover_url) || null);
        toast.success('Обложка успешно обновлена!');
      } else {
        toast.error(response.error || 'Ошибка загрузки обложки');
        // Возвращаем старую обложку
        setCoverPreview(getMediaUrl(user?.cover_photo) || null);
      }
    } catch (error) {
      console.error('Ошибка загрузки обложки:', error);
      toast.error('Ошибка загрузки обложки');
      setCoverPreview(getMediaUrl(user?.cover_photo) || null);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Вы уверены, что хотите удалить аватар?')) return;

    setIsUploadingAvatar(true);
    try {
      const response = await usersApi.deleteAvatar();
      
      if (response.success) {
        await refreshUser();
        setAvatarPreview(null);
        toast.success('Аватар успешно удален!');
      } else {
        toast.error(response.error || 'Ошибка удаления аватара');
      }
    } catch (error) {
      console.error('Ошибка удаления аватара:', error);
      toast.error('Ошибка удаления аватара');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteCover = async () => {
    if (!confirm('Вы уверены, что хотите удалить обложку?')) return;

    setIsUploadingCover(true);
    try {
      const response = await usersApi.deleteCover();
      
      if (response.success) {
        await refreshUser();
        setCoverPreview(null);
        toast.success('Обложка успешно удалена!');
      } else {
        toast.error(response.error || 'Ошибка удаления обложки');
      }
    } catch (error) {
      console.error('Ошибка удаления обложки:', error);
      toast.error('Ошибка удаления обложки');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    console.log('📤 Sending profile data:', editForm);

    setIsSaving(true);
    try {
      const response = await usersApi.updateProfile(editForm);
      
      console.log('📥 Received response:', response);
      
      if (response.success) {
        // Обновляем данные пользователя в контексте
        await refreshUser();
        toast.success('Профиль успешно обновлен!');
        
        // Используем данные из ответа API напрямую
        if (response.data) {
          const userData = response.data as any;
          console.log('✅ Form updated with saved data:', userData);
          setEditForm({
            name: userData.name || '',
            last_name: userData.last_name || '',
            bio: userData.bio || '',
            phone: userData.phone || '',
            location: userData.location || '',
            profile_visibility: userData.profile_visibility || 'public',
            show_phone: userData.show_phone || 'nobody',
            show_email: userData.show_email || 'nobody',
            allow_messages: userData.allow_messages || 'everyone',
            show_online: userData.show_online || 'yes',
          });
        }
      } else {
        toast.error(response.error || 'Ошибка обновления профиля');
      }
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
      {/* Center Column - Main Form (2 columns width) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Section Title */}
          <div className="border-b border-gray-200 p-6">
            {activeSection === 'profile' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
                <p className="text-sm text-gray-600 mt-1">Фото, имя и краткая информация о себе</p>
              </>
            )}
            {activeSection === 'contacts' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Контакты</h1>
                <p className="text-sm text-gray-600 mt-1">Телефон, город и email</p>
              </>
            )}
            {activeSection === 'privacy' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Приватность</h1>
                <p className="text-sm text-gray-600 mt-1">Настройки безопасности и видимости</p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            {/* Profile Section - includes photos, name, bio */}
            {activeSection === 'profile' && (
              <>
                {/* Cover Photo Section */}
                {coverPreview ? (
                  <div className="relative">
                    <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg overflow-hidden">
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      {isUploadingCover && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <CameraIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCover}
                      disabled={isUploadingCover}
                      className="absolute top-4 right-16 p-2 bg-red-500 rounded-lg shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
                      title="Удалить обложку"
                    >
                      <XMarkIcon className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-gray-600"
                    >
                      <CameraIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {isUploadingCover ? 'Загрузка...' : 'Добавить обложку профиля'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt={user?.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-12 h-12 text-gray-500" />
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50"
                      title="Изменить фото"
                    >
                      <CameraIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{user?.name}</h3>
                    <p className="text-sm text-gray-600">{user?.email}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="text-sm font-medium disabled:opacity-50"
                        style={{ color: '#1B76FF' }}
                      >
                        {isUploadingAvatar ? 'Загрузка...' : 'Изменить фото'}
                      </button>
                      {avatarPreview && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={handleDeleteAvatar}
                            disabled={isUploadingAvatar}
                            className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Имя <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                      placeholder="Введите ваше имя"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                      placeholder="Введите вашу фамилию"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Краткая информация
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    placeholder="Расскажите о себе и своих питомцах..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.bio.length} / 500 символов
                  </p>
                </div>
              </>
            )}

            {/* Contacts Section */}
            {activeSection === 'contacts' && (
              <>
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Номер телефона для связи с вами
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Город
                  </label>
                  <CityAutocomplete
                    value={editForm.location}
                    onChange={(value) => setEditForm({ ...editForm, location: value })}
                    placeholder="Москва"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Укажите город, чтобы находить единомышленников рядом
                  </p>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                    placeholder="email@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email нельзя изменить
                  </p>
                </div>
              </>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <>
                {/* Profile Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может видеть мой профиль
                  </label>
                  <select
                    value={editForm.profile_visibility}
                    onChange={(e) => setEditForm({ ...editForm, profile_visibility: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  >
                    <option value="public">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="private">Только я</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Определяет, кто может просматривать ваш профиль и публикации
                  </p>
                </div>

                {/* Phone Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может видеть мой телефон
                  </label>
                  <select
                    value={editForm.show_phone}
                    onChange={(e) => setEditForm({ ...editForm, show_phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Контролирует видимость вашего номера телефона
                  </p>
                </div>

                {/* Email Visibility */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может видеть мой email
                  </label>
                  <select
                    value={editForm.show_email}
                    onChange={(e) => setEditForm({ ...editForm, show_email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Контролирует видимость вашего email адреса
                  </p>
                </div>

                {/* Messages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кто может писать мне сообщения
                  </label>
                  <select
                    value={editForm.allow_messages}
                    onChange={(e) => setEditForm({ ...editForm, allow_messages: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только друзья</option>
                    <option value="nobody">Никто</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Определяет, кто может отправлять вам личные сообщения
                  </p>
                </div>

                {/* Online Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Показывать мой онлайн-статус
                  </label>
                  <select
                    value={editForm.show_online}
                    onChange={(e) => setEditForm({ ...editForm, show_online: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  >
                    <option value="yes">Да, показывать</option>
                    <option value="no">Нет, скрыть</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Другие пользователи смогут видеть, когда вы онлайн
                  </p>
                </div>
              </>
            )}

            {/* Actions - show for all sections */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving || !editForm.name.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                style={{ backgroundColor: '#1B76FF' }}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column - Sections Menu */}
      <div className="lg:col-span-1 space-y-2.5">
        {/* Sections Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Разделы</h2>
          </div>
          <div className="p-2">
            <button
              onClick={() => setActiveSection('profile')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'profile'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Профиль</p>
                  <p className="text-xs text-gray-600 mt-0.5">Фото, имя, о себе</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  editForm.name && editForm.bio && avatarPreview
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}></div>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('contacts')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'contacts'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Контакты</p>
                  <p className="text-xs text-gray-600 mt-0.5">Телефон, город, email</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  editForm.phone && editForm.location
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}></div>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('privacy')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'privacy'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Приватность</p>
                  <p className="text-xs text-gray-600 mt-0.5">Настройки безопасности</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Section Description */}
        <div className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-100">
          {activeSection === 'profile' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">📝 Профиль</h3>
              <p className="text-xs text-blue-800 mb-3">
                Заполните информацию о себе, добавьте фото и обложку профиля.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Используйте качественное фото для аватара</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Обложка помогает выразить вашу индивидуальность</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Расскажите о себе и своих питомцах</span>
                </li>
              </ul>
            </>
          )}

          {activeSection === 'contacts' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">📞 Контакты</h3>
              <p className="text-xs text-blue-800 mb-3">
                Укажите контактную информацию для связи с вами.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Телефон будет виден только вам</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Укажите город, чтобы находить единомышленников рядом</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Email нельзя изменить после регистрации</span>
                </li>
              </ul>
            </>
          )}

          {activeSection === 'privacy' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">🔒 Приватность</h3>
              <p className="text-xs text-blue-800 mb-3">
                Управляйте настройками приватности и безопасности вашего аккаунта.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Контролируйте, кто может видеть ваш профиль</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Настройте видимость контактных данных</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Определите, кто может писать вам сообщения</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Управляйте отображением онлайн-статуса</span>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
