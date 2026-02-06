'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessages } from '@/app/hooks/useUnreadMessages';
import { useUsersStats } from '@/app/hooks/useUsersStats';
import {
  HomeIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UserGroupIcon,
  VideoCameraIcon,
  Cog6ToothIcon,
  ShoppingBagIcon,
  HeartIcon,
  NewspaperIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string;
}

const additionalLinks = [
  { name: 'О платформе', href: '/about', icon: InformationCircleIcon },
  { name: 'Статистика', href: '/statistics', icon: ChartBarIcon },
  { name: 'Техподдержка', href: '/support', icon: WrenchScrewdriverIcon },
  { name: 'Команда', href: '/team', icon: UserGroupIcon },
];

export default function Sidebar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const unreadCount = useUnreadMessages();
  const { stats, loading: statsLoading } = useUsersStats(isAuthenticated);

  // Навигация для авторизованных пользователей
  const authenticatedNavigation: NavItem[] = [
    { name: 'Метки', href: '/', icon: DocumentTextIcon },
    { name: 'Профиль', href: user ? `/id${user.id}` : '/profile', icon: UserIcon },
    { name: 'Мессенджер', href: '/messenger', icon: ChatBubbleLeftIcon, badge: unreadCount > 0 ? unreadCount.toString() : undefined },
    { name: 'Организации', href: '/org', icon: BuildingOfficeIcon },
    { name: 'Каталог', href: '/catalog', icon: RectangleStackIcon },
    { name: 'Избранное', href: '/favorites', icon: HeartIcon },
    { name: 'Сервисы', href: '/services', icon: Cog6ToothIcon },
  ];

  // Навигация для неавторизованных пользователей (только публичные разделы)
  const publicNavigation: NavItem[] = [
    { name: 'Метки', href: '/', icon: DocumentTextIcon },
    { name: 'Каталог', href: '/catalog', icon: RectangleStackIcon },
  ];

  const mainNavigation = isAuthenticated ? authenticatedNavigation : publicNavigation;

  return (
    <div className="sticky top-[48px]">
      <nav className="space-y-0">
        {mainNavigation.map((item) => {
          return (
            <div key={item.name}>
              {/* Разделитель перед Сервисами */}
              {item.name === 'Сервисы' && (
                <div className="border-t border-gray-300 my-3 mx-2"></div>
              )}

              <Link
                href={item.href}
                className="flex items-center space-x-2 px-2 py-1.5 rounded-lg transition-colors duration-200 group hover:bg-gray-200 ml-2"
              >
                <item.icon className="w-5 h-5 flex-shrink-0 text-gray-600" strokeWidth={2} />
                <span className="text-[13px] text-gray-700 font-medium flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                {item.badge && (
                  <span className="text-white text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold" style={{ backgroundColor: '#FC2B2B' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Разделитель перед дополнительными ссылками */}
      <div className="border-t border-gray-300 my-3 mx-2"></div>

      <nav className="space-y-0">
        {additionalLinks.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="flex items-center space-x-2 px-2 py-1 rounded-lg transition-colors duration-200 group hover:bg-gray-200 ml-2"
          >
            <link.icon className="w-4 h-4 flex-shrink-0 text-gray-500" strokeWidth={2} />
            <span className="text-[12px] text-gray-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{link.name}</span>
          </Link>
        ))}
      </nav>

      {/* Статистика пользователей - только для авторизованных */}
      {isAuthenticated && !statsLoading && (
        <div className="mt-4 mx-2 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
          <div className="space-y-1.5">
            {/* Пользователи */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Пользователей:</span>
              <span className="text-gray-900 font-semibold">
                {stats.total.toLocaleString('ru-RU')}
              </span>
            </div>
            
            {/* Онлайн */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Онлайн:
              </span>
              <span className="text-green-600 font-semibold">
                {stats.online.toLocaleString('ru-RU')}
              </span>
            </div>

            {/* Разделитель */}
            <div className="border-t border-blue-200 my-1.5"></div>

            {/* Посты */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Постов:</span>
              <span className="text-blue-600 font-semibold">
                {stats.posts.toLocaleString('ru-RU')}
              </span>
            </div>

            {/* Лайки */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Лайков:</span>
              <span className="text-red-600 font-semibold">
                {stats.likes.toLocaleString('ru-RU')}
              </span>
            </div>

            {/* Комментарии */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Комментариев:</span>
              <span className="text-purple-600 font-semibold">
                {stats.comments.toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
