'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { friendsApi, Friendship } from '@/lib/api';

export function useFriendRequests() {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    // Не загружаем если пользователь не авторизован
    if (!isAuthenticated) {
      setRequests([]);
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await friendsApi.getRequests();
      if (result.success && result.data) {
        setRequests(result.data);
        setCount(result.data.length);
      } else {
        // Ошибка или не авторизован
        setRequests([]);
        setCount(0);
      }
    } catch (error) {
      // Тихо игнорируем ошибки
      setRequests([]);
      setCount(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
    
    // Обновляем каждые 2 минуты (только если авторизован)
    if (isAuthenticated) {
      const interval = setInterval(loadRequests, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return { requests, count, loading, refresh: loadRequests };
}
