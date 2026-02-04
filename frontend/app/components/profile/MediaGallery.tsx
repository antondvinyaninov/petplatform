'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { PhotoIcon, VideoCameraIcon, PlayIcon } from '@heroicons/react/24/outline';
import MediaLightbox from '../posts/MediaLightbox';

interface Media {
  id: number;
  url: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  media_type: string;
  width?: number;
  height?: number;
  uploaded_at: string;
}

interface MediaGalleryProps {
  userId: number;
  mediaType?: 'photo' | 'video' | 'all';
}

export default function MediaGallery({ userId, mediaType = 'all' }: MediaGalleryProps) {
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>(mediaType);

  useEffect(() => {
    loadAllMedia();
  }, [userId]);

  const loadAllMedia = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/media/user/${userId}`);
      
      if (response.success && response.data) {
        setAllMedia(Array.isArray(response.data) ? response.data : []);
      } else {
        setAllMedia([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки медиа:', error);
      setAllMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Всегда считаем от всех медиа
  const photos = allMedia.filter(m => m.media_type === 'photo');
  const videos = allMedia.filter(m => m.media_type === 'video');
  
  // Фильтруем для отображения
  const filteredMedia = filter === 'all' 
    ? allMedia 
    : filter === 'photo' 
      ? photos 
      : videos;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
      </div>
    );
  }

  if (filteredMedia.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          {filter === 'video' ? (
            <VideoCameraIcon className="w-8 h-8 text-gray-400" />
          ) : (
            <PhotoIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <p className="text-gray-500 text-sm">
          {filter === 'all' && 'Медиафайлы не найдены'}
          {filter === 'photo' && 'Фотографии не найдены'}
          {filter === 'video' && 'Видео не найдены'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Фильтры */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Все ({allMedia.length})
        </button>
        <button
          onClick={() => setFilter('photo')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'photo'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Фото ({photos.length})
        </button>
        <button
          onClick={() => setFilter('video')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'video'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Видео ({videos.length})
        </button>
      </div>

      {/* Галерея */}
      <div className="grid grid-cols-3 gap-2">
        {filteredMedia.map((item, index) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => setSelectedIndex(index)}
          >
            {item.media_type === 'video' ? (
              <>
                <video
                  src={`http://localhost:8000${item.url}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <PlayIcon className="w-6 h-6 text-gray-900 ml-1" />
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                  <VideoCameraIcon className="w-4 h-4 inline" />
                </div>
              </>
            ) : (
              <img
                src={`http://localhost:8000${item.url}`}
                alt={item.original_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            )}
            
            {/* Информация при наведении */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">{item.original_name}</p>
              <p className="text-white/80 text-xs">{formatFileSize(item.file_size)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox для просмотра */}
      {selectedIndex !== null && (
        <MediaLightbox
          media={filteredMedia.map(m => ({
            url: m.url,
            file_name: m.file_name,
            media_type: m.media_type,
          }))}
          initialIndex={selectedIndex}
          isOpen={true}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
}
