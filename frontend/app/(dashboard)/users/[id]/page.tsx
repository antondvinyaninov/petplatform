'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  UserIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  ClockIcon,
  CogIcon,
  CheckBadgeIcon as CheckBadgeIconOutline,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon as CheckBadgeIconSolid } from '@heroicons/react/24/solid';

interface User {
  id: number;
  name: string;
  last_name?: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  phone?: string;
  verified: boolean;
  verified_at?: string;
  created_at: string;
}

type TabType = 'logs' | 'pets' | 'posts' | 'settings';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  useEffect(() => {
    loadUser();
  }, [params.id]);

  const loadUser = async () => {
    try {
      const response = await fetch(`/api/gateway/admin/users/${params.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.data || result);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Пользователь не найден</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push('/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.name} {user.last_name}
              {user.verified && (
                <CheckBadgeIconSolid className="inline w-7 h-7 text-blue-500 ml-2" />
              )}
            </h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClockIcon className="w-5 h-5 inline mr-2" />
              Логирование
            </button>
            <button
              onClick={() => setActiveTab('pets')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'pets'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserIcon className="w-5 h-5 inline mr-2" />
              Питомцы
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5 inline mr-2" />
              Посты
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CogIcon className="w-5 h-5 inline mr-2" />
              Настройки
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'logs' && <LogsTab userId={user.id} />}
          {activeTab === 'pets' && <PetsTab userId={user.id} />}
          {activeTab === 'posts' && <PostsTab userId={user.id} />}
          {activeTab === 'settings' && <SettingsTab user={user} onUpdate={loadUser} />}
        </div>
      </div>
    </div>
  );
}

// Компонент вкладки "Логирование"
function LogsTab({ userId }: { userId: number }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const loadLogs = async () => {
    try {
      const response = await fetch(`/api/gateway/admin/users/logs/${userId}?limit=50`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setLogs(result.data || []);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">История действий</h2>
      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Нет записей в логе</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{log.action_type}</div>
                {log.action_details && (
                  <div className="text-sm text-gray-600">{log.action_details}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(log.created_at).toLocaleString('ru-RU')} • IP: {log.ip_address}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Компонент вкладки "Питомцы"
function PetsTab({ userId }: { userId: number }) {
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPets();
  }, [userId]);

  const loadPets = async () => {
    try {
      const response = await fetch(`/api/gateway/admin/pets/user/${userId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setPets(result.data || []);
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Питомцы ({pets.length})</h2>
      {pets.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Нет питомцев</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <div key={pet.id} className="border border-gray-200 rounded-lg p-4">
              <div className="font-medium text-gray-900">{pet.name}</div>
              <div className="text-sm text-gray-600">{pet.species} • {pet.breed}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Компонент вкладки "Посты"
function PostsTab({ userId }: { userId: number }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [userId]);

  const loadPosts = async () => {
    try {
      const response = await fetch(`/api/gateway/admin/posts/user/${userId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setPosts(result.data || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Загрузка...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Посты ({posts.length})</h2>
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Нет постов</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-lg p-4">
              <div className="text-gray-900">{post.content}</div>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(post.created_at).toLocaleString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Компонент вкладки "Настройки"
function SettingsTab({ user, onUpdate }: { user: User; onUpdate: () => void }) {
  const [storage, setStorage] = useState<any>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    loadStorage();
  }, [user.id]);

  const loadStorage = async () => {
    try {
      const response = await fetch(`/api/gateway/admin/users/storage/${user.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        setStorage(result.data);
      }
    } catch (error) {
      console.error('Error loading storage:', error);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      const response = await fetch('/api/gateway/admin/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: user.id }),
      });

      if (response.ok) {
        alert('Пользователь верифицирован');
        onUpdate();
      }
    } catch (error) {
      console.error('Error verifying user:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Верификация</h2>
        <button
          onClick={handleVerify}
          disabled={user.verified}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {user.verified ? 'Верифицирован' : 'Верифицировать'}
        </button>
      </div>

      {/* Управление ролями - загружается независимо */}
      <RolesManager userId={user.id} />

      {/* Использование хранилища */}
      {storageLoading ? (
        <div className="text-center py-4">Загрузка статистики...</div>
      ) : storage ? (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Использование хранилища</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Посты</div>
              <div className="text-2xl font-bold">{storage.posts_count}</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Питомцы</div>
              <div className="text-2xl font-bold">{storage.pets_count}</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Медиа файлы</div>
              <div className="text-2xl font-bold">{storage.media_count}</div>
              <div className="text-xs text-gray-500">{storage.media_size_mb.toFixed(2)} MB</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Друзья</div>
              <div className="text-2xl font-bold">{storage.friends_count}</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Организации</div>
              <div className="text-2xl font-bold">{storage.organizations_count}</div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Комментарии</div>
              <div className="text-2xl font-bold">{storage.comments_count}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Компонент управления ролями
function RolesManager({ userId }: { userId: number }) {
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const [rolesRes, availableRes] = await Promise.all([
        fetch(`/api/gateway/admin/roles/user/${userId}`, { credentials: 'include' }),
        fetch('/api/gateway/admin/roles/available', { credentials: 'include' }),
      ]);

      if (rolesRes.ok) {
        const result = await rolesRes.json();
        setUserRoles(result.data || []);
      }

      if (availableRes.ok) {
        const result = await availableRes.json();
        setAvailableRoles(result.data || []);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantRole = async () => {
    if (!selectedRole) return;

    try {
      const response = await fetch('/api/gateway/admin/roles/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          role: selectedRole,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        alert('Роль успешно назначена');
        setShowAddModal(false);
        setSelectedRole('');
        setNotes('');
        loadData();
      } else {
        const error = await response.text();
        alert(`Ошибка: ${error}`);
      }
    } catch (error) {
      console.error('Error granting role:', error);
      alert('Ошибка при назначении роли');
    }
  };

  const handleRevokeRole = async (role: string) => {
    if (!confirm(`Вы уверены, что хотите отозвать роль "${role}"?`)) return;

    try {
      const response = await fetch('/api/gateway/admin/roles/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          role: role,
        }),
      });

      if (response.ok) {
        alert('Роль успешно отозвана');
        loadData();
      } else {
        const error = await response.text();
        alert(`Ошибка: ${error}`);
      }
    } catch (error) {
      console.error('Error revoking role:', error);
      alert('Ошибка при отзыве роли');
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      user: 'bg-gray-100 text-gray-800',
      volunteer: 'bg-green-100 text-green-800',
      shelter_admin: 'bg-blue-100 text-blue-800',
      clinic_admin: 'bg-purple-100 text-purple-800',
      moderator: 'bg-orange-100 text-orange-800',
      superadmin: 'bg-red-100 text-red-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: 'Пользователь',
      volunteer: 'Волонтёр',
      shelter_admin: 'Администратор приюта',
      clinic_admin: 'Администратор ветклиники',
      moderator: 'Модератор',
      superadmin: 'Суперадминистратор',
    };
    return labels[role] || role;
  };

  if (loading) return <div className="text-center py-4">Загрузка ролей...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Роли пользователя</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Добавить роль
        </button>
      </div>

      {userRoles.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Нет назначенных ролей</p>
      ) : (
        <div className="space-y-2">
          {userRoles.map((userRole) => (
            <div
              key={userRole.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userRole.role)}`}>
                    {getRoleLabel(userRole.role)}
                  </span>
                </div>
                {userRole.notes && (
                  <div className="text-sm text-gray-600 mt-2">{userRole.notes}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Назначена: {new Date(userRole.granted_at).toLocaleString('ru-RU')}
                </div>
              </div>
              {userRole.role !== 'user' && (
                <button
                  onClick={() => handleRevokeRole(userRole.role)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Отозвать
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления роли */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Добавить роль</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите роль
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Выберите роль --</option>
                  {availableRoles
                    .filter((role) => !userRoles.some((ur) => ur.role === role.value))
                    .map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Примечание (опционально)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Причина назначения роли..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGrantRole}
                disabled={!selectedRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Назначить
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedRole('');
                  setNotes('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
