import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface UseWebSocketOptions {
  onUnreadCount?: (count: number) => void;
  onNewMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(false);
  const maxReconnectAttempts = 5;

  // Отслеживаем монтирование компонента
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      // Не авторизован - закрываем соединение если есть
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (isMountedRef.current) {
        setIsConnected(false);
      }
      return;
    }

    // ✅ Не переподключаемся если уже подключены
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Небольшая задержка чтобы токен успел установиться
    const initTimeout = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(initTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id]); // ✅ Зависим только от user.id, а не от всего объекта user

  const connect = () => {
    // Получаем токен из localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ No token found, cannot connect to WebSocket');
      return;
    }

    // Определяем WebSocket URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Определяем протокол: если API URL использует https, используем wss
    const wsProtocol = apiUrl.startsWith('https://') ? 'wss:' : 'ws:';
    const wsHost = new URL(apiUrl).host;
    
    // Передаем токен через query параметр
    const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Обновляем состояние только если компонент смонтирован
        if (isMountedRef.current) {
          setIsConnected(true);
        }
        reconnectAttemptsRef.current = 0;
        options.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'unread_count':
              options.onUnreadCount?.(message.data.count);
              break;
            case 'new_message':
              options.onNewMessage?.(message.data);
              break;
            default:
              // Unknown message type - ignore
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = () => {
        // Обновляем состояние только если компонент смонтирован
        if (isMountedRef.current) {
          setIsConnected(false);
        }
        wsRef.current = null;
        options.onDisconnect?.();

        // Пытаемся переподключиться только если компонент смонтирован
        if (reconnectAttemptsRef.current < maxReconnectAttempts && isMountedRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (!isMountedRef.current) {
          // Component unmounted, skipping reconnect
        } else {
          console.error('❌ WebSocket: Max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
    }
  };

  return { isConnected };
}
