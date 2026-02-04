'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { postsApi } from '@/lib/api';
import { getMediaUrl, getFullName } from '@/lib/utils';

interface Liker {
  id: number;
  name: string;
  last_name?: string;
  avatar?: string;
}

interface LikersModalProps {
  postId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function LikersModal({ postId, isOpen, onClose }: LikersModalProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLikers();
    }
  }, [isOpen, postId]);

  const loadLikers = async () => {
    setLoading(true);
    try {
      const response = await postsApi.getLikers(postId);
      if (response.success && response.data) {
        setLikers(response.data);
        // ✅ Закрываем модалку если лайков нет
        if (response.data.length === 0) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки списка лайков:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Нравится ({likers.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Пока никто не лайкнул этот пост
            </div>
          ) : (
            <div className="space-y-3">
              {likers.map((liker) => (
                <a
                  key={liker.id}
                  href={`/id${liker.id}`}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                    {liker.avatar ? (
                      <img
                        src={getMediaUrl(liker.avatar) || ''}
                        alt={liker.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-6 h-6" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {getFullName(liker.name, liker.last_name)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
