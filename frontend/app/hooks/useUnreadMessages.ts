import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { useWebSocket } from './useWebSocket';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Подключаемся к WebSocket для real-time обновлений
  const { isConnected } = useWebSocket({
    onUnreadCount: (count: number) => {
      console.log('🔔 Unread count updated via WebSocket:', count);
      setUnreadCount(count);
    },
    onConnect: () => {
      console.log('✅ WebSocket connected, unread count will be sent automatically');
    },
  });

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Загружаем начальное значение только если WebSocket не подключен
    // WebSocket автоматически отправит count при подключении
    if (!isConnected) {
      const fetchUnreadCount = async () => {
        try {
          const response = await apiClient.get<{ count: number }>('/api/messages/unread');

          if (response.success && response.data) {
            setUnreadCount(response.data.count || 0);
          } else {
            setUnreadCount(0);
          }
        } catch (error) {
          // Тихо игнорируем ошибки сети - не критично для UI
          setUnreadCount(0);
        }
      };

      fetchUnreadCount();
    }
  }, [user, isConnected]);

  return unreadCount;
}
