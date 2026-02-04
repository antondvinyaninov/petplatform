'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useFriendRequests } from '@/app/hooks/useFriendRequests';
import { getMediaUrl, getFullName } from '@/lib/utils';
import { friendsApi } from '@/lib/api';

export default function FriendsDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { requests, count, refresh } = useFriendRequests();

  const handleAccept = async (friendshipId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await friendsApi.acceptRequest(friendshipId);
    if (result.success) {
      await refresh();
    }
  };

  const handleReject = async (friendshipId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await friendsApi.rejectRequest(friendshipId);
    if (result.success) {
      await refresh();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <UserGroupIcon className="w-6 h-6" strokeWidth={2} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Запросы в друзья</h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/friends');
                  }}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Все друзья
                </button>
              </div>
            </div>

            {/* Requests List */}
            <div className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Нет новых запросов
                </div>
              ) : (
                requests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/profile/${request.friend.id}`);
                        }}
                        className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0 cursor-pointer"
                      >
                        {request.friend.avatar ? (
                          <img
                            src={getMediaUrl(request.friend.avatar) || ''}
                            alt={request.friend.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-6 h-6 text-gray-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div
                          onClick={() => {
                            setIsOpen(false);
                            router.push(`/profile/${request.friend.id}`);
                          }}
                          className="font-semibold text-gray-900 hover:text-blue-500 cursor-pointer"
                        >
                          {getFullName(request.friend.name, request.friend.last_name)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(request.created_at).toLocaleDateString('ru-RU')}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => handleAccept(request.id, e)}
                            className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                          >
                            Принять
                          </button>
                          <button
                            onClick={(e) => handleReject(request.id, e)}
                            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {requests.length > 5 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/friends/requests');
                  }}
                  className="w-full text-center text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  Показать все ({requests.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
