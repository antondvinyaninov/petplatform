'use client';

import { useEffect, useRef, useState } from 'react';

interface YandexMapProps {
  address: string;
  organizationName?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
  height?: string;
}

declare global {
  interface Window {
    ymaps: any;
    yandexMapsLoaded?: boolean;
  }
}

export default function YandexMap({ 
  address,
  organizationName,
  latitude,
  longitude,
  zoom = 16,
  height = '400px'
}: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const createMapWithCoords = (coords: [number, number]) => {
      if (!mounted || !mapRef.current) return;

      try {
        // Уничтожаем старую карту если есть
        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
          mapInstanceRef.current = null;
        }

        // Создаем карту
        mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
          center: coords,
          zoom: zoom,
          controls: ['zoomControl', 'fullscreenControl'],
        });

        // Добавляем метку
        const placemark = new window.ymaps.Placemark(
          coords,
          {
            balloonContentHeader: organizationName || 'Организация',
            balloonContentBody: address,
            hintContent: organizationName || 'Местоположение',
          },
          {
            preset: 'islands#redDotIcon',
          }
        );

        mapInstanceRef.current.geoObjects.add(placemark);
        setLoading(false);
      } catch (err) {
        console.error('Map creation error:', err);
        setError('Ошибка создания карты');
        setLoading(false);
      }
    };

    const initMap = () => {
      if (!mounted || !mapRef.current) return;

      // Геокодируем адрес через Яндекс.Карты
      window.ymaps.geocode(address, {
        results: 1,
      }).then((result: any) => {
        if (!mounted) return;

        const firstGeoObject = result.geoObjects.get(0);
        if (firstGeoObject) {
          const coords = firstGeoObject.geometry.getCoordinates();
          createMapWithCoords(coords);
        } else {
          // Fallback на координаты из DaData
          if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
            createMapWithCoords([latitude, longitude]);
          } else {
            setError('Не удалось определить координаты');
            setLoading(false);
          }
        }
      }).catch((err: any) => {
        console.error('Geocoding error:', err);
        if (!mounted) return;
        
        // Fallback на координаты из DaData
        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
          createMapWithCoords([latitude, longitude]);
        } else {
          setError('Ошибка геокодирования');
          setLoading(false);
        }
      });
    };

    // Загружаем скрипт Яндекс.Карт
    const loadYandexMaps = () => {
      if (window.ymaps && window.yandexMapsLoaded) {
        window.ymaps.ready(() => {
          if (mounted) initMap();
        });
        return;
      }

      const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
      
      if (existingScript) {
        if (window.ymaps) {
          window.yandexMapsLoaded = true;
          window.ymaps.ready(() => {
            if (mounted) initMap();
          });
        } else {
          existingScript.addEventListener('load', () => {
            window.yandexMapsLoaded = true;
            if (window.ymaps && mounted) {
              window.ymaps.ready(() => {
                if (mounted) initMap();
              });
            }
          });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=ece8ef8e-8782-426f-951d-79e965468547&lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        window.yandexMapsLoaded = true;
        if (window.ymaps && mounted) {
          window.ymaps.ready(() => {
            if (mounted) initMap();
          });
        }
      };
      script.onerror = () => {
        setError('Не удалось загрузить карты');
        setLoading(false);
      };
      document.body.appendChild(script);
    };

    loadYandexMaps();

    // Cleanup
    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [address, organizationName, latitude, longitude, zoom]);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Div для карты - всегда присутствует */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden border border-gray-200"
      />
      
      {/* Оверлей с загрузкой */}
      {loading && (
        <div className="absolute inset-0 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#1B76FF' }}></div>
            <p className="text-sm text-gray-600">Загрузка карты...</p>
          </div>
        </div>
      )}
      
      {/* Оверлей с ошибкой */}
      {error && (
        <div className="absolute inset-0 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-600">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
