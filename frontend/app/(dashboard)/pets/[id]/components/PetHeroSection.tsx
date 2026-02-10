'use client';

import { useState } from 'react';

interface PetHeroSectionProps {
  pet: any;
  age: { years: number; months: number } | null;
}

export default function PetHeroSection({ pet, age }: PetHeroSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(pet.photo_url || '');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📸 [PhotoUpload] Starting upload:', file.name, file.size, 'bytes');

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (макс 15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert('Размер файла не должен превышать 15MB');
      return;
    }

    try {
      setIsUploading(true);

      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('photo', file);

      console.log('📤 [PhotoUpload] Sending to:', `/api/admin/pets/${pet.id}/photo`);

      // Отправляем на сервер
      const response = await fetch(`/api/admin/pets/${pet.id}/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      console.log('📥 [PhotoUpload] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [PhotoUpload] Response data:', data);
        
        if (data.success && data.photo_url) {
          console.log('🖼️ [PhotoUpload] New photo URL:', data.photo_url);
          setPhotoUrl(data.photo_url);
          alert('Фото успешно загружено!');
        } else {
          console.error('❌ [PhotoUpload] Invalid response:', data);
          alert('Ошибка: ' + (data.message || 'Не удалось загрузить фото'));
        }
      } else {
        const data = await response.json();
        console.error('❌ [PhotoUpload] Error response:', data);
        alert('Ошибка: ' + (data.error || 'Не удалось загрузить фото'));
      }
    } catch (err) {
      console.error('❌ [PhotoUpload] Exception:', err);
      alert('Ошибка загрузки фото');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-8 text-white">
      <div className="flex items-center gap-6">
        {/* Фото питомца */}
        <div className="flex-shrink-0 relative group">
          <div className="w-48 h-48 bg-white/20 rounded-xl flex items-center justify-center text-8xl backdrop-blur-sm border-4 border-white/30 overflow-hidden">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={pet.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{pet.species_name === 'Собака' ? '🐕' : '🐈'}</span>
            )}
          </div>
          
          {/* Кнопка загрузки фото */}
          <label 
            htmlFor="photo-upload" 
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">{isUploading ? 'Загрузка...' : 'Изменить фото'}</span>
            </div>
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={isUploading}
            className="hidden"
          />
        </div>

        {/* Основная информация */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">{pet.name}</h1>
            <span className="text-2xl">
              {pet.gender === 'male' ? '♂' : '♀'}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-4 text-lg">
            <div className="flex items-center gap-2">
              <span className="opacity-80">Вид:</span>
              <span className="font-semibold">{pet.species_name}</span>
            </div>
            
            {pet.breed_name && (
              <div className="flex items-center gap-2">
                <span className="opacity-80">•</span>
                <span className="opacity-80">Порода:</span>
                <span className="font-semibold">{pet.breed_name}</span>
              </div>
            )}
            
            {age && (
              <div className="flex items-center gap-2">
                <span className="opacity-80">•</span>
                <span className="opacity-80">Возраст:</span>
                <span className="font-semibold">
                  {age.years} {age.years === 1 ? 'год' : age.years < 5 ? 'года' : 'лет'} {age.months} {age.months === 1 ? 'мес' : 'мес'}
                </span>
              </div>
            )}
          </div>

          {/* Дополнительные бейджи */}
          <div className="flex gap-2 mt-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
              {pet.relationship === 'owner' ? '👤 Владелец' : '🔧 Куратор'}
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
              ID: #{pet.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
