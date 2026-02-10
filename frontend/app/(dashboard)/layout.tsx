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
  const [adminUser, setAdminUser] = useState<{ email: string; name?: string; avatar?: string; role: string } | null>(null);
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
            // Gateway возвращает role (строка), не roles (массив)
            const userRole = data.user.role;
            const userRoles = data.user.roles || [];
            const roles = userRoles.length > 0 ? userRoles : (userRole ? [userRole] : []);
            
            console.log('🔍 User roles in layout:', roles);
            
            if (!roles.includes('superadmin')) {
              alert('Доступ запрещен. Требуются права суперадмина.');
              router.push('/auth');
              return;
            }
            
            setAdminUser({
              email: data.user.email,
              name: data.user.name,
              avatar: data.user.avatar,
              role: 'superadmin',
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
    if (pathname.includes('/breeds')) {
      setActiveTab('reference');
    } else if (pathname.includes('/pets')) {
      setActiveTab('pets');
    } else {
      setActiveTab('dashboard');
    }
  }, [pathname]);

  const tabs: AdminTab[] = [
    {
      id: 'dashboard',
      label: 'Дашборд',
      icon: <ChartBarIcon className="w-5 h-5" />,
    },
    {
      id: 'pets',
      label: 'Питомцы',
      icon: <HeartIcon className="w-5 h-5" />,
    },
    {
      id: 'reference',
      label: 'Справочник',
      icon: <BookOpenIcon className="w-5 h-5" />,
    },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Навигация по табам
    const routes: Record<string, string> = {
      dashboard: '/dashboard',
      reference: '/breeds',
      pets: '/pets',
    };

    if (routes[tabId]) {
      router.push(routes[tabId]);
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
      logoText="PetID"
      logoAlt="PetID - База данных питомцев"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      adminUser={adminUser}
      onLogout={handleLogout}
      mainSiteUrl="http://localhost:3000"
    >
      {children}
    </AdminLayout>
  );
}
