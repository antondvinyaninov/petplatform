'use client';

import { useEffect, useRef } from 'react';

interface MiniMapProps {
  lat: number;
  lon: number;
  locationName?: string;
  height?: string;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function MiniMap({ lat, lon, locationName, height = '200px' }: MiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Проверяем загружен ли уже API
    if (window.ymaps) {
      initMap();
      return;
    }

    // Проверяем не загружается ли уже скрипт
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
    if (existingScript) {
      existingScript.addEventListener('load', initMap);
      return () => {
        existingScript.removeEventListener('load', initMap);
      };
    }

    // Загружаем Яндекс.Карты API
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=8cf445c5-b490-40a5-96c4-dd72c041419f&lang=ru_RU`;
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lon]);

  const initMap = () => {
    if (!window.ymaps || !mapRef.current) return;

    window.ymaps.ready(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const map = new window.ymaps.Map(mapRef.current, {
          center: [lat, lon],
          zoom: 14,
          controls: []
        });

        // Добавляем метку
        const placemark = new window.ymaps.Placemark([lat, lon], {
          balloonContent: locationName || 'Местоположение',
        }, {
          preset: 'islands#redDotIcon',
        });

        map.geoObjects.add(placemark);
        mapInstanceRef.current = map;

        // Отключаем взаимодействие (только просмотр)
        map.behaviors.disable('drag');
        map.behaviors.disable('scrollZoom');
      } catch (error) {
        console.error('❌ Ошибка инициализации мини-карты:', error);
      }
    });
  };

  return (
    <div 
      ref={mapRef} 
      style={{ width: '100%', height }}
      className="rounded-lg overflow-hidden"
    />
  );
}
