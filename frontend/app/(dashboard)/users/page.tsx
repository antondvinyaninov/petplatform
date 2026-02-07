'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UsersIcon, 
  CheckBadgeIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeIconSolid } from '@heroicons/react/24/solid';

interface User {
  id: number;
  name: string;
  last_name?: string;
  email: string;
  avatar?: string;
  verified: boolean;
  verified_at?: string;
  created_at: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filterVerified]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/gateway/admin/users', {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        // API возвращает {success: true, data: [...]}
        const data = result.data || result;
        // Проверяем что данные - массив
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Фильтр по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Фильтр по верификации
    if (filterVerified === 'verified') {
      filtered = filtered.filter(user => user.verified);
    } else if (filterVerified === 'unverified') {
      filtered = filtered.filter(user => !user.verified);
    }

    setFilteredUsers(filtered);
  };

  const handleVerify = async (userId: number) => {
    if (!confirm('Вы уверены, что хотите верифицировать этого пользователя?')) return;

    try {
      const response = await fetch('/api/gateway/admin/verification/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('Пользователь успешно верифицирован!');
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось верифицировать пользователя'}`);
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('Ошибка при верификации пользователя');
    }
  };

  const handleUnverify = async (userId: number) => {
    if (!confirm('Вы уверены, что хотите снять верификацию с этого пользователя?')) return;

    try {
      const response = await fetch('/api/gateway/admin/verification/unverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        alert('Верификация снята!');
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось снять верификацию'}`);
      }
    } catch (error) {
      console.error('Error unverifying user:', error);
      alert('Ошибка при снятии верификации');
    }
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

  const verifiedCount = users.filter(u => u.verified).length;
  const unverifiedCount = users.filter(u => !u.verified).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Управление пользователями</h1>
          </div>
          <p className="text-gray-600">Верификация и управление пользователями платформы</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего пользователей</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <UsersIcon className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Верифицированные</p>
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              </div>
              <CheckBadgeIconSolid className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Не верифицированные</p>
                <p className="text-2xl font-bold text-gray-600">{unverifiedCount}</p>
              </div>
              <CheckBadgeIcon className="w-10 h-10 text-gray-400" />
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
                  placeholder="Поиск по имени или email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <button
                onClick={() => setFilterVerified('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterVerified === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Все ({users.length})
              </button>
              <button
                onClick={() => setFilterVerified('verified')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterVerified === 'verified'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✓ Верифицированные ({verifiedCount})
              </button>
              <button
                onClick={() => setFilterVerified('unverified')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterVerified === 'unverified'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Не верифицированные ({unverifiedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата регистрации
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr 
                    key={user.id} 
                    onClick={() => router.push(`/users/${user.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {user.name} {user.last_name}
                            </p>
                            {user.verified && (
                              <CheckBadgeIconSolid className="w-5 h-5 text-blue-500" title="Проверенный пользователь" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.verified ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Верифицирован
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Не верифицирован
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`http://localhost:3000/${user.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Профиль
                        </a>
                        {user.verified ? (
                          <button
                            onClick={() => handleUnverify(user.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Снять верификацию
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(user.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            Верифицировать
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
