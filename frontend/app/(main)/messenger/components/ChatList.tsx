'use client';

import { User, Chat } from '../types';
import { getUserAvatarUrl } from '@/lib/urls';

interface ChatListProps {
  chats: Chat[];
  loading: boolean;
  isCollapsed: boolean;
  selectedChatId: number | null;
  currentUserId?: number;
  onToggleCollapse: () => void;
  onSelectChat: (chatId: number) => void;
}

export default function ChatList({
  chats,
  loading,
  isCollapsed,
  selectedChatId,
  currentUserId,
  onToggleCollapse,
  onSelectChat,
}: ChatListProps) {
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-[70px]' : 'w-[340px]'} border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Шапка */}
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-3`}>
          {!isCollapsed && <h2 className="text-xl font-semibold text-gray-900">Чаты</h2>}
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title={isCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Поиск - только в развернутом виде */}
        {!isCollapsed && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        )}
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {!isCollapsed && <p className="text-sm">Нет чатов</p>}
            </div>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full ${isCollapsed ? 'p-2' : 'p-3'} flex ${isCollapsed ? 'justify-center' : 'items-start gap-3'} hover:bg-gray-50 transition-colors border-b border-gray-100 ${selectedChatId === chat.id ? 'bg-blue-50' : ''}`}
              title={isCollapsed ? `${chat.other_user?.name} ${chat.other_user?.last_name}` : ''}
            >
              {/* Аватар */}
              <div className="relative flex-shrink-0">
                {chat.other_user?.avatar ? (
                  <img
                    src={getUserAvatarUrl(chat.other_user.avatar)}
                    alt={chat.other_user.name}
                    className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-full object-cover`}
                  />
                ) : (
                  <div className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold`}>
                    {chat.other_user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                {chat.unread_count > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {chat.unread_count > 9 ? '9+' : chat.unread_count}
                  </div>
                )}
              </div>

              {/* Информация - только в развернутом виде */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium truncate ${chat.unread_count > 0 ? 'font-semibold' : ''}`}>
                      {chat.other_user?.name} {chat.other_user?.last_name}
                    </span>
                    {chat.last_message_at && (
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(chat.last_message_at)}
                      </span>
                    )}
                  </div>
                  
                  {chat.last_message && (
                    <p className={`text-sm truncate ${chat.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                      {chat.last_message.sender_id === currentUserId && 'Вы: '}
                      {(() => {
                        // Проверяем, является ли это сообщением с животным
                        try {
                          if (chat.last_message.content && chat.last_message.content.startsWith('{')) {
                            const parsed = JSON.parse(chat.last_message.content);
                            if (parsed.type === 'pet') {
                              return `🐾 ${parsed.name}`;
                            }
                          }
                        } catch (e) {
                          // Не JSON, обычное сообщение
                        }
                        return chat.last_message.content || '📎 Вложение';
                      })()}
                    </p>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
