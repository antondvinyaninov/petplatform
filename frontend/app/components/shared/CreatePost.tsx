'use client';

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { postsApi, Post } from '../../../lib/api';
import { UserIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

type PostType = 'post' | 'sale' | 'lost' | 'found' | 'help';

const postTypes = [
  { id: 'post' as PostType, label: 'Пост', icon: '📝', color: '#1B76FF' },
  { id: 'sale' as PostType, label: 'Объявление', icon: '📢', color: '#10B981' },
  { id: 'lost' as PostType, label: 'Потерялся', icon: '🐾', color: '#F59E0B' },
  { id: 'found' as PostType, label: 'Нашелся', icon: '💚', color: '#059669' },
  { id: 'help' as PostType, label: 'Помощь', icon: '🆘', color: '#EF4444' },
];

interface CreatePostProps {
  onPostCreated?: (post: Post) => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<PostType>('post');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const currentType = postTypes.find(t => t.id === selectedType)!;

  const handleSubmit = async () => {
    if (!content.trim() || !isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await postsApi.create({
        content: content.trim(),
        post_type: selectedType,
      });

      if (response.success && response.data) {
        setContent('');
        setSelectedType('post');
        if (onPostCreated) {
          onPostCreated(response.data);
        }
      } else {
        alert(response.error || 'Ошибка создания поста');
      }
    } catch (error) {
      console.error('Ошибка создания поста:', error);
      alert('Ошибка создания поста');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      {/* Выбор типа поста */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {postTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              selectedType === type.id
                ? 'text-white shadow-sm'
                : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
            style={selectedType === type.id ? { backgroundColor: type.color } : {}}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="w-11 h-11 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {user?.avatar ? (
            <Image src={user.avatar} alt={user.name} width={44} height={44} className="object-cover" />
          ) : (
            <UserIcon className="w-6 h-6 text-gray-500" />
          )}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              selectedType === 'post' ? 'Что у вас нового?' :
              selectedType === 'sale' ? 'Опишите ваше объявление...' :
              selectedType === 'lost' ? 'Опишите потерявшегося питомца...' :
              selectedType === 'found' ? 'Опишите найденного питомца...' :
              'Опишите, какая помощь нужна...'
            }
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none bg-gray-50"
            style={{ '--tw-ring-color': currentType.color } as React.CSSProperties}
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <button 
                className="p-2 text-gray-500 rounded-lg transition-all"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = currentType.color;
                  e.currentTarget.style.backgroundColor = currentType.color + '20';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                <span className="text-lg">📷</span>
              </button>
              <button className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                <span className="text-lg">🎬</span>
              </button>
              <button className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all">
                <span className="text-lg">😊</span>
              </button>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={!content.trim() || !isAuthenticated || isSubmitting}
              className="px-5 py-2 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: currentType.color }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  const darker = currentType.color.replace(/[0-9A-F]{2}$/i, (m) => 
                    Math.max(0, parseInt(m, 16) - 30).toString(16).padStart(2, '0')
                  );
                  e.currentTarget.style.backgroundColor = darker;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentType.color;
              }}
            >
              {isSubmitting ? 'Публикация...' : 'Опубликовать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
