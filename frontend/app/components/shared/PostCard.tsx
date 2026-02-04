'use client';

import { useState } from 'react';
import { Post } from '../../../lib/api';
import { UserIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import PostComments from './PostComments';

type PostType = 'post' | 'sale' | 'lost' | 'found' | 'help';

const postTypeBadges: Record<Exclude<PostType, 'post'>, { label: string; icon: string; color: string; bg: string }> = {
  sale: { label: 'Объявление', icon: '📢', color: '#10B981', bg: '#D1FAE5' },
  lost: { label: 'Потерялся', icon: '🐾', color: '#F59E0B', bg: '#FEF3C7' },
  found: { label: 'Нашелся', icon: '💚', color: '#059669', bg: '#D1FAE5' },
  help: { label: 'Помощь', icon: '🆘', color: '#EF4444', bg: '#FEE2E2' },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

export default function PostCard({ post }: { post: Post }) {
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const badge = post.post_type && post.post_type !== 'post' ? postTypeBadges[post.post_type as Exclude<PostType, 'post'>] : null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-11 h-11 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
          {post.user?.avatar ? (
            <Image src={post.user.avatar} alt={post.user.name} width={44} height={44} className="object-cover" />
          ) : (
            <UserIcon className="w-6 h-6 text-gray-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link href={post.author_id ? `/id${post.author_id}` : '#'}>
              <h4 className="text-sm font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                {post.user?.name || 'Пользователь'}
              </h4>
            </Link>
            {badge && (
              <span 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all">
          <span className="text-lg">⋯</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-800 leading-relaxed">{post.content}</p>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-sm text-gray-600">
        <button className="flex items-center gap-2 hover:text-red-500 py-2 px-3 hover:bg-red-50 rounded-lg transition-all">
          <span>❤️</span>
          <span className="font-medium">0</span>
        </button>
        <div className="flex items-center gap-2 py-2 px-3">
          <span>💬</span>
          <span className="font-medium">{commentsCount}</span>
        </div>
        <button className="flex items-center gap-2 hover:text-green-600 py-2 px-3 hover:bg-green-50 rounded-lg transition-all">
          <span>↗️</span>
          <span className="font-medium">Поделиться</span>
        </button>
      </div>

      {/* Comments */}
      <div className="px-4 pb-3">
        <PostComments 
          postId={post.id} 
          initialCount={post.comments_count} 
          onCountChange={setCommentsCount}
        />
      </div>
    </div>
  );
}
