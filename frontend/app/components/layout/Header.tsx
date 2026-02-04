'use client';

import Image from 'next/image';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import CityDetector from './CityDetector';
import UserMenu from './UserMenu';
import NotificationsDropdown from './NotificationsDropdown';

export default function Header() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1150px] mx-auto px-4 py-1">
        <div className="flex items-center gap-2.5">
          {/* Left: Logo - same width as sidebar */}
          <div className="hidden lg:flex items-center space-x-2 w-[180px] flex-shrink-0 px-2">
            <Image src="/favicon.svg" alt="ЗооПлатформа" width={28} height={28} className="flex-shrink-0" />
            <span className="text-sm font-bold text-gray-900 uppercase">Зооплатформа</span>
          </div>

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center space-x-2 flex-shrink-0">
            <Image src="/favicon.svg" alt="ЗооПлатформа" width={28} height={28} className="flex-shrink-0" />
            <span className="text-sm font-bold text-gray-900 uppercase">Зооплатформа</span>
          </div>

          {/* Center: Search */}
          <div className="flex-1 min-w-0">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent bg-gradient-to-br from-gray-50 to-gray-100"
                style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* City Detector - скрыт на маленьких экранах */}
            <div className="hidden md:block">
              <CityDetector />
            </div>
            
            {/* Notifications - только для авторизованных */}
            {isAuthenticated && <NotificationsDropdown />}

            {/* User Menu - всегда показываем (там кнопка "Войти" для неавторизованных) */}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
