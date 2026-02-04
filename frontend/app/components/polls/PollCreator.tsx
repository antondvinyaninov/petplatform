'use client';

import { useState } from 'react';
import { XMarkIcon, PlusIcon, ClockIcon } from '@heroicons/react/24/outline';

interface PollCreatorProps {
  onPollChange: (poll: PollData | null) => void;
  onClose: () => void;
}

export interface PollData {
  question: string;
  options: string[];
  multiple_choice: boolean;
  allow_vote_changes?: boolean;
  anonymous_voting?: boolean;
  expires_at?: string;
}

export default function PollCreator({ onPollChange, onClose }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [allowVoteChanges, setAllowVoteChanges] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [expirationTime, setExpirationTime] = useState('19:00');

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSave = () => {
    // Валидация
    if (!question.trim()) {
      alert('Введите вопрос опроса');
      return;
    }

    const filledOptions = options.filter(opt => opt.trim() !== '');
    if (filledOptions.length < 2) {
      alert('Добавьте минимум 2 варианта ответа');
      return;
    }

    let expiresAt: string | undefined = undefined;
    if (hasExpiration && expirationDate && expirationTime) {
      const [hours, minutes] = expirationTime.split(':');
      const expDate = new Date(expirationDate);
      expDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      expiresAt = expDate.toISOString();
    }

    const pollData: PollData = {
      question: question.trim(),
      options: filledOptions,
      multiple_choice: multipleChoice,
      allow_vote_changes: allowVoteChanges,
      anonymous_voting: anonymousVoting,
      expires_at: expiresAt,
    };

    onPollChange(pollData);
  };

  const handleCancel = () => {
    onPollChange(null);
    onClose();
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-[15px]">Создание опроса</h4>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-600" strokeWidth={2} />
        </button>
      </div>

      {/* Вопрос */}
      <div className="mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Задайте вопрос..."
          maxLength={500}
          className="w-full px-3 py-2 text-[15px] border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
        />
        <div className="text-[12px] text-gray-400 mt-1 text-right">
          {question.length}/500
        </div>
      </div>

      {/* Варианты ответов */}
      <div className="space-y-2 mb-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Вариант ${index + 1}`}
              maxLength={200}
              className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(index)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-gray-500" strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Добавить вариант */}
      {options.length < 10 && (
        <button
          onClick={addOption}
          className="flex items-center gap-2 text-[14px] text-blue-600 hover:text-blue-700 mb-3"
        >
          <PlusIcon className="w-4 h-4" strokeWidth={2} />
          Добавить вариант
        </button>
      )}

      {/* Настройки */}
      <div className="space-y-3 mb-3 p-3 bg-gray-50 rounded-lg">
        {/* Множественный выбор */}
        <button
          onClick={() => setMultipleChoice(!multipleChoice)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-[14px] text-gray-900">Множественный выбор</span>
          <div className={`relative w-11 h-6 rounded-full transition-colors ${multipleChoice ? 'bg-black' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${multipleChoice ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Разрешить изменение голоса */}
        <button
          onClick={() => setAllowVoteChanges(!allowVoteChanges)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-[14px] text-gray-900">Разрешить изменение голоса</span>
          <div className={`relative w-11 h-6 rounded-full transition-colors ${allowVoteChanges ? 'bg-black' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${allowVoteChanges ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Анонимное голосование */}
        <button
          onClick={() => setAnonymousVoting(!anonymousVoting)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex-1 text-left">
            <div className="text-[14px] text-gray-900">Анонимное голосование</div>
            <div className="text-[12px] text-gray-500">Скрыть имена проголосовавших</div>
          </div>
          <div className={`relative w-11 h-6 rounded-full transition-colors ${anonymousVoting ? 'bg-black' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${anonymousVoting ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Срок действия */}
        <button
          onClick={() => setHasExpiration(!hasExpiration)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-[14px] text-gray-900">Установить срок действия</span>
          <div className={`relative w-11 h-6 rounded-full transition-colors ${hasExpiration ? 'bg-black' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${hasExpiration ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Выбор даты и времени истечения */}
        {hasExpiration && (
          <div className="pt-2 space-y-2">
            <input
              type="date"
              value={expirationDate ? expirationDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setExpirationDate(e.target.value ? new Date(e.target.value) : null)}
              className="w-full px-3 py-2 text-[14px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
            />
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-gray-400" strokeWidth={2} />
              <input
                type="time"
                value={expirationTime}
                onChange={(e) => setExpirationTime(e.target.value)}
                className="flex-1 px-3 py-2 text-[14px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Кнопка сохранения */}
      <button
        onClick={handleSave}
        className="w-full py-2 bg-black text-white rounded-lg text-[14px] font-semibold hover:bg-gray-800 transition-colors"
      >
        Добавить опрос
      </button>
    </div>
  );
}
