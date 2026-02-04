'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pet } from '../../../../../lib/api';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function EditPetPage() {
  const params = useParams();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'medical' | 'photos' | 'additional'>('basic');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [status, setStatus] = useState('');
  const [isVaccinated, setIsVaccinated] = useState(false);
  const [isSterilized, setIsSterilized] = useState(false);
  const [chipNumber, setChipNumber] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (params.id && currentUserId) {
      loadPet();
    }
  }, [params.id, currentUserId]);

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
    if (!currentUserId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8100/api/pets/${params.id}`, {
        headers: {
          'X-User-ID': currentUserId.toString(),
        },
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const petData = result.data;
        setPet(petData);
        
        // Заполняем форму
        setName(petData.name || '');
        setSpecies(petData.species || '');
        setBreed(petData.breed || '');
        setGender(petData.gender || '');
        setBirthDate(petData.birth_date ? petData.birth_date.split('T')[0] : '');
        setColor(petData.color || '');
        setSize(petData.size || '');
        setStatus(petData.status || '');
        setIsVaccinated(petData.is_vaccinated || false);
        setIsSterilized(petData.is_sterilized || false);
        setChipNumber(petData.chip_number || '');
        setPhotoPreview(petData.photo ? `http://localhost:8000${petData.photo}` : null);
        
        // Загружаем дополнительные фото
        if (petData.photos) {
          try {
            const photosArray = JSON.parse(petData.photos);
            setPhotos(Array.isArray(photosArray) ? photosArray : []);
          } catch (e) {
            setPhotos([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading pet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой (максимум 10MB)');
      return;
    }

    // Показываем превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // TODO: Загрузка фото на сервер
    // Пока просто показываем превью
  };

  const handleDeletePhoto = () => {
    if (!confirm('Вы уверены, что хотите удалить фото?')) return;
    setPhotoPreview(null);
    // TODO: Удаление фото с сервера
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой (максимум 10MB)');
      return;
    }

    // Показываем превью
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos([...photos, reader.result as string]);
    };
    reader.readAsDataURL(file);

    // TODO: Загрузка фото на сервер
  };

  const handleDeletePhotoFromGallery = (index: number) => {
    if (!confirm('Удалить это фото?')) return;
    setPhotos(photos.filter((_, i) => i !== index));
    // TODO: Удаление фото с сервера
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !species) {
      alert('Заполните обязательные поля: кличка и вид');
      return;
    }

    if (!currentUserId) {
      alert('Ошибка: не удалось определить текущего пользователя');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`http://localhost:8100/api/pets/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUserId.toString(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          species,
          breed: breed || undefined,
          gender: gender || undefined,
          birth_date: birthDate || undefined,
          color: color || undefined,
          size: size || undefined,
          status: status || undefined,
          is_vaccinated: isVaccinated,
          is_sterilized: isSterilized,
          chip_number: chipNumber || undefined,
          photos: photos.length > 0 ? JSON.stringify(photos) : undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Питомец успешно обновлён!');
        router.push(`/pets/${params.id}`);
      } else {
        alert(`Ошибка: ${result.error || 'Не удалось обновить питомца'}`);
      }
    } catch (error) {
      console.error('Error updating pet:', error);
      alert('Ошибка при обновлении питомца');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
      {/* Center Column - Main Form (2 columns width) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Section Title */}
          <div className="border-b border-gray-200 p-6">
            {activeSection === 'basic' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Основная информация</h1>
                <p className="text-sm text-gray-600 mt-1">Фото, кличка, вид и характеристики</p>
              </>
            )}
            {activeSection === 'medical' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Медицинская информация</h1>
                <p className="text-sm text-gray-600 mt-1">Прививки, стерилизация и чипирование</p>
              </>
            )}
            {activeSection === 'photos' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Фотогалерея</h1>
                <p className="text-sm text-gray-600 mt-1">Дополнительные фото питомца</p>
              </>
            )}
            {activeSection === 'additional' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900">Дополнительно</h1>
                <p className="text-sm text-gray-600 mt-1">Статус и особые отметки</p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Section */}
            {activeSection === 'basic' && (
              <>
                {/* Photo Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">🐕</span>
                      )}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50"
                      title="Изменить фото"
                    >
                      <CameraIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{name || 'Имя питомца'}</h3>
                    <p className="text-sm text-gray-600">{species || 'Вид не указан'}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="text-sm font-medium disabled:opacity-50"
                        style={{ color: '#1B76FF' }}
                      >
                        {isUploadingPhoto ? 'Загрузка...' : 'Изменить фото'}
                      </button>
                      {photoPreview && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={handleDeletePhoto}
                            disabled={isUploadingPhoto}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кличка <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    placeholder="Введите кличку питомца"
                  />
                </div>

                {/* Species and Breed */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Вид <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    >
                      <option value="">Выберите вид</option>
                      <option value="Собака">Собака</option>
                      <option value="Кошка">Кошка</option>
                      <option value="Птица">Птица</option>
                      <option value="Грызун">Грызун</option>
                      <option value="Рептилия">Рептилия</option>
                      <option value="Другое">Другое</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Порода
                    </label>
                    <input
                      type="text"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                      placeholder="Например, Лабрадор"
                    />
                  </div>
                </div>

                {/* Gender and Birth Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Пол
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    >
                      <option value="">Не указан</option>
                      <option value="male">Самец</option>
                      <option value="female">Самка</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дата рождения
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Color and Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Окрас
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                      placeholder="Например, Рыжий"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Размер
                    </label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                    >
                      <option value="">Не указан</option>
                      <option value="small">Маленький</option>
                      <option value="medium">Средний</option>
                      <option value="large">Большой</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Medical Section */}
            {activeSection === 'medical' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="vaccinated"
                      checked={isVaccinated}
                      onChange={(e) => setIsVaccinated(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="vaccinated" className="flex-1">
                      <div className="font-medium text-gray-900">Привит</div>
                      <div className="text-sm text-gray-600">Питомец имеет все необходимые прививки</div>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="sterilized"
                      checked={isSterilized}
                      onChange={(e) => setIsSterilized(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sterilized" className="flex-1">
                      <div className="font-medium text-gray-900">Стерилизован</div>
                      <div className="text-sm text-gray-600">Питомец прошёл процедуру стерилизации</div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Номер чипа
                    </label>
                    <input
                      type="text"
                      value={chipNumber}
                      onChange={(e) => setChipNumber(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                      placeholder="Если питомец чипирован"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Укажите номер микрочипа, если питомец чипирован
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Photos Section */}
            {activeSection === 'photos' && (
              <>
                <div className="space-y-4">
                  {/* Upload Button */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAddPhoto}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-gray-600 cursor-pointer"
                    >
                      <CameraIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">Добавить фото</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Максимальный размер файла: 10MB. Форматы: JPG, PNG, GIF
                    </p>
                  </div>

                  {/* Photos Grid */}
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                          <img
                            src={photo}
                            alt={`Фото ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Error loading image:', photo);
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EФото%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePhotoFromGallery(index)}
                            className="absolute top-2 right-2 p-2 bg-red-500 rounded-full shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <XMarkIcon className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                      <CameraIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Нет дополнительных фото</p>
                      <p className="text-xs text-gray-400 mt-1">Добавьте фото, чтобы показать питомца с разных ракурсов</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Additional Section */}
            {activeSection === 'additional' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Статус
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  >
                    <option value="">Не указан</option>
                    <option value="home">Дома</option>
                    <option value="looking_for_home">Ищет дом</option>
                    <option value="lost">Потерялся</option>
                    <option value="found">Найден</option>
                    <option value="needs_help">Нужна помощь</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Текущий статус питомца
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
                disabled={saving || !name.trim() || !species}
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                style={{ backgroundColor: '#1B76FF' }}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
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
              type="button"
              onClick={() => setActiveSection('basic')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'basic'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Основная информация</p>
                  <p className="text-xs text-gray-600 mt-0.5">Фото, кличка, характеристики</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  name && species
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}></div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('medical')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'medical'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Медицинская информация</p>
                  <p className="text-xs text-gray-600 mt-0.5">Прививки, стерилизация</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('photos')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'photos'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Фотогалерея</p>
                  <p className="text-xs text-gray-600 mt-0.5">Дополнительные фото</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  photos.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('additional')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors mt-1 ${
                activeSection === 'additional'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Дополнительно</p>
                  <p className="text-xs text-gray-600 mt-0.5">Статус и особые отметки</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Section Description */}
        <div className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-100">
          {activeSection === 'basic' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">🐾 Основная информация</h3>
              <p className="text-xs text-blue-800 mb-3">
                Заполните базовую информацию о питомце и добавьте фото.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Кличка и вид - обязательные поля</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Добавьте качественное фото питомца</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Укажите породу для более точного поиска</span>
                </li>
              </ul>
            </>
          )}
          {activeSection === 'medical' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">💉 Медицинская информация</h3>
              <p className="text-xs text-blue-800 mb-3">
                Укажите медицинские данные питомца.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Отметьте, если питомец привит</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Укажите статус стерилизации</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Добавьте номер чипа, если есть</span>
                </li>
              </ul>
            </>
          )}
          {activeSection === 'photos' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">📸 Фотогалерея</h3>
              <p className="text-xs text-blue-800 mb-3">
                Добавьте дополнительные фото питомца.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Покажите питомца с разных ракурсов</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Добавьте фото в разных ситуациях</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Качественные фото помогут найти дом быстрее</span>
                </li>
              </ul>
            </>
          )}
          {activeSection === 'additional' && (
            <>
              <h3 className="text-sm font-semibold text-blue-900 mb-3">📋 Дополнительно</h3>
              <p className="text-xs text-blue-800 mb-3">
                Укажите текущий статус питомца.
              </p>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Статус помогает другим пользователям понять ситуацию</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>"Ищет дом" - для питомцев в поиске хозяев</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>"Потерялся" - если питомец пропал</span>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
