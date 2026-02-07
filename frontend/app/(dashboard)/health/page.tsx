'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'slow';
  latency: number;
  checked_at: string;
}

interface HealthResponse {
  services: ServiceStatus[];
  overall: 'healthy' | 'degraded' | 'down';
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadHealth();

    if (autoRefresh) {
      const interval = setInterval(loadHealth, 10000); // Обновление каждые 10 секунд
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadHealth = async () => {
    try {
      const response = await fetch('/api/admin/health/services', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Error loading health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50';
      case 'slow':
        return 'text-yellow-600 bg-yellow-50';
      case 'offline':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'slow':
        return <ClockIcon className="w-6 h-6 text-yellow-600" />;
      case 'offline':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      default:
        return null;
    }
  };

  const getOverallStatus = () => {
    if (!health) return { text: 'Загрузка...', color: 'text-gray-600' };

    switch (health.overall) {
      case 'healthy':
        return { text: 'Все сервисы работают', color: 'text-green-600' };
      case 'degraded':
        return { text: 'Некоторые сервисы недоступны', color: 'text-yellow-600' };
      case 'down':
        return { text: 'Критическая ошибка', color: 'text-red-600' };
      default:
        return { text: 'Неизвестно', color: 'text-gray-600' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return 'Работает';
      case 'slow':
        return 'Медленно';
      case 'offline':
        return 'Недоступен';
      default:
        return 'Неизвестно';
    }
  };

  const stats = health ? {
    online: health.services.filter(s => s.status === 'online').length,
    slow: health.services.filter(s => s.status === 'slow').length,
    offline: health.services.filter(s => s.status === 'offline').length,
    total: health.services.length,
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Мониторинг сервисов</h1>
          <p className={`text-lg mt-2 ${overallStatus.color}`}>{overallStatus.text}</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={loadHealth}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Обновить
            </button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Автообновление (10 сек)</span>
            </label>
          </div>
          {health && (
            <div className="text-sm text-gray-500">
              Последняя проверка: {new Date(health.services[0]?.checked_at).toLocaleTimeString('ru-RU')}
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-600">Всего сервисов</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
              <div className="text-sm text-green-700">Работают</div>
              <div className="text-3xl font-bold text-green-900 mt-2">{stats.online}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-6">
              <div className="text-sm text-yellow-700">Медленно</div>
              <div className="text-3xl font-bold text-yellow-900 mt-2">{stats.slow}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
              <div className="text-sm text-red-700">Недоступны</div>
              <div className="text-3xl font-bold text-red-900 mt-2">{stats.offline}</div>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Статус сервисов</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {health?.services.map((service, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(service.status)}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{service.name}</div>
                      <div className="text-sm text-gray-500">{service.url}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Задержка</div>
                      <div className={`font-medium ${service.latency > 1000 ? 'text-red-600' : service.latency > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {service.latency}ms
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                      {getStatusLabel(service.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
