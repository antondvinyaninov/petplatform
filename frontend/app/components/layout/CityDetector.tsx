'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DaDataSuggestion {
  value: string;
  data: {
    city?: string;
    settlement?: string;
    region_with_type?: string;
  };
}

export default function CityDetector() {
  const [city, setCity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Проверяем сохраненный город в localStorage
    const savedCity = localStorage.getItem('userCity');
    if (savedCity) {
      setCity(savedCity);
      setLoading(false);
      return;
    }

    // Определяем город по IP через DaData (как подсказку)
    const detectCity = async () => {
      try {
        const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/iplocate/address?ip=', {
          method: 'GET',
          headers: {
            'Authorization': 'Token 300ba9e25ef32f0d6ea7c41826b2255b138e19e2',
            'Content-Type': 'application/json',
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          const detectedCity = data.location?.data?.city || data.location?.data?.settlement;
          if (detectedCity) {
            // ✅ Не сохраняем автоматически, а показываем как подсказку
            setCity(detectedCity);
            setSearchQuery(detectedCity); // Подставляем в поиск
            setLoading(false);
            // ✅ Показываем модалку для подтверждения
            setShowModal(true);
            return;
          }
        }
      } catch (e) {
        console.log('DaData IP detection failed');
      }

      // Fallback на ip-api.com
      try {
        const res = await fetch('http://ip-api.com/json/?lang=ru');
        if (res.ok) {
          const data = await res.json();
          if (data.city) {
            // ✅ Не сохраняем автоматически, а показываем как подсказку
            setCity(data.city);
            setSearchQuery(data.city); // Подставляем в поиск
            setLoading(false);
            // ✅ Показываем модалку для подтверждения
            setShowModal(true);
            return;
          }
        }
      } catch (e) {
        console.log('ip-api.com failed');
      }

      // ✅ Если не удалось определить - показываем модалку
      setCity('Выберите город');
      setLoading(false);
      setShowModal(true);
    };

    detectCity();
  }, []);

  // Поиск городов через DaData
  const searchCities = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Authorization': 'Token 300ba9e25ef32f0d6ea7c41826b2255b138e19e2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          count: 10,
          from_bound: { value: 'city' },
          to_bound: { value: 'settlement' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (e) {
      console.error('DaData search failed', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchCities(value);
    }, 300);
  };

  const selectCity = (suggestion: DaDataSuggestion) => {
    const cityName = suggestion.data.city || suggestion.data.settlement || suggestion.value;
    setCity(cityName);
    localStorage.setItem('userCity', cityName);
    setShowModal(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-1 text-gray-500">
        <MapPinIcon className="w-4 h-4" strokeWidth={2} />
        <span className="text-sm">...</span>
      </div>
    );
  }

  return (
    <>
      <button
        className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
        onClick={() => setShowModal(true)}
      >
        <MapPinIcon className="w-4 h-4" strokeWidth={2} />
        <span className="text-sm font-medium">
          {city === 'Выберите город' ? city : `г. ${city}`}
        </span>
      </button>

      {/* Модальное окно выбора города */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Выберите ваш город</h3>
                {city !== 'Выберите город' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Мы определили: <span className="font-medium">{city}</span>. Это правильно?
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Кнопка подтверждения определенного города */}
              {city !== 'Выберите город' && !searchQuery && (
                <button
                  onClick={() => {
                    localStorage.setItem('userCity', city);
                    setShowModal(false);
                  }}
                  className="w-full mb-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Да, это мой город
                </button>
              )}
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Или начните вводить другой город..."
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                autoFocus
              />
              
              {searching && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Поиск...
                </div>
              )}
              
              {suggestions.length > 0 && (
                <div className="mt-4 max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectCity(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.data.city || suggestion.data.settlement}
                      </div>
                      <div className="text-xs text-gray-500">
                        {suggestion.data.region_with_type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {!searching && searchQuery && suggestions.length === 0 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Ничего не найдено
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
