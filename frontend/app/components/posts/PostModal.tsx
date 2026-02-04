'use client';

import { useEffect, useState, useRef } from 'react';
import { XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import PostComments from '../shared/PostComments';
import PollDisplay from '../polls/PollDisplay';
import PhotoGrid from './PhotoGrid';
import { commentsApi, Comment } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

import { getFullName, getMediaUrl } from '../../../lib/utils';

interface User {
  id: number;
  name: string;
  last_name?: string;
  email: string;
  avatar?: string;
}

interface Organization {
  id: number;
  name: string;
  short_name?: string;
  logo?: string;
  type?: string;
}

interface Pet {
  id: number;
  name: string;
  species: string;
  photo?: string;
}

interface PollOption {
  id: number;
  option_text: string;
  votes_count: number;
  percentage?: number;
  voters?: PollVoter[];
}

interface PollVoter {
  user_id: number;
  user_name: string;
  avatar?: string;
}

interface Poll {
  id: number;
  question: string;
  multiple_choice: boolean;
  allow_vote_changes: boolean;
  anonymous_voting: boolean;
  expires_at?: string;
  options: PollOption[];
  total_voters: number;
  user_voted: boolean;
  user_votes?: number[];
  is_expired: boolean;
  voters?: PollVoter[];
}

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
  user?: User;
  pets?: Pet[];
  poll?: Poll;
  comments_count: number;
}

interface PostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export default function PostModal({ post, isOpen, onClose, onCountChange }: PostModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: number; userName: string; userId: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Сохраняем текущую позицию скролла
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      loadComments();
    } else {
      setComments([]);
      setReplyTo(null);
      setNewComment('');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (!isOpen) {
        // Восстанавливаем позицию скролла
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen, onClose]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await commentsApi.getPostComments(post.id);
      if (response.success && response.data) {
        setComments(response.data);
        const count = response.data.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
        onCountChange?.(count);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated || isSubmitting) return;

    // Сохраняем текущую позицию скролла
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;

    setIsSubmitting(true);
    try {
      const response = await commentsApi.create(post.id, {
        content: newComment.trim(),
        parent_id: replyTo?.commentId,
        reply_to_user_id: replyTo?.userId,
      });

      if (response.success && response.data) {
        let newComments;
        if (replyTo) {
          newComments = comments.map(c => {
            if (c.id === replyTo.commentId) {
              return {
                ...c,
                replies: [...(c.replies || []), response.data!]
              };
            }
            return c;
          });
        } else {
          newComments = [...comments, response.data];
        }
        setComments(newComments);
        
        const count = newComments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
        onCountChange?.(count);
        
        setNewComment('');
        setReplyTo(null);
        
        // Убираем фокус с input
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        // Восстанавливаем позицию скролла через двойной RAF
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              // Если это новый корневой комментарий, добавляем небольшой отступ вниз
              if (!replyTo) {
                scrollContainerRef.current.scrollTop = scrollTop + 100;
              } else {
                scrollContainerRef.current.scrollTop = scrollTop;
              }
            }
          });
        });
      } else {
        alert(response.error || 'Ошибка создания комментария');
      }
    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      alert('Ошибка создания комментария');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number, parentId?: number) => {
    if (!confirm('Удалить комментарий?')) return;

    try {
      const response = await commentsApi.delete(commentId);
      if (response.success) {
        let newComments;
        if (parentId) {
          newComments = comments.map(c => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: c.replies?.filter(r => r.id !== commentId)
              };
            }
            return c;
          });
        } else {
          newComments = comments.filter(c => c.id !== commentId);
        }
        setComments(newComments);
        
        const count = newComments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
        onCountChange?.(count);
      } else {
        alert(response.error || 'Ошибка удаления комментария');
      }
    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      alert('Ошибка удаления комментария');
    }
  };

  if (!isOpen) return null;

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ru });
    } catch {
      return 'недавно';
    }
  };

  const getTagTextColor = (tag: string) => {
    switch (tag) {
      case 'потерян':
        return 'text-red-700';
      case 'найден':
        return 'text-green-700';
      case 'ищет дом':
        return 'text-orange-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Метка</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto"
          style={{ overflowAnchor: 'none' }}
        >
          {/* Post Content */}
          <div className="px-6 py-4">
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold overflow-hidden">
                {post.user?.avatar ? (
                  <img src={getMediaUrl(post.user.avatar) || ''} alt={post.user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{getFullName(post.user?.name || 'Пользователь', post.user?.last_name)}</div>
                <div className="text-sm text-gray-500">{getTimeAgo(post.created_at)}</div>
              </div>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex gap-2 mb-3">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getTagTextColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="text-gray-900 mb-4 whitespace-pre-wrap text-base">{post.content}</div>

            {/* Photos/Videos */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="mb-4">
                <PhotoGrid 
                  photos={post.attachments.filter(a => a.type === 'image' || a.type === 'video' || a.media_type === 'image' || a.media_type === 'video')}
                />
              </div>
            )}

            {/* Poll */}
            {post.poll && (
              <div className="mb-4">
                <PollDisplay poll={post.poll} />
              </div>
            )}

            {/* Attached Pets */}
            {post.pets && post.pets.length > 0 && (
              <div className="space-y-2 mb-4">
                {post.pets.map((pet) => (
                  <div
                    key={pet.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {pet.photo ? (
                        <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        pet.name[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{pet.name}</div>
                      <div className="text-sm text-gray-600">{pet.species}</div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <PostComments
            postId={post.id}
            comments={comments}
            isLoading={isLoading}
            onReplyClick={(commentId, userName, userId) => setReplyTo({ commentId, userName, userId })}
            onDelete={handleDelete}
            displayOnly={true}
          />
        </div>

        {/* Sticky Footer with Input - вне scroll области */}
        {isAuthenticated && (
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <form onSubmit={handleSubmit}>
              {replyTo && (
                <div className="mb-2 text-sm text-gray-600 flex items-center gap-2">
                  <span>Ответ для <span className="font-semibold" style={{ color: '#1B76FF' }}>{replyTo.userName}</span></span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden text-white text-sm font-semibold">
                  {user?.avatar ? (
                    <img src={getMediaUrl(user.avatar) || ''} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? `Ответить ${replyTo.userName}...` : "Написать комментарий..."}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent bg-white"
                    style={{ '--tw-ring-color': '#1B76FF' } as React.CSSProperties}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#1B76FF' }}
                  >
                    {isSubmitting ? '...' : 'Отправить'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
