'use client';

import { useRouter } from 'next/navigation';
import { HeartIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    router.push('/auth');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-600" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
            <HeartIcon className="w-10 h-10 text-blue-500" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
          Зарегистрируйтесь и отправляйте реакции
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-8">
          Покажите, какие эмоции у вас вызывают записи
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-lg text-white font-medium transition-colors"
            style={{ backgroundColor: '#1B76FF' }}
          >
            Войти
          </button>
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            Создать аккаунт
          </button>
        </div>
      </div>
    </div>
  );
}
