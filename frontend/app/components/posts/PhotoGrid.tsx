'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Photo {
  url: string;
  file_name?: string;
  type?: string;
  media_type?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onClick?: () => void;
}

export default function PhotoGrid({ photos, onClick }: PhotoGridProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!photos || photos.length === 0) return null;

  const getPhotoUrl = (url: string) => {
    return url.startsWith('http') ? url : `http://localhost:8000${url}`;
  };

  const goToPrevious = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  // Обработка клавиш стрелок
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length]);

  // Обработка свайпов на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const currentPhoto = photos[currentIndex];
  const isVideo = currentPhoto.type === 'video' || currentPhoto.media_type === 'video';

  return (
    <div 
      ref={containerRef}
      className="relative aspect-square overflow-hidden cursor-pointer group bg-white dark:bg-gray-900"
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Media Content */}
      {isVideo ? (
        <video
          src={getPhotoUrl(currentPhoto.url)}
          className="w-full h-full object-contain"
          controls
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          style={{
            backgroundImage: `url(${getPhotoUrl(currentPhoto.url)})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            width: '100%',
            height: '100%'
          }}
        />
      )}
      {/* Счетчик фото */}
      {photos.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Стрелки навигации */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Предыдущее фото"
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Следующее фото"
          >
            <ChevronRightIcon className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Точки навигации */}
      {photos.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToSlide(index, e)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/60 hover:bg-white/80'
              }`}
              aria-label={`Перейти к фото ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
