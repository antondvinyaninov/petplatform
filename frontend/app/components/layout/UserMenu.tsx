'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getMediaUrl, getFullName } from '@/lib/utils';
import {
  UserIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  PaintBrushIcon,
  QrCodeIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Закрытие меню при клике вне
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push('/auth');
  };

  // Показываем placeholder пока идет загрузка
  if (isLoading) {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => router.push('/auth')}
        className="px-4 py-2 rounded-lg text-white font-medium transition-colors text-sm"
        style={{ backgroundColor: '#1B76FF' }}
      >
        Войти
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
          {user?.avatar ? (
            <img src={getMediaUrl(user.avatar) || ''} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-5 h-5 text-gray-600" />
          )}
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={getMediaUrl(user.avatar) || ''} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  {getFullName(user?.name || 'Пользователь', user?.last_name)}
                  <span className="text-blue-500">✓</span>
                </div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Управление аккаунтом */}
            <button
              onClick={() => {
                if (user) {
                  router.push(`/id${user.id}`);
                  setIsOpen(false);
                }
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1B76FF20' }}>
                <UserIcon className="w-5 h-5" style={{ color: '#1B76FF' }} />
              </div>
              <span className="text-sm font-medium text-gray-900">Управление аккаунтом</span>
            </button>

            {/* Голоса */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <SpeakerWaveIcon className="w-5 h-5 text-gray-600 ml-2.5" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-gray-900">Голоса</span>
                <span className="text-sm text-gray-500">0</span>
              </div>
            </button>

            {/* Вход по QR-коду */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <QrCodeIcon className="w-5 h-5 text-gray-600 ml-2.5" />
              <span className="text-sm text-gray-900">Вход по QR-коду</span>
            </button>

            {/* Настройки */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Cog6ToothIcon className="w-5 h-5 text-gray-600 ml-2.5" />
              <span className="text-sm text-gray-900">Настройки</span>
            </button>

            {/* Тема */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <PaintBrushIcon className="w-5 h-5 text-gray-600 ml-2.5" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-gray-900">Тема:</span>
                <span className="text-sm" style={{ color: '#1B76FF' }}>Системная</span>
              </div>
            </button>

            {/* Помощь */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600 ml-2.5" />
              <span className="text-sm text-gray-900">Помощь</span>
            </button>

            {/* Выйти */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-200 mt-2"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-600 ml-2.5" />
              <span className="text-sm text-gray-900">Выйти</span>
            </button>
          </div>

          {/* Добавить аккаунт */}
          <div className="border-t border-gray-200 p-3">
            <button
              className="w-full py-2 flex items-center justify-center gap-2 hover:bg-gray-50 rounded-lg transition-colors"
              style={{ color: '#1B76FF' }}
            >
              <span className="text-xl">+</span>
              <span className="text-sm font-medium">Добавить аккаунт</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
