'use client';

import { useState, useEffect } from 'react';
import { Flag, CheckCircle, Clock } from 'lucide-react';

interface Report {
  id: number;
  reporter_id: number;
  target_type: string;
  target_id: number;
  reason: string;
  description: string;
  status: string;
  moderator_id?: number;
  moderator_action?: string;
  moderator_comment?: string;
  reviewed_at?: string;
  created_at: string;
  reporter_name: string;
  reporter_email: string;
  moderator_name?: string;
}

interface Stats {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  by_type: Record<string, number>;
}

const REASON_LABELS: Record<string, string> = {
  spam: 'Спам',
  harassment: 'Оскорбления',
  violence: 'Насилие',
  hate_speech: 'Разжигание ненависти',
  misinformation: 'Дезинформация',
  inappropriate: 'Неприемлемый контент',
  copyright: 'Авторские права',
  animal_abuse: 'Жестокое обращение с животными',
  fraud: 'Мошенничество',
  other: 'Другое',
};

const ACTION_LABELS: Record<string, string> = {
  no_action: 'Без действий',
  warning: 'Предупреждение',
  content_removed: 'Контент удалён',
  user_banned: 'Пользователь заблокирован',
  user_suspended: 'Временная блокировка',
};

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved'>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/moderation/reports?status=${statusFilter}`, {
          credentials: 'include',
        }),
        fetch('/api/admin/moderation/stats', {
          credentials: 'include',
        }),
      ]);

      const reportsData = await reportsRes.json();
      const statsData = await statsRes.json();

      // Проверяем формат ответа
      if (Array.isArray(reportsData)) {
        setReports(reportsData);
      } else if (reportsData.success && reportsData.data) {
        setReports(reportsData.data);
      }

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      } else if (statsData.total_reports !== undefined) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedReport || !reviewAction) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/moderation/reports/${selectedReport.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: reviewAction,
            comment: reviewComment,
          }),
        }
      );

      if (response.ok) {
        setSelectedReport(null);
        setReviewAction('');
        setReviewComment('');
        loadData();
      }
    } catch (error) {
      console.error('Ошибка рассмотрения жалобы:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Модерация</h1>
        <p className="text-gray-600 mt-2">Управление жалобами и контентом</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Ожидают рассмотрения</p>
                <p className="text-4xl font-bold mt-2">{stats.pending_reports}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Рассмотрено</p>
                <p className="text-4xl font-bold mt-2">{stats.resolved_reports}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-100" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Всего жалоб</p>
                <p className="text-4xl font-bold mt-2">{stats.total_reports}</p>
              </div>
              <Flag className="w-12 h-12 text-red-100" />
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            statusFilter === 'pending'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Ожидают рассмотрения
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            statusFilter === 'resolved'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Рассмотренные
        </button>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Нет жалоб</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        {REASON_LABELS[report.reason] || report.reason}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {report.target_type} #{report.target_id}
                      </span>
                    </div>

                    <p className="text-gray-900 mb-2">{report.description || 'Без описания'}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>От: {report.reporter_name}</span>
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleString('ru-RU')}</span>
                    </div>

                    {report.moderator_name && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 font-medium">
                            Рассмотрено: {ACTION_LABELS[report.moderator_action || ''] || report.moderator_action}
                          </span>
                        </div>
                        {report.moderator_comment && (
                          <p className="text-sm text-gray-600 mt-1">{report.moderator_comment}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Модератор: {report.moderator_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {statusFilter === 'pending' && (
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Рассмотреть
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Рассмотрение жалобы #{selectedReport.id}</h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Причина</p>
                <p className="font-medium">{REASON_LABELS[selectedReport.reason]}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Описание</p>
                <p className="text-gray-900">{selectedReport.description || 'Без описания'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Объект жалобы</p>
                <p className="font-medium">
                  {selectedReport.target_type} #{selectedReport.target_id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Действие
                </label>
                <select
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Выберите действие</option>
                  <option value="no_action">Без действий (жалоба необоснованна)</option>
                  <option value="warning">Предупреждение пользователю</option>
                  <option value="content_removed">Удалить контент</option>
                  <option value="user_suspended">Временная блокировка</option>
                  <option value="user_banned">Постоянная блокировка</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Комментарий
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Опишите принятое решение..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setReviewAction('');
                    setReviewComment('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  onClick={handleReview}
                  disabled={!reviewAction || isSubmitting}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить решение'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
