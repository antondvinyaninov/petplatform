/**
 * CityAutocomplete - компонент автокомплита городов через DaData API
 * 
 * Особенности:
 * - Поиск городов и населенных пунктов России через DaData
 * - Debouncing поиска (300ms) для оптимизации запросов
 * - Сохраняет полную информацию: "Город, Регион"
 * - Dropdown с подсказками (до 10 результатов)
 * - Закрывается при клике вне компонента
 * - Индикатор загрузки
 * 
 * Использование:
 * <CityAutocomplete
 *   value={location}
 *   onChange={(value) => setLocation(value)}
 *   placeholder="Москва"
 * />
 * 
 * Требования:
 * - NEXT_PUBLIC_DADATA_API_KEY в .env.local
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface DaDataSuggestion {
  value: string;
  data: {
    city?: string;
    settlement?: string;
    region?: string;
    region_type_full?: string; // "область", "республика", "край", "автономный округ"
  };
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CityAutocomplete({ value, onChange, placeholder = 'Москва', className = '' }: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Закрываем список при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Поиск городов через DaData
  const searchCities = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_DADATA_API_KEY;
    if (!apiKey) {
      console.error('❌ DaData API key not found. Please add NEXT_PUBLIC_DADATA_API_KEY to .env.local');
      console.error('Current env:', process.env.NEXT_PUBLIC_DADATA_API_KEY);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          count: 10,
          from_bound: { value: 'city' },
          to_bound: { value: 'settlement' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } else {
        console.error('❌ DaData API error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('❌ DaData search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Debounce поиска
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchCities(newValue);
    }, 300);
  };

  const selectCity = (suggestion: DaDataSuggestion) => {
    const cityName = suggestion.data.city || suggestion.data.settlement || suggestion.value;
    const region = suggestion.data.region;
    const regionType = suggestion.data.region_type_full;
    
    // Сохраняем в формате "Город, Регион область/республика/край"
    let fullLocation = cityName;
    if (region && region !== cityName) {
      fullLocation = regionType 
        ? `${cityName}, ${region} ${regionType.toLowerCase()}`
        : `${cityName}, ${region}`;
    }
    
    onChange(fullLocation);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-sm ${className}`}
          style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
          placeholder={placeholder}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        )}
      </div>

      {/* Список подсказок */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const cityName = suggestion.data.city || suggestion.data.settlement || suggestion.value;
            const region = suggestion.data.region;
            const regionType = suggestion.data.region_type_full;
            
            // Формируем полное название региона
            const fullRegion = region && regionType 
              ? `${region} ${regionType.toLowerCase()}`
              : region;

            return (
              <button
                key={index}
                type="button"
                onClick={() => selectCity(suggestion)}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cityName}</p>
                    {fullRegion && (
                      <p className="text-xs text-gray-500 truncate">{fullRegion}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
