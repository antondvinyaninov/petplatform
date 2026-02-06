'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserIcon } from '@heroicons/react/24/outline';
import { friendsApi, Friendship } from '@/lib/api';
import { getMediaUrl, getFullName } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface FriendsListWidgetProps {
  userId: number;
  limit?: number;
}

export default function FriendsListWidget({ userId, limit = 6 }: FriendsListWidgetProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем друзей только для авторизованных
    if (isAuthenticated) {
      loadFriends();
    } else {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  const loadFriends = async () => {
    setLoading(true);
    const result = await friendsApi.getFriends();
    if (result.success && result.data) {
      setFriends(result.data.slice(0, limit));
    }
    setLoading(false);
  };

  // Не показываем виджет для неавторизованных
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        <p>Нет друзей</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Друзья <span className="text-gray-500 text-sm font-normal">({friends.length})</span>
        </h2>
        <button
          onClick={() => router.push('/friends')}
          className="text-sm font-medium text-blue-500 hover:text-blue-600"
        >
          Все
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {friends.map((friendship) => (
          <div
            key={friendship.id}
            onClick={() => router.push(`/id${friendship.friend.id}`)}
            className="cursor-pointer group"
          >
            <div className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden mb-1 group-hover:opacity-90 transition-opacity relative">
              {friendship.friend.avatar ? (
                <img
                  src={getMediaUrl(friendship.friend.avatar) || ''}
                  alt={friendship.friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-gray-400" />
              )}
              {/* Статус онлайн индикатор */}
              <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white flex-shrink-0 ${
                friendship.friend.is_online ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <div className="text-xs text-gray-700 text-center truncate">
              {getFullName(friendship.friend.name, friendship.friend.last_name)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
