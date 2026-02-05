'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '../types';
import { getMediaFileUrl } from '@/lib/urls';

interface MessageListProps {
  messages: Message[];
  currentUserId?: number;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e3f2fd' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      backgroundColor: '#e3f2fd'
    }}>
      <div className="max-w-4xl mx-auto space-y-3">
        {messages.map((message, index) => {
          const isMyMessage = message.sender_id === currentUserId;
          
          let messageTime = '';
          try {
            if (message.created_at) {
              const date = new Date(message.created_at);
              if (!isNaN(date.getTime())) {
                messageTime = date.toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
              }
            }
          } catch (e) {
            console.error('Ошибка парсинга даты:', message.created_at);
          }

          // Проверяем, является ли это сообщением с животным
          let petData = null;
          try {
            if (message.content && message.content.startsWith('{')) {
              const parsed = JSON.parse(message.content);
              if (parsed.type === 'pet') {
                petData = parsed;
              }
            }
          } catch (e) {
            // Не JSON, обычное сообщение
          }

          // Пропускаем сообщения без контента и без вложений
          if (!message.content && (!message.attachments || message.attachments.length === 0)) {
            return null;
          }

          return (
            <div key={`${message.id}-${index}`} className={`flex items-end gap-2 ${isMyMessage ? 'justify-end' : ''}`}>
              {/* Сообщение с животным */}
              {petData ? (
                <button
                  onClick={() => router.push(`/pets/${petData.id}`)}
                  className={`${isMyMessage ? 'bg-blue-500 text-white rounded-2xl rounded-br-md hover:bg-blue-600' : 'bg-white text-gray-900 rounded-2xl rounded-bl-md hover:bg-gray-50'} p-3 shadow-sm max-w-[70%] transition-colors text-left`}
                >
                  <div className="flex items-center gap-3">
                    {/* Фото животного */}
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                      {petData.photo ? (
                        <img 
                          src={getMediaFileUrl(petData.photo)} 
                          alt={petData.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">🐾</span>
                      )}
                    </div>

                    {/* Информация о животном */}
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
                        {petData.name}
                      </div>
                      <div className={`text-xs ${isMyMessage ? 'text-blue-100' : 'text-gray-600'}`}>
                        {petData.species}
                      </div>
                      {messageTime && (
                        <div className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                          {messageTime}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                <div className={`${isMyMessage ? 'bg-blue-500 text-white rounded-2xl rounded-br-md' : 'bg-white text-gray-900 rounded-2xl rounded-bl-md'} px-4 py-2 shadow-sm max-w-[70%]`}>
                  {/* Вложения */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.id}>
                          {attachment.file_type === 'image' && (
                            <img
                              src={getMediaFileUrl(attachment.file_path)}
                              alt="Изображение"
                              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(getMediaFileUrl(attachment.file_path), '_blank')}
                              onLoad={() => scrollToBottom()}
                            />
                          )}
                          {attachment.file_type === 'video' && (
                            <video
                              src={getMediaFileUrl(attachment.file_path)}
                              controls
                              className="rounded-lg max-w-full h-auto"
                              onLoadedData={() => scrollToBottom()}
                            />
                          )}
                          {attachment.file_type !== 'image' && attachment.file_type !== 'video' && (
                            <FileAttachment 
                              attachment={attachment} 
                              isMyMessage={isMyMessage}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Текст сообщения */}
                  {message.content && <p>{message.content}</p>}
                  
                  {messageTime && (
                    <div className={`flex items-center ${isMyMessage ? 'justify-end' : ''} gap-1 mt-1`}>
                      <span className={`text-xs ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {messageTime}
                      </span>
                      {isMyMessage && (
                        <>
                          {message.is_read ? (
                            // Две галочки - прочитано
                            <>
                              <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <svg className="w-4 h-4 text-blue-200 -ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </>
                          ) : (
                            // Одна галочка - отправлено, но не прочитано
                            <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {/* Элемент для прокрутки к последнему сообщению */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

// Компонент для отображения файловых вложений
function FileAttachment({ attachment, isMyMessage }: { attachment: any; isMyMessage: boolean }) {
  const fileName = attachment.file_path.split('/').pop() || 'Файл';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Определяем иконку и цвет по расширению
  let iconColor = 'text-gray-600';
  let bgColor = 'bg-gray-100';
  let label = ext.toUpperCase() || 'FILE';
  let icon = null;
  
  if (['pdf'].includes(ext)) {
    iconColor = 'text-red-600';
    bgColor = 'bg-red-100';
    label = 'PDF';
    icon = (
      <svg className={`w-6 h-6 ${isMyMessage ? 'text-white' : iconColor}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
        <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/>
      </svg>
    );
  } else if (['doc', 'docx'].includes(ext)) {
    iconColor = 'text-blue-600';
    bgColor = 'bg-blue-100';
    label = 'DOC';
    icon = (
      <svg className={`w-6 h-6 ${isMyMessage ? 'text-white' : iconColor}`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
        <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/>
      </svg>
    );
  } else {
    // По умолчанию
    icon = (
      <svg className={`w-6 h-6 ${isMyMessage ? 'text-white' : iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  
  return (
    <a
      href={getMediaFileUrl(attachment.file_path)}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-lg ${isMyMessage ? 'bg-blue-600' : 'bg-white border border-gray-200'} hover:opacity-80 transition-opacity`}
    >
      <div className={`w-10 h-10 rounded-lg ${isMyMessage ? 'bg-blue-700' : bgColor} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
          {fileName}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isMyMessage ? 'text-blue-100' : iconColor}`}>
            {label}
          </span>
          <span className={`text-xs ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
            • {(attachment.file_size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
      <svg className={`w-5 h-5 ${isMyMessage ? 'text-white' : 'text-gray-400'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </a>
  );
}
