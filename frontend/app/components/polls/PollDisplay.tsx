'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { CheckIcon } from '@heroicons/react/24/outline';

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

interface PollDisplayProps {
  poll: Poll;
  onVoteUpdate?: (updatedPoll: Poll) => void;
}

export default function PollDisplay({ poll: initialPoll, onVoteUpdate }: PollDisplayProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOptions, setSelectedOptions] = useState<number[]>(poll.user_votes || []);
  const [isVoting, setIsVoting] = useState(false);
  const [showVotersForOption, setShowVotersForOption] = useState<number | null>(null);

  // ✅ Синхронизируем selectedOptions с poll.user_votes при обновлении
  useEffect(() => {
    console.log('📊 PollDisplay: syncing user_votes', {
      user_votes: poll.user_votes,
      user_voted: poll.user_voted,
      current_selected: selectedOptions
    });
    if (poll.user_votes) {
      setSelectedOptions(poll.user_votes);
    }
  }, [poll.user_votes]);

  // ✅ Обновляем poll когда приходит новый initialPoll (например, после обновления страницы)
  useEffect(() => {
    console.log('📊 PollDisplay: updating poll from initialPoll', {
      user_voted: initialPoll.user_voted,
      user_votes: initialPoll.user_votes
    });
    setPoll(initialPoll);
  }, [initialPoll]);

  const handleOptionToggle = (optionId: number) => {
    // Если опрос истек, ничего не делаем
    if (poll.is_expired) {
      return;
    }

    // Если пользователь уже голосовал и изменение не разрешено, ничего не делаем
    if (poll.user_voted && !poll.allow_vote_changes) {
      return;
    }

    if (poll.multiple_choice) {
      // Множественный выбор
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId));
      } else {
        setSelectedOptions([...selectedOptions, optionId]);
      }
    } else {
      // Один вариант
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0) return;
    if (poll.is_expired) return;

    setIsVoting(true);
    try {
      const response = await apiClient.post<Poll>(`/api/polls/${poll.id}/vote`, {
        option_ids: selectedOptions,
      });

      if (response.data) {
        setPoll(response.data);
        onVoteUpdate?.(response.data);
      }
    } catch (error) {
      console.error('Ошибка голосования:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleUnvote = async () => {
    setIsVoting(true);
    try {
      const response = await apiClient.delete<Poll>(`/api/polls/${poll.id}/vote`);

      if (response.data) {
        setPoll(response.data);
        setSelectedOptions([]);
        onVoteUpdate?.(response.data);
      }
    } catch (error) {
      console.error('Ошибка отмены голоса:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const showResults = poll.user_voted || poll.is_expired;
  const canChangeVote = poll.user_voted && poll.allow_vote_changes && !poll.is_expired;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Вопрос */}
      <div className="font-semibold text-[15px] text-gray-900 mb-3">
        {poll.question}
      </div>

      {/* Варианты */}
      <div className="space-y-2 mb-3">
        {poll.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const userVoted = poll.user_votes?.includes(option.id);

          if (showResults && !canChangeVote) {
            // Показываем результаты (без возможности изменения)
            const percentage = option.percentage || 0;
            const hasVoters = !poll.anonymous_voting && option.voters && option.voters.length > 0;
            const isOpen = showVotersForOption === option.id;
            
            return (
              <div key={option.id} className="relative mb-3">
                <div className="relative">
                  <button
                    onClick={() => {
                      if (!poll.anonymous_voting && hasVoters) {
                        setShowVotersForOption(isOpen ? null : option.id);
                      }
                    }}
                    disabled={poll.anonymous_voting || !hasVoters}
                    className={`w-full ${!poll.anonymous_voting && hasVoters ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
                  >
                    <div className="relative z-10 flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white">
                      <div className="flex items-center gap-2 flex-1">
                        {userVoted && (
                          <CheckIcon className="w-4 h-4 text-blue-600" strokeWidth={2} />
                        )}
                        <span className="text-[14px] text-gray-900">{option.option_text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-gray-600">{option.votes_count}</span>
                        <span className="text-[13px] font-semibold text-gray-900">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Прогресс бар */}
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-100 rounded-lg transition-all"
                      style={{ width: `${percentage}%`, zIndex: 0 }}
                    />
                  </button>
                </div>
                
                {/* Список проголосовавших - показываем только при клике */}
                {hasVoters && isOpen && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-[12px] font-semibold text-gray-700 mb-2">
                      Проголосовали ({option.voters!.length}):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {option.voters!.map((voter) => (
                        <div key={voter.user_id} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-gray-200">
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {voter.avatar ? (
                              <img src={voter.avatar} alt={voter.user_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-semibold text-gray-600">
                                {voter.user_name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] text-gray-900">{voter.user_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          } else {
            // Показываем варианты для голосования (или изменения голоса)
            return (
              <button
                key={option.id}
                onClick={() => handleOptionToggle(option.id)}
                disabled={poll.is_expired}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${poll.is_expired ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Чекбокс или радио */}
                <div
                  className={`w-5 h-5 rounded ${
                    poll.multiple_choice ? 'rounded-md' : 'rounded-full'
                  } border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <span className="text-[14px] text-gray-900">{option.option_text}</span>
              </button>
            );
          }
        })}
      </div>

      {/* Кнопки */}
      {!poll.is_expired && (
        <div className="space-y-2">
          {/* Кнопка голосования или изменения */}
          {(!showResults || canChangeVote) && (
            <button
              onClick={handleVote}
              disabled={selectedOptions.length === 0 || isVoting}
              className="w-full py-2 bg-black text-white rounded-lg text-[14px] font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isVoting ? (canChangeVote ? 'Изменение...' : 'Голосование...') : (canChangeVote ? 'Изменить голос' : 'Проголосовать')}
            </button>
          )}
          
          {/* Кнопка отмены голоса */}
          {showResults && poll.user_voted && !canChangeVote && (
            <button
              onClick={handleUnvote}
              disabled={isVoting}
              className="w-full py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-[14px] font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isVoting ? 'Отмена...' : 'Отменить голос'}
            </button>
          )}
        </div>
      )}

      {/* Информация */}
      <div className="flex items-center justify-between text-[13px] text-gray-500 mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span>{poll.total_voters} {poll.total_voters === 1 ? 'голос' : 'голосов'}</span>
          {poll.anonymous_voting && (
            <span className="text-gray-400">• Анонимно</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {poll.is_expired && <span className="text-red-600">Опрос завершен</span>}
          {!poll.is_expired && poll.expires_at && (
            <span>
              До {new Date(poll.expires_at).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
