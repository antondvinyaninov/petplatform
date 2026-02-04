'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { friendsApi, Friendship } from '@/lib/api';
import FriendsList from '@/app/components/profile/FriendsList';

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    const result = await friendsApi.getFriends();
    if (result.success && result.data) {
      setFriends(result.data);
    }
    setLoading(false);
  };

  const filteredFriends = friends.filter((friendship) => {
    const fullName = `${friendship.friend.name} ${friendship.friend.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Мои друзья</h1>
        
        {/* Search */}
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Поиск друзей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => router.push('/friends/requests')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Запросы в друзья
          </button>
        </div>
      </div>

      {/* Friends List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : (
        <>
          {friends.length > 0 && (
            <div className="mb-4 text-gray-600">
              Всего друзей: {friends.length}
              {searchQuery && ` (найдено: ${filteredFriends.length})`}
            </div>
          )}
          <FriendsList friends={filteredFriends} />
        </>
      )}
    </div>
  );
}
