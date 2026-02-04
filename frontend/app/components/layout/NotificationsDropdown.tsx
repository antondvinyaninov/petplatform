'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BellIcon, HeartIcon, ChatBubbleLeftIcon, UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { notificationsApi, Notification } from '@/lib/api';
import { getMediaUrl, getFullName } from '@/lib/utils';

export default function NotificationsDropdown() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Загружаем только если авторизован
    if (isAuthenticated) {
      loadUnreadCount();
      
      // Обновляем каждые 2 минуты
      const interval = setInterval(loadUnreadCount, 120000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      loadNotifications();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUnreadCount = async () => {
    // Не загружаем если не авторизован
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      // Тихо игнорируем ошибки сети - уведомления опциональны
      console.debug('Could not load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAll();
      if (response.success && response.data) {
        // Фильтруем: убираем запросы в друзья, оставляем только лайки и комментарии
        const filtered = response.data.filter(n => 
          n.type === 'like' || n.type === 'comment'
        );
        setNotifications(filtered);
      }
    } catch (error) {
      // Тихо игнорируем ошибки сети
      console.debug('Could not load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await notificationsApi.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Ошибка отметки всех уведомлений:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Отмечаем как прочитанное
    if (!notification.is_read) {
      notificationsApi.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Переходим к соответствующей странице
    setIsOpen(false);
    
    if (notification.type === 'comment' || notification.type === 'like') {
      // Переход к посту (пока просто на главную)
      router.push('/');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartIcon className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-500" />;
      case 'friend_request':
        return <UserPlusIcon className="w-5 h-5 text-green-500" />;
      case 'friend_accepted':
        return <CheckIcon className="w-5 h-5 text-green-500" />;
      default:
        return <BellIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BellIcon className="w-6 h-6" strokeWidth={2} />
        {unreadCount > 0 && (
          <span 
            className="absolute top-0 right-0 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold" 
            style={{ backgroundColor: '#FC2B2B' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Уведомления</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Прочитать все
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Нет уведомлений</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar пользователя, который совершил действие */}
                      {notification.actor ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            router.push(`/id${notification.actor_id}`);
                          }}
                          className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {notification.actor.avatar ? (
                            <img 
                              src={getMediaUrl(notification.actor.avatar) || ''} 
                              alt={notification.actor.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className="text-xs">
                              {notification.actor.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Icon (если нет actor) */
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Mark as read button */}
                      {!notification.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600"
                          title="Отметить как прочитанное"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Show All Button */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Показать все уведомления
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
