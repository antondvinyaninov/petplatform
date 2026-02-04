'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lon: number; name: string }) => void;
  onClose: () => void;
  initialLocation?: { lat: number; lon: number; name: string };
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function LocationPicker({ onLocationSelect, onClose, initialLocation }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);

  useEffect(() => {
    // Проверяем загружен ли уже API
    if (window.ymaps) {
      initMap();
      return;
    }

    // Проверяем не загружается ли уже скрипт
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
    if (existingScript) {
      // Скрипт уже загружается, ждём его загрузки
      existingScript.addEventListener('load', initMap);
      return () => {
        existingScript.removeEventListener('load', initMap);
      };
    }

    // Загружаем Яндекс.Карты API
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=8cf445c5-b490-40a5-96c4-dd72c041419f&lang=ru_RU`;
    script.async = true;
    
    script.onload = () => {
      initMap();
    };

    script.onerror = () => {
      console.error('❌ Не удалось загрузить Яндекс.Карты');
    };

    document.head.appendChild(script);

    return () => {
      // Очищаем карту при размонтировании
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!window.ymaps || !mapRef.current) return;

    window.ymaps.ready(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // Определяем начальный центр карты
        const center = initialLocation 
          ? [initialLocation.lat, initialLocation.lon]
          : [55.7558, 37.6173]; // Москва по умолчанию

        // Создаём карту
        const map = new window.ymaps.Map(mapRef.current, {
          center: center,
          zoom: initialLocation ? 15 : 10,
          controls: ['zoomControl', 'fullscreenControl', 'geolocationControl', 'searchControl']
        });

        mapInstanceRef.current = map;

        // Если есть начальное местоположение - добавляем метку
        if (initialLocation) {
          addPlacemark(initialLocation.lat, initialLocation.lon, initialLocation.name);
        }

        // Обработчик клика по карте
        map.events.add('click', async (e: any) => {
          const coords = e.get('coords');
          const lat = coords[0];
          const lon = coords[1];

          // Получаем адрес по координатам
          setLoading(true);
          try {
            const geocoder = window.ymaps.geocode([lat, lon]);
            geocoder.then((res: any) => {
              const firstGeoObject = res.geoObjects.get(0);
              const locationName = firstGeoObject.getAddressLine();
              
              setSelectedLocation({ lat, lon, name: locationName });
              addPlacemark(lat, lon, locationName);
              setLoading(false);
            });
          } catch (error) {
            console.error('Ошибка геокодирования:', error);
            setSelectedLocation({ lat, lon, name: 'Выбранное место' });
            addPlacemark(lat, lon, 'Выбранное место');
            setLoading(false);
          }
        });

      } catch (error) {
        console.error('❌ Ошибка инициализации карты:', error);
      }
    });
  };

  const addPlacemark = (lat: number, lon: number, name: string) => {
    if (!mapInstanceRef.current) return;

    // Удаляем старую метку если есть
    if (placemarkRef.current) {
      mapInstanceRef.current.geoObjects.remove(placemarkRef.current);
    }

    // Создаём новую метку
    const placemark = new window.ymaps.Placemark([lat, lon], {
      balloonContent: name,
      hintContent: 'Выбранное местоположение'
    }, {
      preset: 'islands#redDotIcon',
      draggable: true
    });

    // Обработчик перетаскивания метки
    placemark.events.add('dragend', async () => {
      const coords = placemark.geometry.getCoordinates();
      const newLat = coords[0];
      const newLon = coords[1];

      setLoading(true);
      try {
        const geocoder = window.ymaps.geocode([newLat, newLon]);
        geocoder.then((res: any) => {
          const firstGeoObject = res.geoObjects.get(0);
          const locationName = firstGeoObject.getAddressLine();
          
          setSelectedLocation({ lat: newLat, lon: newLon, name: locationName });
          placemark.properties.set('balloonContent', locationName);
          setLoading(false);
        });
      } catch (error) {
        console.error('Ошибка геокодирования:', error);
        setSelectedLocation({ lat: newLat, lon: newLon, name: 'Выбранное место' });
        setLoading(false);
      }
    });

    mapInstanceRef.current.geoObjects.add(placemark);
    placemarkRef.current = placemark;

    // Открываем балун
    placemark.balloon.open();
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setGettingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Центрируем карту на текущем местоположении
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter([lat, lon], 15);
        }

        // Получаем адрес
        setLoading(true);
        try {
          const geocoder = window.ymaps.geocode([lat, lon]);
          geocoder.then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);
            const locationName = firstGeoObject.getAddressLine();
            
            setSelectedLocation({ lat, lon, name: locationName });
            addPlacemark(lat, lon, locationName);
            setLoading(false);
            setGettingCurrentLocation(false);
          });
        } catch (error) {
          console.error('Ошибка геокодирования:', error);
          setSelectedLocation({ lat, lon, name: 'Моё местоположение' });
          addPlacemark(lat, lon, 'Моё местоположение');
          setLoading(false);
          setGettingCurrentLocation(false);
        }
      },
      (error) => {
        console.error('Ошибка получения геолокации:', error);
        alert('Не удалось получить ваше местоположение. Проверьте разрешения браузера.');
        setGettingCurrentLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    } else {
      alert('Выберите местоположение на карте');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[700px] max-h-[90vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Выберите местоположение
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Кликните на карту или перетащите метку
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            title="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Карта */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full"></div>
          
          {/* Кнопка "Моё местоположение" */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={gettingCurrentLocation}
            className="absolute top-4 right-4 px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {gettingCurrentLocation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span>Определение...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Моё местоположение</span>
              </>
            )}
          </button>

          {/* Индикатор загрузки */}
          {loading && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm text-gray-700">Определение адреса...</span>
              </div>
            </div>
          )}
        </div>

        {/* Выбранное местоположение и кнопки */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {selectedLocation ? (
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-900 mb-1">
                {selectedLocation.name}
              </div>
              <div className="text-xs text-gray-500">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lon.toFixed(6)}
              </div>
            </div>
          ) : (
            <div className="mb-3 text-sm text-gray-500">
              Местоположение не выбрано
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Выбрать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
