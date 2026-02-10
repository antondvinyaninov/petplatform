'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout, { AdminTab } from '../components/admin/AdminLayout';
import {
  ChartBarIcon,
  BookOpenIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<{ email: string; name?: string; last_name?: string; avatar?: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Проверка авторизации через Next.js proxy (обходим CORS)
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/gateway/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Layout auth check:', data);
          
          if (data.success && data.user) {
            setAdminUser({
              email: data.user.email,
              name: data.user.name,
              last_name: data.user.last_name,
              avatar: data.user.avatar,
              role: data.user.role || 'user',
            });
          } else {
            router.push('/auth');
          }
        } else {
          router.push('/auth');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/auth');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Определяем активную вкладку по URL
    if (pathname.includes('/pets')) {
      setActiveTab('pets');
    } else {
      setActiveTab('pets'); // По умолчанию питомцы
    }
  }, [pathname]);

  const tabs: AdminTab[] = [
    {
      id: 'pets',
      label: 'Мои питомцы',
      icon: <HeartIcon className="w-5 h-5" />,
    },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Навигация по табам
    if (tabId === 'pets') {
      router.push('/pets');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/gateway/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <AdminLayout
      logoSrc="/logo.svg"
      logoText="ЗооПлатформа"
      logoAlt="ЗооПлатформа - Кабинет владельца"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      adminUser={adminUser}
      onLogout={handleLogout}
      mainSiteUrl="https://zooplatforma.ru"
    >
      {children}
    </AdminLayout>
  );
}
