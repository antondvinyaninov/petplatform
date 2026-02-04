'use client';

import { useState, useEffect } from 'react';
import { friendsApi, FriendshipStatus } from '@/lib/api';

interface FriendButtonProps {
  userId: number;
  currentUserId: number;
}

export default function FriendButton({ userId, currentUserId }: FriendButtonProps) {
  const [status, setStatus] = useState<FriendshipStatus>({ status: 'none' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [userId]);

  const loadStatus = async () => {
    const result = await friendsApi.getStatus(userId);
    if (result.success && result.data) {
      setStatus(result.data);
    }
  };

  const handleSendRequest = async () => {
    setLoading(true);
    const result = await friendsApi.sendRequest(userId);
    if (result.success) {
      await loadStatus();
    }
    setLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!status.id) return;
    setLoading(true);
    const result = await friendsApi.acceptRequest(status.id);
    if (result.success) {
      await loadStatus();
    }
    setLoading(false);
  };

  const handleRejectRequest = async () => {
    if (!status.id) return;
    setLoading(true);
    const result = await friendsApi.rejectRequest(status.id);
    if (result.success) {
      await loadStatus();
    }
    setLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!status.id) return;
    if (!confirm('Удалить из друзей?')) return;
    
    setLoading(true);
    const result = await friendsApi.removeFriend(status.id);
    if (result.success) {
      await loadStatus();
    }
    setLoading(false);
  };

  // Не показываем кнопку для своего профиля
  if (userId === currentUserId) {
    return null;
  }

  // Входящий запрос - показываем кнопки принять/отклонить
  if (status.status === 'pending' && !status.is_outgoing) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleAcceptRequest}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Принять
        </button>
        <button
          onClick={handleRejectRequest}
          disabled={loading}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
        >
          Отклонить
        </button>
      </div>
    );
  }

  // Исходящий запрос - показываем "Запрос отправлен"
  if (status.status === 'pending' && status.is_outgoing) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
      >
        Запрос отправлен
      </button>
    );
  }

  // Уже друзья - показываем кнопку удаления
  if (status.status === 'accepted') {
    return (
      <button
        onClick={handleRemoveFriend}
        disabled={loading}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
      >
        Удалить из друзей
      </button>
    );
  }

  // Нет дружбы - показываем кнопку добавления
  return (
    <button
      onClick={handleSendRequest}
      disabled={loading}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
    >
      Добавить в друзья
    </button>
  );
}
