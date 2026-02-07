'use client';

import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  DocumentTextIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface Stats {
  total_users: number;
  verified_users: number;
  total_posts: number;
  total_organizations: number;
  online_users: number;
  active_last_hour: number;
  active_last_24h: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    verified_users: 0,
    total_posts: 0,
    total_organizations: 0,
    online_users: 0,
    active_last_hour: 0,
    active_last_24h: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Загружаем статистику через Next.js proxy (обходим CORS)
      const [usersRes, orgsRes, activityRes] = await Promise.all([
        fetch('/api/gateway/admin/users', { credentials: 'include' }),
        fetch('/api/gateway/organizations/all', { credentials: 'include' }),
        fetch('/api/gateway/activity/stats', { credentials: 'include' }),
      ]);

      if (usersRes.ok && orgsRes.ok) {
        const usersResult = await usersRes.json();
        const orgsResult = await orgsRes.json();

        // API возвращает {success: true, data: [...]}
        const usersData = usersResult.data || usersResult;
        const orgsData = orgsResult.data || orgsResult;

        // Проверяем что данные - массивы
        const users = Array.isArray(usersData) ? usersData : [];
        const orgs = Array.isArray(orgsData) ? orgsData : [];

        // Статистика активности
        let activityData = { online_now: 0, active_last_hour: 0, active_last_24h: 0 };
        if (activityRes.ok) {
          const activityResult = await activityRes.json();
          activityData = activityResult.data || activityData;
        }

        setStats({
          total_users: users.length,
          verified_users: users.filter((u: any) => u.verified).length,
          total_posts: 0, // TODO: добавить API для постов
          total_organizations: orgs.length,
          online_users: activityData.online_now,
          active_last_hour: activityData.active_last_hour,
          active_last_24h: activityData.active_last_24h,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Панель управления</h1>
          <p className="text-gray-600">Обзор статистики платформы</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Пользователи онлайн</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.online_users}</p>
                <p className="text-xs text-gray-500 mt-1">Активны сейчас (5 мин)</p>
              </div>
              <div className="relative">
                <UsersIcon className="w-12 h-12 text-green-500" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего пользователей</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_users}</p>
                <p className="text-xs text-gray-500 mt-1">За последний час: {stats.active_last_hour}</p>
              </div>
              <UsersIcon className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Верифицированные</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.verified_users}</p>
                <p className="text-xs text-gray-500 mt-1">За 24 часа: {stats.active_last_24h}</p>
              </div>
              <ShieldCheckIcon className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Организации</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_organizations}</p>
                <p className="text-xs text-gray-500 mt-1">Приюты, клиники, фонды</p>
              </div>
              <BuildingOfficeIcon className="w-12 h-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/users"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <UsersIcon className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Управление пользователями</h3>
            <p className="text-sm text-gray-600">Верификация и управление учетными записями</p>
          </a>

          <a
            href="/roles"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <ShieldCheckIcon className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Управление ролями</h3>
            <p className="text-sm text-gray-600">Назначение и отзыв ролей пользователей</p>
          </a>

          <a
            href="/organizations"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <BuildingOfficeIcon className="w-8 h-8 text-orange-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Организации</h3>
            <p className="text-sm text-gray-600">Управление приютами, клиниками и фондами</p>
          </a>
        </div>
      </div>
    </div>
  );
}
