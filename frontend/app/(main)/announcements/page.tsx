'use client';

import { useState, useEffect } from 'react';
import { PetAnnouncement, AnnouncementType } from '@/types/announcement';
import { getAnnouncements } from '@/lib/announcements-api';
import AnnouncementCard from '@/app/components/announcements/AnnouncementCard';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<PetAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AnnouncementType | 'all'>('all');

  useEffect(() => {
    loadAnnouncements();
  }, [activeFilter]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const filters = activeFilter !== 'all' ? { type: activeFilter } : undefined;
      const data = await getAnnouncements(filters);
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'all' as const, label: '🔍 Все', count: announcements.length },
    { id: 'looking_for_home' as const, label: '🏠 Ищут дом', color: 'blue' },
    { id: 'found' as const, label: '🔍 Найдены', color: 'cyan' },
    { id: 'lost' as const, label: '❗ Потеряны', color: 'pink' },
    { id: 'fundraising' as const, label: '💰 Сборы', color: 'purple' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Объявления</h1>
          <p className="text-gray-600">
            Помогите питомцам найти дом, владельца или поддержите сбор средств
          </p>
        </div>
        
        <Link
          href="/announcements/create"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1B76FF' }}
        >
          <PlusIcon className="w-5 h-5" />
          Создать объявление
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeFilter === filter.id
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🐾</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Объявлений пока нет
          </h3>
          <p className="text-gray-600 mb-6">
            Станьте первым, кто создаст объявление
          </p>
          <Link
            href="/announcements/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#1B76FF' }}
          >
            <PlusIcon className="w-5 h-5" />
            Создать объявление
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
}
