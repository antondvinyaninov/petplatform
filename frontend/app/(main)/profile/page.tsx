'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Редирект на страницу пользователя /id{userId}
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth');
      } else if (user) {
        router.push(`/id${user.id}`);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
    </div>
  );
}
