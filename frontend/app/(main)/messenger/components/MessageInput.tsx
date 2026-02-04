'use client';

import { useState, useRef } from 'react';

interface MessageInputProps {
  messageText: string;
  sending: boolean;
  onMessageChange: (text: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function MessageInput({
  messageText,
  sending,
  onMessageChange,
  onSendMessage,
  onFileSelect,
}: MessageInputProps) {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(e as any);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4 relative">
      {/* Скрытый input для выбора файлов */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/*"
        onChange={onFileSelect}
        className="hidden"
      />
      
      {/* Меню вложений */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-4 bg-white rounded-xl shadow-lg p-1 w-48 border border-gray-200">
          <button 
            onClick={() => {
              setShowAttachMenu(false);
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-gray-900 text-sm">Фото</span>
          </button>

          <button 
            onClick={() => {
              setShowAttachMenu(false);
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'video/*';
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-gray-900 text-sm">Видео</span>
          </button>

          <button 
            onClick={() => {
              setShowAttachMenu(false);
              if (fileInputRef.current) {
                fileInputRef.current.accept = '*/*';
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-gray-900 text-sm">Файл</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Сообщение"
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-12 disabled:opacity-50"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <button 
          onClick={onSendMessage}
          disabled={!messageText.trim() || sending}
          className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full transition-all flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
