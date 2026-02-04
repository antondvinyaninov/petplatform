'use client';

import {
  SparklesIcon,
  UserGroupIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface FeedFiltersProps {
  activeFilter: 'for-you' | 'following' | 'city';
  onFilterChange: (filter: 'for-you' | 'following' | 'city') => void;
}

export default function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
  const filters = [
    { id: 'for-you' as const, label: 'Для вас', icon: SparklesIcon },
    { id: 'following' as const, label: 'Подписки', icon: UserGroupIcon },
    { id: 'city' as const, label: 'Мой город', icon: MapPinIcon },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <h3 className="font-semibold text-gray-900 mb-2 px-2 text-sm">Фильтры ленты</h3>
      <div className="space-y-0">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
              activeFilter === filter.id
                ? 'bg-gray-100'
                : 'hover:bg-gray-50'
            }`}
          >
            <filter.icon 
              className="w-5 h-5 flex-shrink-0 text-gray-600" 
              strokeWidth={2} 
            />
            <span className="text-[13px] font-medium text-gray-700">
              {filter.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
