'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, HeartIcon, DocumentTextIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Кабинет зоопомощника - ЗооПлатформа';
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('👤 [HomePage] Auth response:', data);
        if (data.success && data.user) {
          console.log('👤 [HomePage] User data:', data.user);
          setUser(data.user);
        }
      }
    } catch (err) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!user) return '';
    const firstInitial = user.first_name?.[0] || '';
    const lastInitial = user.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Функция для обработки клика на кнопку "Начать использовать"
  const handleGetStarted = () => {
    if (user) {
      // Если пользователь авторизован - перенаправляем в кабинет
      router.push('/pets');
    } else {
      // Если не авторизован - на страницу авторизации
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="ЗооПлатформа" className="h-8 w-8" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ЗооПлатформа
              </span>
            </div>

            {/* User Info or Login Button */}
            {loading ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <button
                onClick={() => router.push('/pets')}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.first_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {getUserInitials()}
                  </div>
                )}
                <span className="font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </span>
              </button>
            ) : (
              <button
                onClick={handleGetStarted}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Войти в кабинет
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="mb-6">
              <img src="/favicon.svg" alt="ЗооПлатформа" className="w-24 h-24 mx-auto" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Кабинет{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                зоопомощника
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Управляйте информацией о ваших подопечных питомцах
            </p>

            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-medium"
            >
              {user ? 'Перейти в кабинет' : 'Начать использовать'}
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Карточки подопечных
              </h3>
              <p className="text-gray-600">
                Создавайте подробные карточки для каждого подопечного с фото, породой, возрастом и особенностями
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Медицинские записи
              </h3>
              <p className="text-gray-600">
                Ведите историю посещений ветеринара, прививок и обработок от паразитов
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Напоминания
              </h3>
              <p className="text-gray-600">
                Получайте уведомления о предстоящих прививках и плановых обработках
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Идентификация
              </h3>
              <p className="text-gray-600">
                Храните номера чипов, бирок и клейм для быстрой идентификации питомца
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Ежедневный уход
              </h3>
              <p className="text-gray-600">
                Отмечайте кормление, выгул и другие важные моменты в уходе за подопечными
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                История изменений
              </h3>
              <p className="text-gray-600">
                Полная хронология жизни подопечного с важными событиями и датами
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Готовы начать?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Начните помогать животным уже сегодня
            </p>
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-white text-blue-600 text-lg rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              {user ? 'Перейти в кабинет' : 'Войти в кабинет'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 bg-white/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">© 2026 ЗооПлатформа. Кабинет зоопомощника.</p>
            <p className="text-sm text-gray-500">Помогайте животным и ведите учёт ваших подопечных</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
