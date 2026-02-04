'use client';

type PostType = 'all' | 'post' | 'sale' | 'lost' | 'found' | 'help';

const filters = [
  { id: 'all' as PostType, label: 'Все', icon: '📋' },
  { id: 'post' as PostType, label: 'Посты', icon: '📝' },
  { id: 'sale' as PostType, label: 'Объявления', icon: '📢' },
  { id: 'lost' as PostType, label: 'Потеряшки', icon: '🐾' },
  { id: 'found' as PostType, label: 'Найдены', icon: '💚' },
  { id: 'help' as PostType, label: 'Помощь', icon: '🆘' },
];

interface FeedFiltersProps {
  activeFilter: PostType;
  onFilterChange: (filter: PostType) => void;
}

export default function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Фильтры ленты</h3>
      <div className="space-y-1">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === filter.id
                ? 'text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={activeFilter === filter.id ? { backgroundColor: '#1B76FF' } : {}}
          >
            <span>{filter.icon}</span>
            <span>{filter.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
