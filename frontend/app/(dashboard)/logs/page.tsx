'use client';

import { useState, useEffect } from 'react';
import { 
  DocumentDuplicateIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface AdminLog {
  id: number;
  admin_id: number;
  admin_email: string;
  action_type: string;
  target_type: string;
  target_id: number;
  target_name: string;
  details: string;
  ip_address: string;
  created_at: string;
}

interface UserActivityLog {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  action_type: string;
  target_type: string;
  target_id: number;
  metadata: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<'user' | 'admin'>('user');
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [userLogs, setUserLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, [activeTab]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'admin') {
        const response = await fetch('/api/admin/logs?limit=200', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          setAdminLogs(Array.isArray(data) ? data : []);
        }
      } else {
        const response = await fetch('/api/admin/user-activity?limit=200', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          setUserLogs(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      user_register: 'Регистрация',
      user_login: 'Вход',
      user_logout: 'Выход',
      post_create: 'Создание поста',
      post_update: 'Редактирование поста',
      post_delete: 'Удаление поста',
      comment_create: 'Комментарий',
      comment_update: 'Редактирование комментария',
      comment_delete: 'Удаление комментария',
      post_like: 'Лайк поста',
      post_unlike: 'Снятие лайка',
      friend_request_send: 'Заявка в друзья',
      friend_request_accept: 'Принятие заявки',
      report_create: 'Жалоба',
      pet_create: 'Добавление питомца',
      organization_create: 'Создание организации',
    };
    return labels[actionType] || actionType;
  };

  const getAdminActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      verify_user: 'Верификация пользователя',
      unverify_user: 'Снятие верификации',
      grant_role: 'Назначение роли',
      revoke_role: 'Отзыв роли',
      delete_post: 'Удаление поста',
      delete_user: 'Удаление пользователя',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('delete')) return 'text-red-600 bg-red-50';
    if (actionType.includes('create')) return 'text-green-600 bg-green-50';
    if (actionType.includes('update') || actionType.includes('edit')) return 'text-blue-600 bg-blue-50';
    if (actionType.includes('like')) return 'text-pink-600 bg-pink-50';
    if (actionType.includes('login') || actionType.includes('register')) return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredAdminLogs = adminLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.admin_email?.toLowerCase().includes(query) ||
      log.target_name?.toLowerCase().includes(query) ||
      log.action_type?.toLowerCase().includes(query)
    );
  });

  const filteredUserLogs = userLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.action_type?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <DocumentDuplicateIcon className="w-8 h-8 text-gray-600" />
            <h1 className="text-3xl font-bold text-gray-900">Логирование</h1>
          </div>
          <p className="text-gray-600">Просмотр активности пользователей и администраторов</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('user')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'user'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <UserGroupIcon className="w-5 h-5" />
                Активность пользователей
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-blue-100 text-blue-600">
                  {userLogs.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'admin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <ShieldCheckIcon className="w-5 h-5" />
                Действия администраторов
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
                  {adminLogs.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'user' ? "Поиск по пользователю или действию..." : "Поиск по администратору или действию..."}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {activeTab === 'user' ? 'Пользователь' : 'Администратор'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Действие
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Цель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeTab === 'user' ? (
                  filteredUserLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Логи не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredUserLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{log.user_name || 'Неизвестно'}</div>
                            <div className="text-gray-500 text-xs">{log.user_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                            {getUserActionLabel(log.action_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-gray-500">{log.target_type}</span>
                          {log.target_id && <span className="ml-1">#{log.target_id}</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip_address}
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  filteredAdminLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Логи не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredAdminLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.admin_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action_type)}`}>
                            {getAdminActionLabel(log.action_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <span className="font-medium">{log.target_name || `ID: ${log.target_id}`}</span>
                            <span className="text-gray-500 ml-2">({log.target_type})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip_address}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
