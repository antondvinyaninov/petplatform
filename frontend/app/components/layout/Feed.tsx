'use client';

import { useState, useEffect } from 'react';
import PostCard from '../shared/PostCard';
import CreatePost from '../shared/CreatePost';
import { postsApi, Post } from '../../../lib/api';

type PostType = 'all' | 'post' | 'sale' | 'lost' | 'found' | 'help';

interface FeedProps {
  activeFilter?: PostType;
}

export default function Feed({ activeFilter = 'all' }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postsApi.getAll();
      if (response.success && response.data) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

  const filteredPosts = activeFilter === 'all' 
    ? posts 
    : posts.filter(post => post.post_type === activeFilter);

  return (
    <div className="space-y-2.5">
      <CreatePost onPostCreated={handlePostCreated} />
      
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#1B76FF' }}></div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center text-gray-500">
          <p>Пока нет публикаций</p>
        </div>
      ) : (
        filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      )}
    </div>
  );
}
