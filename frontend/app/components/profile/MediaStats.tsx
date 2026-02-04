'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { PhotoIcon, VideoCameraIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface MediaStatsData {
  total_files: number;
  total_size: number;
  photos_count: number;
  videos_count: number;
  docs_count: number;
}

export default function MediaStats() {
  const [stats, setStats] = useState<MediaStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/api/media/stats');
      if (response.success && response.data) {
        setStats(response.data as MediaStatsData);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Медиафайлы</h2>
      
      <div className="space-y-3">
        {/* Фото */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <PhotoIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Фотографии</p>
              <p className="text-xs text-gray-500">{stats.photos_count} файлов</p>
            </div>
          </div>
        </div>

        {/* Видео */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <VideoCameraIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Видео</p>
              <p className="text-xs text-gray-500">{stats.videos_count} файлов</p>
            </div>
          </div>
        </div>

        {/* Документы */}
        {stats.docs_count > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <DocumentIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Документы</p>
                <p className="text-xs text-gray-500">{stats.docs_count} файлов</p>
              </div>
            </div>
          </div>
        )}

        {/* Общий размер */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Всего занято</span>
            <span className="text-sm font-semibold text-gray-900">{formatSize(stats.total_size)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-600">Всего файлов</span>
            <span className="text-sm font-semibold text-gray-900">{stats.total_files}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
