'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { friendsApi, type Friendship } from '@/lib/api';

interface OnlineFriend {
  id: number;
  name: string;
  last_name: string;
  avatar: string;
  is_online?: boolean; // Добавлено поле онлайн статуса
  last_seen?: string; // Добавлено поле последней активности
}

export default function RightPanel() {
  const { user, isAuthenticated } = useAuth();
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем друзей только если пользователь авторизован
    if (isAuthenticated) {
      fetchOnlineFriends();
    } else {
      setOnlineFriends([]);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchOnlineFriends = async () => {
    try {
      // ✅ Используем friendsApi вместо прямого fetch
      const result = await friendsApi.getFriends();
      
      if (result.success && result.data) {
        // Преобразуем Friendship[] в OnlineFriend[]
        const friends = result.data.map((f: Friendship) => ({
          id: f.friend.id,
          name: f.friend.name,
          last_name: f.friend.last_name || '',
          avatar: f.friend.avatar || '',
          is_online: f.friend.is_online,
          last_seen: f.friend.last_seen,
        }));
        setOnlineFriends(friends);
      } else {
        setOnlineFriends([]);
      }
    } catch (error) {
      // Тихо игнорируем ошибки сети - друзья опциональны
      console.error('Failed to load friends:', error);
      setOnlineFriends([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2.5">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Friends */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          {onlineFriends.some(f => f.is_online) && (
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          )}
          {onlineFriends.some(f => f.is_online) ? 'Друзья онлайн' : 'Друзья'}
        </h3>
        {onlineFriends.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Нет друзей
          </p>
        ) : (
          <div className="space-y-2">
            {onlineFriends.map((friend) => (
              <Link
                key={friend.id}
                href={`/${friend.id}`}
                className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg cursor-pointer transition-all group"
              >
                <div className="relative">
                  {friend.avatar ? (
                    <img
                      src={friend.avatar}
                      alt={`${friend.name} ${friend.last_name}`}
                      className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <span className="text-sm text-white font-medium">
                        {friend.name?.[0] || '?'}{friend.last_name?.[0] || ''}
                      </span>
                    </div>
                  )}
                  {/* Показываем зеленую точку только если пользователь онлайн */}
                  {friend.is_online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {friend.name} {friend.last_name}
                  </p>
                  {/* Показываем статус */}
                  {friend.is_online ? (
                    <p className="text-xs text-green-600">Онлайн</p>
                  ) : friend.last_seen ? (
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const lastSeen = new Date(friend.last_seen);
                        const now = new Date();
                        const diffMs = now.getTime() - lastSeen.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);

                        if (diffMins < 1) return 'только что';
                        if (diffMins < 60) return `${diffMins} мин. назад`;
                        if (diffHours < 24) return `${diffHours} ч. назад`;
                        if (diffDays === 1) return 'вчера';
                        if (diffDays < 7) return `${diffDays} дн. назад`;
                        return lastSeen.toLocaleDateString('ru-RU');
                      })()}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">не в сети</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
