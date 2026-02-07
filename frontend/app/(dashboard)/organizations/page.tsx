'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface Organization {
  id: number;
  name: string;
  type: string;
  city: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  logo: string;
  created_at: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [organizations, searchQuery, filterType]);

  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/gateway/organizations/all', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setOrganizations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...organizations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(query) ||
        org.city?.toLowerCase().includes(query) ||
        org.region?.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(org => org.type === filterType);
    }

    setFilteredOrgs(filtered);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shelter: 'Приют',
      clinic: 'Ветклиника',
      fund: 'Фонд',
      volunteer: 'Волонтёрская организация',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      shelter: 'bg-green-100 text-green-800',
      clinic: 'bg-purple-100 text-purple-800',
      fund: 'bg-blue-100 text-blue-800',
      volunteer: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  const shelterCount = organizations.filter(o => o.type === 'shelter').length;
  const clinicCount = organizations.filter(o => o.type === 'clinic').length;
  const fundCount = organizations.filter(o => o.type === 'fund').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <BuildingOfficeIcon className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Управление организациями</h1>
          </div>
          <p className="text-gray-600">Просмотр и управление организациями платформы</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего организаций</p>
                <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
              </div>
              <BuildingOfficeIcon className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Приюты</p>
                <p className="text-2xl font-bold text-green-600">{shelterCount}</p>
              </div>
              <span className="text-4xl">🏠</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ветклиники</p>
                <p className="text-2xl font-bold text-purple-600">{clinicCount}</p>
              </div>
              <span className="text-4xl">🏥</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Фонды</p>
                <p className="text-2xl font-bold text-blue-600">{fundCount}</p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или городу..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Все ({organizations.length})
              </button>
              <button
                onClick={() => setFilterType('shelter')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'shelter'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Приюты ({shelterCount})
              </button>
              <button
                onClick={() => setFilterType('clinic')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'clinic'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Клиники ({clinicCount})
              </button>
              <button
                onClick={() => setFilterType('fund')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterType === 'fund'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Фонды ({fundCount})
              </button>
            </div>
          </div>
        </div>

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrgs.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Организации не найдены</p>
            </div>
          ) : (
            filteredOrgs.map(org => (
              <div 
                key={org.id} 
                onClick={() => router.push(`/organizations/${org.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{org.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(org.type)}`}>
                      {getTypeLabel(org.type)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {org.city && (
                    <p className="text-sm text-gray-600">
                      📍 {org.city}, {org.region}
                    </p>
                  )}
                  {org.phone && (
                    <p className="text-sm text-gray-600">
                      📞 {org.phone}
                    </p>
                  )}
                  {org.email && (
                    <p className="text-sm text-gray-600">
                      ✉️ {org.email}
                    </p>
                  )}
                </div>

                {org.description && (
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                    {org.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Создана: {formatDate(org.created_at)}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={`http://localhost:3000/org/${org.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Просмотр"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </a>
                    <a
                      href={`http://localhost:3000/org/${org.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
