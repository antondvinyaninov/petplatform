import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface UsersStats {
  total: number;
  online: number;
  posts: number;
  likes: number;
  comments: number;
}

export function useUsersStats() {
  const [stats, setStats] = useState<UsersStats>({ 
    total: 0, 
    online: 0,
    posts: 0,
    likes: 0,
    comments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Обновляем статистику каждые 30 секунд
    const interval = setInterval(loadStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.get<UsersStats>('/api/users/stats');
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading users stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading };
}
