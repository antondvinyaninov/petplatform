'use client';

import { useState } from 'react';
import { 
  UserPlusIcon, 
  UserMinusIcon, 
  PencilIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { organizationsApi, usersApi } from '@/lib/api';

interface Member {
  id: number;
  organization_id: number;
  user_id: number;
  role: string;
  position?: string;
  can_post: boolean;
  can_edit: boolean;
  can_manage_members: boolean;
  joined_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface User {
  id: number;
  name: string;
  last_name?: string;
  avatar?: string;
  email: string;
}

interface Props {
  organizationId: number;
  members: Member[];
  currentUserId: number;
  canManage: boolean;
  onMembersChange: () => void;
}

export default function MembersManager({ organizationId, members, currentUserId, canManage, onMembersChange }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Форма добавления
  const [newMember, setNewMember] = useState({
    userId: 0,
    role: 'member',
    position: '',
  });
  
  // Форма редактирования
  const [editForm, setEditForm] = useState({
    role: '',
    position: '',
  });

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      owner: 'Владелец',
      admin: 'Администратор',
      moderator: 'Модератор',
      member: 'Участник',
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      moderator: 'bg-green-100 text-green-700',
      member: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  // Поиск пользователей
  const searchUsers = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setError('Введите минимум 2 символа');
      return;
    }

    setSearching(true);
    setError('');
    
    try {
      const response = await usersApi.getAll();
      if (response.success && response.data) {
        // Фильтруем по имени и исключаем уже добавленных
        const memberIds = members.map(m => m.user_id);
        const filtered = response.data.filter(user => 
          !memberIds.includes(user.id) &&
          (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setSearchResults(filtered);
      }
    } catch (err) {
      setError('Ошибка поиска пользователей');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Выбрать пользователя
  const selectUser = (user: User) => {
    setNewMember({ ...newMember, userId: user.id });
    setSearchResults([]);
    setSearchQuery(`${user.name}${user.last_name ? ' ' + user.last_name : ''}`);
  };

  // Добавить участника
  const handleAddMember = async () => {
    if (!newMember.userId) {
      setError('Выберите пользователя');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await organizationsApi.addMember(
        organizationId,
        newMember.userId,
        newMember.role,
        newMember.position
      );

      if (response.success) {
        setShowAddModal(false);
        setNewMember({ userId: 0, role: 'member', position: '' });
        setSearchQuery('');
        onMembersChange();
      } else {
        setError(response.error || 'Ошибка добавления участника');
      }
    } catch (err) {
      setError('Ошибка добавления участника');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Открыть форму редактирования
  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditForm({
      role: member.role,
      position: member.position || '',
    });
    setShowEditModal(true);
  };

  // Обновить участника
  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    setLoading(true);
    setError('');

    try {
      const response = await organizationsApi.updateMember(
        selectedMember.id,
        editForm.role,
        editForm.position
      );

      if (response.success) {
        setShowEditModal(false);
        setSelectedMember(null);
        onMembersChange();
      } else {
        setError(response.error || 'Ошибка обновления участника');
      }
    } catch (err) {
      setError('Ошибка обновления участника');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Удалить участника
  const handleRemoveMember = async (member: Member) => {
    if (!confirm(`Удалить ${member.user_name || 'пользователя'} из организации?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await organizationsApi.removeMember(member.id);

      if (response.success) {
        onMembersChange();
      } else {
        setError(response.error || 'Ошибка удаления участника');
      }
    } catch (err) {
      setError('Ошибка удаления участника');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900">Участники</h3>
          <span className="text-sm text-gray-500">({members.length})</span>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <UserPlusIcon className="w-4 h-4" />
            Добавить
          </button>
        )}
      </div>

      {/* Список участников */}
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {/* Аватар */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {member.user_avatar ? (
                <img 
                  src={`http://localhost:8000${member.user_avatar}`}
                  alt={member.user_name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (member.user_name || 'U').charAt(0).toUpperCase()
              )}
            </div>

            {/* Информация */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{member.user_name || 'Пользователь'}</div>
              {member.position && (
                <div className="text-sm text-gray-600">{member.position}</div>
              )}
            </div>

            {/* Роль */}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
              {getRoleName(member.role)}
            </span>

            {/* Действия */}
            {canManage && member.role !== 'owner' && member.user_id !== currentUserId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(member)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemoveMember(member)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <UserMinusIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модальное окно добавления */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Добавить участника</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setNewMember({ userId: 0, role: 'member', position: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Поиск пользователя */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пользователь
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    placeholder="Поиск по имени или email"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={searchUsers}
                    disabled={searching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Результаты поиска */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                          {user.avatar ? (
                            <img 
                              src={`http://localhost:8000${user.avatar}`}
                              alt={user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {user.name}{user.last_name ? ' ' + user.last_name : ''}
                          </div>
                          <div className="text-sm text-gray-600 truncate">{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Роль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Роль
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Участник</option>
                  <option value="moderator">Модератор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              {/* Должность */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Должность (опционально)
                </label>
                <input
                  type="text"
                  value={newMember.position}
                  onChange={(e) => setNewMember({ ...newMember, position: e.target.value })}
                  placeholder="Например: Координатор"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setNewMember({ userId: 0, role: 'member', position: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={loading || !newMember.userId}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Редактировать участника</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Пользователь (только для отображения) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пользователь
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {selectedMember.user_avatar ? (
                      <img 
                        src={`http://localhost:8000${selectedMember.user_avatar}`}
                        alt={selectedMember.user_name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (selectedMember.user_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="font-medium text-gray-900">{selectedMember.user_name || 'Пользователь'}</div>
                </div>
              </div>

              {/* Роль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Роль
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Участник</option>
                  <option value="moderator">Модератор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              {/* Должность */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Должность (опционально)
                </label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  placeholder="Например: Координатор"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpdateMember}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
