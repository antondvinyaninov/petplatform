'use client';

import { ReactNode, useState, useEffect } from 'react';
import {
  BellIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://api.zooplatforma.ru';

export interface AdminTab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface AdminLayoutProps {
  logoSrc: string;
  logoText: string;
  logoAlt: string;
  tabs: AdminTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  adminUser?: { email: string; name?: string; last_name?: string; avatar?: string; role: string } | null;
  onLogout?: () => void;
  mainSiteUrl?: string;
}

export default function AdminLayout({
  logoSrc,
  logoText,
  logoAlt,
  tabs,
  activeTab,
  onTabChange,
  children,
  adminUser,
  onLogout,
  mainSiteUrl = 'https://zooplatforma.ru',
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (userMenuOpen && !target.closest('.user-menu-wrapper')) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // Функция для получения полного имени пользователя
  const getUserFullName = () => {
    if (!adminUser) return 'Admin';
    const firstName = adminUser.name || '';
    const lastName = adminUser.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || adminUser.email || 'Admin';
  };

  // Функция для получения инициалов
  const getUserInitials = () => {
    if (!adminUser) return 'A';
    if (adminUser.name && adminUser.last_name) {
      return `${adminUser.name.charAt(0)}${adminUser.last_name.charAt(0)}`.toUpperCase();
    }
    if (adminUser.name) {
      return adminUser.name.charAt(0).toUpperCase();
    }
    return adminUser.email?.charAt(0).toUpperCase() || 'A';
  };

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-full px-4 h-[54px] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="flex items-center gap-3 text-base font-medium text-gray-900 m-0">
              <img src={logoSrc} alt={logoAlt} className="w-7 h-7" />
              {adminUser && (
                <span className="text-sm font-bold text-gray-900">{getUserFullName()}</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {adminUser && (
              <>
                <button className="w-8 h-8 border-none bg-none cursor-pointer flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 text-gray-600">
                  <BellIcon className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 border-none bg-none cursor-pointer flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 text-gray-600">
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
                <div className="relative user-menu-wrapper">
                  <button
                    className="flex items-center gap-2 px-2 py-1 bg-none border-none cursor-pointer rounded-lg transition-colors hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    {adminUser.avatar ? (
                      <img 
                        src={adminUser.avatar.startsWith('http') ? adminUser.avatar : `${GATEWAY_URL}${adminUser.avatar}`}
                        alt={getUserFullName()}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                        <span className="text-sm font-medium">{getUserInitials()}</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-400">▼</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[1000]">
                      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                        {adminUser.avatar ? (
                          <img 
                            src={adminUser.avatar.startsWith('http') ? adminUser.avatar : `${GATEWAY_URL}${adminUser.avatar}`}
                            alt={getUserFullName()}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                            <span className="text-sm font-medium">{getUserInitials()}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-0.5">{getUserFullName()}</div>
                          <div className="text-xs text-gray-600">{adminUser?.role || 'user'}</div>
                        </div>
                      </div>

                      <div className="py-2">
                        <a
                          href={mainSiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-3 bg-none border-none cursor-pointer text-left text-sm text-gray-900 transition-colors hover:bg-gray-100 block no-underline"
                        >
                          ЗооПлатформа
                        </a>
                        {onLogout && (
                          <button
                            className="w-full px-4 py-3 bg-none border-none cursor-pointer text-left text-sm text-gray-900 transition-colors hover:bg-gray-100"
                            onClick={onLogout}
                          >
                            Выйти
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-54px)] w-full">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            w-[240px] bg-white border-r border-gray-200 flex-shrink-0 p-3 transition-all duration-300 relative flex flex-col
            ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-[240px]'}
            max-lg:fixed max-lg:left-0 max-lg:top-[54px] max-lg:h-[calc(100vh-54px)] max-lg:z-50
            ${mobileMenuOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}
          `}
        >
          {isClient ? (
            <nav className="flex flex-col gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`
                    w-full px-3 py-2.5 border-none bg-none cursor-pointer flex items-center gap-3 transition-colors rounded-lg text-left whitespace-nowrap
                    ${activeTab === tab.id ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'}
                    ${sidebarCollapsed ? 'lg:justify-center lg:px-2.5' : ''}
                  `}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  title={tab.label}
                >
                  <div className={`w-5 h-5 flex-shrink-0 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'}`}>
                    {tab.icon}
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`text-base ${activeTab === tab.id ? 'text-blue-600 font-medium' : 'text-gray-900'}`}>
                      {tab.label}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          ) : (
            <nav className="flex flex-col gap-0.5">
              <div className="h-[200px]"></div>
            </nav>
          )}

          <button
            className="mt-auto p-2.5 px-3 border-none bg-none cursor-pointer flex items-center gap-3 transition-colors rounded-lg text-gray-600 border-t border-gray-300 -mx-3 -mb-3 pt-4 hover:bg-gray-50"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <ChevronLeftIcon
              className={`w-5 h-5 transition-transform duration-300 flex-shrink-0 ${
                sidebarCollapsed ? 'rotate-180' : ''
              }`}
            />
            {!sidebarCollapsed && <span className="text-base">Свернуть</span>}
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-gray-50 p-8 max-md:p-4 max-sm:p-3">
          <div className="w-full max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
