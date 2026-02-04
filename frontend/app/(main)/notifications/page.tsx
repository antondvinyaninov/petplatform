'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BellIcon, 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  UserPlusIcon, 
  CheckIcon,
  FunnelIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { notificationsApi, Notification } from '@/lib/api';
import { getMediaUrl } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'like' | 'comment' | 'friend'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAll();
      if (response.success && response.data) {
        console.log('📬 Loaded notifications:', response.data);
        console.log('📬 First notification:', response.data[0]);
        if (response.data[0]?.actor) {
          console.log('📬 First actor:', response.data[0].actor);
        } else {
          console.log('⚠️ First notification has no actor!');
        }
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...notifications];

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.is_read);
    } else if (filter === 'like') {
      filtered = filtered.filter(n => n.type === 'like');
    } else if (filter === 'comment') {
      filtered = filtered.filter(n => n.type === 'comment');
    } else if (filter === 'friend') {
      filtered = filtered.filter(n => n.type === 'friend_request' || n.type === 'friend_accepted');
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтра
  };

  const handleMarkAsRead = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await notificationsApi.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
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
    }

    // Переходим к соответствующей странице
    if (notification.type === 'comment' || notification.type === 'like') {
      router.push('/');
    } else if (notification.type === 'friend_request') {
      router.push('/friends/requests');
    } else if (notification.type === 'friend_accepted') {
      router.push('/friends');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartIcon className="w-6 h-6 text-red-500" />;
      case 'comment':
        return <ChatBubbleLeftIcon className="w-6 h-6 text-blue-500" />;
      case 'friend_request':
        return <UserPlusIcon className="w-6 h-6 text-green-500" />;
      case 'friend_accepted':
        return <CheckIcon className="w-6 h-6 text-green-500" />;
      default:
        return <BellIcon className="w-6 h-6 text-gray-500" />;
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
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <BellIcon className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
                <p className="text-sm text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитаны'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Прочитать все
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Непрочитанные ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('like')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'like'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❤️ Лайки
            </button>
            <button
              onClick={() => setFilter('comment')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'comment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💬 Комментарии
            </button>
            <button
              onClick={() => setFilter('friend')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'friend'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 Друзья
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'Нет уведомлений' : 'Нет уведомлений в этой категории'}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Когда появятся новые уведомления, они отобразятся здесь'
                : 'Попробуйте выбрать другой фильтр'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
              {currentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar пользователя, который совершил действие */}
                    {notification.actor && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/id${notification.actor_id}`);
                        }}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {notification.actor.avatar ? (
                          <img 
                            src={getMediaUrl(notification.actor.avatar) || ''} 
                            alt={notification.actor.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-sm">
                            {notification.actor.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Icon (если нет actor) */}
                    {!notification.actor && (
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-900 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Mark as read button */}
                    {!notification.is_read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="flex-shrink-0 w-3 h-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                        title="Отметить как прочитанное"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-sm text-gray-600">
                  Показано {startIndex + 1}-{Math.min(endIndex, filteredNotifications.length)} из {filteredNotifications.length}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Назад
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Вперёд
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
