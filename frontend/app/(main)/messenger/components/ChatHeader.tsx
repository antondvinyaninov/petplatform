'use client';

import { User } from '../types';

interface ChatHeaderProps {
  user: User | null;
  onClose: () => void;
}

export default function ChatHeader({ user, onClose }: ChatHeaderProps) {
  if (!user) return null;

  const getLastSeenText = (lastSeen?: string) => {
    if (!lastSeen) return 'не в сети';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'был(а) только что';
    if (diffMins < 60) return `был(а) ${diffMins} мин. назад`;
    if (diffHours < 24) return `был(а) ${diffHours} ч. назад`;
    if (diffDays === 1) return 'был(а) вчера';
    if (diffDays < 7) return `был(а) ${diffDays} дн. назад`;
    return `был(а) ${lastSeenDate.toLocaleDateString('ru-RU')}`;
  };

  return (
    <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Закрыть чат"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={`http://localhost:8000${user.avatar}`}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {user.name} {user.last_name}
            </h3>
            {user.is_online ? (
              <p className="text-sm text-green-600">онлайн</p>
            ) : (
              <p className="text-sm text-gray-500">
                {getLastSeenText(user.last_seen)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
