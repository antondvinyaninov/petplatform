'use client';

import { useState, useRef, useEffect } from 'react';
import { BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface DaDataOrganization {
  value: string;
  unrestricted_value: string;
  data: {
    inn?: string;
    ogrn?: string;
    kpp?: string;
    name?: {
      full_with_opf?: string;
      short_with_opf?: string;
    };
    address?: {
      value?: string;
      unrestricted_value?: string;
      data?: {
        postal_code?: string;
        country?: string;
        region?: string;
        region_with_type?: string;
        city?: string;
        city_with_type?: string;
        settlement?: string;
        settlement_with_type?: string;
        street?: string;
        street_with_type?: string;
        house?: string;
        house_type?: string;
        flat?: string;
        flat_type?: string;
        geo_lat?: string;
        geo_lon?: string;
      };
    };
    phones?: Array<{
      value?: string;
      type?: string;
    }>;
    emails?: Array<{
      value?: string;
    }>;
    management?: {
      name?: string;
      post?: string;
    };
    state?: {
      status?: string;
      liquidation_date?: string;
      registration_date?: string;
    };
    type?: string;
    opf?: {
      short?: string;
      full?: string;
    };
  };
}

interface OrganizationSearchProps {
  onSelect?: (org: DaDataOrganization) => void;
  placeholder?: string;
}

export default function OrganizationSearch({ onSelect, placeholder = 'Поиск организации по ИНН, ОГРН или названию...' }: OrganizationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DaDataOrganization[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<DaDataOrganization | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Поиск организаций через DaData
  const searchOrganizations = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party', {
        method: 'POST',
        headers: {
          'Authorization': 'Token 300ba9e25ef32f0d6ea7c41826b2255b138e19e2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          count: 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } else {
        console.error('DaData error:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('DaData organization search failed', e);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedOrg(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchOrganizations(value);
    }, 300);
  };

  const selectOrganization = (org: DaDataOrganization) => {
    setSelectedOrg(org);
    setSearchQuery(org.data.name?.short_with_opf || org.value);
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSelect) {
      onSelect(org);
    }
  };

  const clearSelection = () => {
    setSelectedOrg(null);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'ACTIVE') {
      return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Действующая</span>;
    }
    if (status === 'LIQUIDATING') {
      return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Ликвидируется</span>;
    }
    if (status === 'LIQUIDATED') {
      return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Ликвидирована</span>;
    }
    return null;
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
        />
        {(searchQuery || selectedOrg) && (
          <button
            onClick={clearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Выпадающий список подсказок */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {searching && (
            <div className="p-4 text-center text-sm text-gray-500">
              Поиск...
            </div>
          )}
          
          {!searching && suggestions.length > 0 && (
            <div className="py-2">
              {suggestions.map((org, index) => (
                <button
                  key={index}
                  onClick={() => selectOrganization(org)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-gray-900 text-sm">
                      {org.data.name?.short_with_opf || org.value}
                    </div>
                    {getStatusBadge(org.data.state?.status)}
                  </div>
                  
                  <div className="space-y-0.5 text-xs text-gray-600">
                    {org.data.inn && (
                      <div>ИНН: <span className="font-mono">{org.data.inn}</span></div>
                    )}
                    {org.data.ogrn && (
                      <div>ОГРН: <span className="font-mono">{org.data.ogrn}</span></div>
                    )}
                    {org.data.address?.value && (
                      <div className="text-gray-500 truncate">📍 {org.data.address.value}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {!searching && searchQuery && suggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Организации не найдены
            </div>
          )}
        </div>
      )}
    </div>
  );
}
