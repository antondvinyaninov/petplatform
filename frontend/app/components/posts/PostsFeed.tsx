'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import PostCard from './PostCard';
import CreatePost from './CreatePost';

interface Post {
  id: number;
  author_id: number;
  author_type: string;
  content: string;
  attached_pets: number[];
  attachments: any[];
  tags: string[];
  created_at: string;
  updated_at: string;
  user?: any;
  pets?: any[];
  comments_count: number;
  has_poll?: boolean; // ✅ Есть ли опрос у поста
  can_edit?: boolean; // ✅ Добавлено поле can_edit из Backend
}

interface PostsFeedProps {
  activeFilter?: 'for-you' | 'following' | 'city' | 'lost' | 'found' | 'looking-for-home';
}

export default function PostsFeed({ activeFilter = 'for-you' }: PostsFeedProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    try {
      setLoading(true);
      // ✅ Убрали include_polls=true - опросы загружаются по требованию
      const response = await apiClient.get<Post[]>(`/api/posts?filter=${activeFilter}`);
      setPosts(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = (postId: number) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  const handleUpdatePost = async (postId: number) => {
    try {
      // Получаем обновленный пост с сервера
      const response = await apiClient.get<Post>(`/api/posts/${postId}`);
      
      if (response.success && response.data) {
        // Обновляем пост в списке
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId ? response.data as Post : post
          )
        );
      }
    } catch (error) {
      console.error('Ошибка обновления поста:', error);
      // В случае ошибки перезагружаем все посты
      loadPosts();
    }
  };

  useEffect(() => {
    // Ждем пока AuthContext загрузится перед загрузкой постов
    if (!isLoading) {
      loadPosts();
    }
  }, [activeFilter, isLoading]);

  return (
    <div className="space-y-2.5">
      {/* Create Post - только для авторизованных (не показываем пока загрузка) */}
      {!isLoading && isAuthenticated && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CreatePost onPostCreated={loadPosts} />
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
          {activeFilter === 'city' ? (
            <>
              <p className="font-medium">Нет постов из вашего города</p>
              <p className="text-sm mt-2">
                Убедитесь, что вы указали свой город в профиле, и другие пользователи тоже указали свой город
              </p>
              <a 
                href="/profile/edit" 
                className="text-sm font-medium mt-3 inline-block"
                style={{ color: '#1B76FF' }}
              >
                Заполнить город в профиле →
              </a>
            </>
          ) : (
            <>
              <p>Пока нет постов</p>
              {isAuthenticated && <p className="text-sm mt-2">Создайте первый пост!</p>}
            </>
          )}
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onDelete={handleDeletePost}
              onUpdate={handleUpdatePost}
            />
          ))}
        </>
      )}
    </div>
  );
}
