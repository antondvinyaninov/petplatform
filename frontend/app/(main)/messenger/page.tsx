'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import ChatList from './components/ChatList';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import { Chat, Message } from './types';

export default function MessengerPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const chatsLoaded = useRef(false);
  const queryParamProcessed = useRef(false);

  // Проверка авторизации
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Блокируем скролл страницы
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Загружаем чаты только один раз при монтировании
  useEffect(() => {
    if (user && !chatsLoaded.current) {
      chatsLoaded.current = true;
      fetchChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Обработка query параметра ?user=ID для открытия чата с конкретным пользователем
  useEffect(() => {
    // Ждем пока чаты загрузятся и проверяем что еще не обработали
    if (loading || !user || queryParamProcessed.current) return;
    
    // Безопасное получение query параметра
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('user');
    
    if (userIdParam) {
      queryParamProcessed.current = true; // Помечаем что обработали
      const targetUserId = parseInt(userIdParam);
      
      // Ищем существующий чат с этим пользователем
      const existingChat = chats.find(
        chat => chat.other_user?.id === targetUserId
      );
      
      if (existingChat) {
        // Открываем существующий чат
        console.log('Opening existing chat:', existingChat.id);
        setSelectedChatId(existingChat.id);
      } else {
        // Создаем временный чат (с отрицательным ID)
        console.log('Creating temporary chat for user:', targetUserId);
        const tempChat: Chat = {
          id: -targetUserId, // Временный ID
          other_user: {
            id: targetUserId,
            name: 'Загрузка...',
            last_name: '',
          },
          unread_count: 0,
        };
        
        setChats(prev => [tempChat, ...prev]);
        setSelectedChatId(tempChat.id);
        
        // Загружаем данные пользователя
        fetchUserData(targetUserId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, chats.length, user]);

  const fetchUserData = async (userId: number) => {
    console.log('Fetching user data for:', userId);
    try {
      const response = await apiClient.get<any>(`/api/users/${userId}`);
      
      if (response.success && response.data) {
        console.log('User data received:', response.data);
        
        // Обновляем временный чат с реальными данными пользователя
        setChats(prev => prev.map(chat => {
          if (chat.id === -userId) {
            console.log('Updating temp chat with user data:', response.data);
            return {
              ...chat,
              other_user: response.data,
            };
          }
          return chat;
        }));
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  // Загружаем сообщения при выборе чата
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId]);

  const fetchMessages = async (chatId: number) => {
    // Если это временный чат (ID < 0), не загружаем сообщения
    if (chatId < 0) {
      setMessages([]);
      return;
    }

    try {
      const response = await apiClient.get<Message[]>(`/api/chats/${chatId}/messages`);
      
      if (response.success && response.data) {
        setMessages(response.data);
      } else {
        console.error('Failed to fetch messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const fetchChats = async () => {
    if (isFetchingChats) return;
    
    setIsFetchingChats(true);
    try {
      const response = await apiClient.get<Chat[]>('/api/chats');
      
      if (response.success && response.data) {
        setChats(response.data);
      } else {
        console.error('Failed to fetch chats');
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    } finally {
      setLoading(false);
      setIsFetchingChats(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedChatId || sending) return;

    const selectedChat = chats.find(c => c.id === selectedChatId);
    
    if (!selectedChat?.other_user?.id) {
      console.error('Не найден получатель сообщения');
      return;
    }

    setSending(true);
    
    try {
      const response = await apiClient.post('/api/messages/send', {
        receiver_id: selectedChat.other_user.id,
        content: messageText.trim(),
      });

      if (response.success) {
        setMessageText('');
        
        // Если это был временный чат (ID < 0), нужно обновить список чатов
        if (selectedChatId < 0) {
          const updatedChatsResponse = await apiClient.get<Chat[]>('/api/chats');
          
          if (updatedChatsResponse.success && updatedChatsResponse.data) {
            const updatedChats = updatedChatsResponse.data;
            
            // Удаляем временный чат из списка
            setChats(prev => prev.filter(chat => chat.id >= 0));
            
            // Добавляем обновленные чаты
            setChats(updatedChats);
            
            const realChat = updatedChats.find((chat: Chat) => chat.other_user?.id === selectedChat.other_user?.id);
            
            if (realChat) {
              setSelectedChatId(realChat.id);
              fetchMessages(realChat.id);
            } else {
              console.error('Real chat not found after sending message');
            }
          }
        } else {
          // Обычный чат - перезагружаем сообщения и список чатов
          fetchMessages(selectedChatId);
          fetchChats();
        }
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedChatId) return;

    const selectedChat = chats.find(c => c.id === selectedChatId);
    if (!selectedChat?.other_user?.id) {
      console.error('Не найден получатель сообщения');
      return;
    }

    setSending(true);

    try {
      const formData = new FormData();
      formData.append('receiver_id', selectedChat.other_user.id.toString());
      
      if (messageText.trim()) {
        formData.append('content', messageText.trim());
      }

      Array.from(files).forEach(file => {
        formData.append('media', file);
      });

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/messages/send-media`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        setMessageText('');
        
        if (selectedChatId < 0) {
          await fetchChats();
          const updatedChatsResponse = await apiClient.get<Chat[]>('/api/chats');
          
          if (updatedChatsResponse.success && updatedChatsResponse.data) {
            const updatedChats = updatedChatsResponse.data;
            const realChat = updatedChats.find((chat: Chat) => chat.other_user?.id === selectedChat.other_user?.id);
            
            if (realChat) {
              setSelectedChatId(realChat.id);
              fetchMessages(realChat.id);
            }
          }
        } else {
          fetchMessages(selectedChatId);
          fetchChats();
        }
      } else {
        const errorText = await response.text();
        console.error('Ошибка отправки медиа:', errorText);
        alert('Ошибка отправки файла');
      }
    } catch (error) {
      console.error('Ошибка отправки медиа:', error);
      alert('Ошибка отправки файла');
    } finally {
      setSending(false);
    }
  };

  const handleCloseChat = () => {
    setSelectedChatId(null);
    setMessages([]);
  };

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="h-[calc(100vh-74px)] bg-white rounded-lg shadow-sm border border-gray-200 flex overflow-hidden">
      {/* Левая панель - список чатов */}
      <ChatList
        chats={chats}
        loading={loading}
        isCollapsed={isCollapsed}
        selectedChatId={selectedChatId}
        currentUserId={user?.id}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        onSelectChat={setSelectedChatId}
      />

      {/* Правая часть - окно чата */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChatId ? (
          <>
            {/* Шапка чата */}
            <ChatHeader 
              user={selectedChat?.other_user || null}
              onClose={handleCloseChat}
            />

            {/* Область сообщений */}
            <MessageList 
              messages={messages}
              currentUserId={user?.id}
            />

            {/* Поле ввода */}
            <MessageInput
              messageText={messageText}
              sending={sending}
              onMessageChange={setMessageText}
              onSendMessage={handleSendMessage}
              onFileSelect={handleFileSelect}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e3f2fd' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#e3f2fd'
          }}>
            <div className="text-center text-gray-400">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium">Выберите чат</p>
              <p className="text-sm mt-1">Чтобы начать общение</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
