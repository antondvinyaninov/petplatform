'use client';

import { useRouter } from 'next/navigation';
import { UserIcon } from '@heroicons/react/24/outline';
import { getMediaUrl, getFullName } from '@/lib/utils';
import { Friendship } from '@/lib/api';

interface FriendsListProps {
  friends: Friendship[];
}

export default function FriendsList({ friends }: FriendsListProps) {
  const router = useRouter();

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        У вас пока нет друзей
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {friends.map((friendship) => (
        <div
          key={friendship.id}
          onClick={() => router.push(`/profile/${friendship.friend.id}`)}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
              {friendship.friend.avatar ? (
                <img
                  src={getMediaUrl(friendship.friend.avatar) || ''}
                  alt={friendship.friend.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-gray-500" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {getFullName(friendship.friend.name, friendship.friend.last_name)}
              </div>
              {friendship.friend.location && (
                <div className="text-sm text-gray-500 truncate">
                  {friendship.friend.location}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
