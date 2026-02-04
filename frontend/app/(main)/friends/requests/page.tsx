'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserIcon } from '@heroicons/react/24/outline';
import { friendsApi, Friendship } from '@/lib/api';
import { getMediaUrl, getFullName } from '@/lib/utils';

export default function FriendRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const result = await friendsApi.getRequests();
    if (result.success && result.data) {
      setRequests(result.data);
    }
    setLoading(false);
  };

  const handleAccept = async (friendshipId: number) => {
    const result = await friendsApi.acceptRequest(friendshipId);
    if (result.success) {
      await loadRequests();
    }
  };

  const handleReject = async (friendshipId: number) => {
    const result = await friendsApi.rejectRequest(friendshipId);
    if (result.success) {
      await loadRequests();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:text-blue-600 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Запросы в друзья</h1>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Загрузка...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Нет входящих запросов в друзья
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                {/* User Info */}
                <div
                  onClick={() => router.push(`/profile/${request.friend.id}`)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                    {request.friend.avatar ? (
                      <img
                        src={getMediaUrl(request.friend.avatar) || ''}
                        alt={request.friend.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-8 h-8 text-gray-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">
                      {getFullName(request.friend.name, request.friend.last_name)}
                    </div>
                    {request.friend.location && (
                      <div className="text-sm text-gray-500">
                        {request.friend.location}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(request.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleAccept(request.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Принять
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
