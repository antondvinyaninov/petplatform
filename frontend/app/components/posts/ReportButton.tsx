'use client';

import { useState } from 'react';
import { Flag, X } from 'lucide-react';

interface ReportButtonProps {
  targetType: 'post' | 'comment' | 'user' | 'organization' | 'pet';
  targetId: number;
  targetName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Спам или реклама', description: 'Нежелательная реклама или спам' },
  { value: 'harassment', label: 'Оскорбления', description: 'Домогательства или оскорбления' },
  { value: 'violence', label: 'Насилие', description: 'Призывы к насилию или жестокость' },
  { value: 'hate_speech', label: 'Разжигание ненависти', description: 'Дискриминация или ненависть' },
  { value: 'misinformation', label: 'Дезинформация', description: 'Ложная или вводящая в заблуждение информация' },
  { value: 'inappropriate', label: 'Неприемлемый контент', description: 'Контент для взрослых или неуместный' },
  { value: 'copyright', label: 'Авторские права', description: 'Нарушение авторских прав' },
  { value: 'animal_abuse', label: 'Жестокое обращение с животными', description: 'Жестокость или насилие над животными' },
  { value: 'fraud', label: 'Мошенничество', description: 'Обман или мошенничество' },
  { value: 'other', label: 'Другое', description: 'Другая причина' },
];

export default function ReportButton({ targetType, targetId, targetName, isOpen, onClose }: ReportButtonProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Выберите причину жалобы');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Используем API URL для прямого запроса к Gateway (как в других компонентах)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.zooplatforma.ru';
      
      // Получаем токен из localStorage (как в api.ts)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      let hasToken = false;
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        console.log('🔍 ReportButton: Checking auth token:', {
          hasToken: !!token,
          tokenValue: token ? `${token.substring(0, 20)}...` : 'null',
          tokenType: typeof token,
        });
        
        if (token && token !== 'authenticated') {
          headers['Authorization'] = `Bearer ${token}`;
          hasToken = true;
          console.log('✅ ReportButton: Added Authorization header');
        } else {
          console.log('⚠️ ReportButton: No valid token found in localStorage');
        }
      }
      
      console.log('📤 ReportButton: Sending request:', {
        url: `${API_URL}/api/reports`,
        hasAuthHeader: hasToken,
        credentials: 'include',
        body: {
          target_type: targetType,
          target_id: targetId,
          reason: selectedReason,
        }
      });
      
      const response = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason: selectedReason,
          description: description.trim(),
        }),
      });

      console.log('📥 ReportButton: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка отправки жалобы');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedReason('');
        setDescription('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Flag className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Пожаловаться</h2>
                  {targetName && (
                    <p className="text-sm text-gray-500">На: {targetName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Жалоба отправлена</h3>
                  <p className="text-gray-600">
                    Модераторы рассмотрят вашу жалобу в ближайшее время
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-6">
                    Выберите причину жалобы. Мы рассмотрим её и примем соответствующие меры.
                  </p>

                  {/* Reasons */}
                  <div className="space-y-2 mb-6">
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedReason === reason.value
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={reason.value}
                          checked={selectedReason === reason.value}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              selectedReason === reason.value
                                ? 'border-red-500 bg-red-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedReason === reason.value && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{reason.label}</div>
                            <div className="text-sm text-gray-500">{reason.description}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Дополнительная информация (необязательно)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Опишите проблему подробнее..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {description.length}/500
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                      disabled={isSubmitting}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!selectedReason || isSubmitting}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Отправка...' : 'Отправить жалобу'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
