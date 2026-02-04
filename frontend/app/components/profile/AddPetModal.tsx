'use client';

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';

interface AddPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPetModal({ isOpen, onClose, onSuccess }: AddPetModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    breed: '',
    gender: '',
    birth_date: '',
    color: '',
    status: 'home'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!user) {
      setError('Необходимо войти в систему');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8100/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id.toString(),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
        // Сбросить форму
        setFormData({
          name: '',
          species: '',
          breed: '',
          gender: '',
          birth_date: '',
          color: '',
          status: 'home'
        });
      } else {
        setError(data.error || 'Ошибка при добавлении питомца');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
      console.error('Error adding pet:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Добавить питомца</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя питомца <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: Барсик"
            />
          </div>

          {/* Вид */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Вид <span className="text-red-500">*</span>
            </label>
            <select
              name="species"
              value={formData.species}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите вид</option>
              <option value="Собака">Собака</option>
              <option value="Кошка">Кошка</option>
              <option value="Птица">Птица</option>
              <option value="Грызун">Грызун</option>
              <option value="Рептилия">Рептилия</option>
              <option value="Другое">Другое</option>
            </select>
          </div>

          {/* Порода */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Порода
            </label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: Лабрадор"
            />
          </div>

          {/* Пол */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пол
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Не указан</option>
              <option value="male">Самец</option>
              <option value="female">Самка</option>
            </select>
          </div>

          {/* Дата рождения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Дата рождения
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Окрас */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Окрас
            </label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: Рыжий"
            />
          </div>

          {/* Статус */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Статус
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="home">Дома</option>
              <option value="looking_for_home">Ищет дом</option>
              <option value="lost">Потерялся</option>
              <option value="found">Найден</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1B76FF' }}
            >
              {isSubmitting ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
