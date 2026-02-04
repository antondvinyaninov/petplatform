'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { getMediaUrl, getFullName } from '@/lib/utils';
import {
  PhotoIcon,
  MapPinIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  UserIcon,
  ListBulletIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { GiPawPrint } from 'react-icons/gi';
import { MdPets } from 'react-icons/md';
import PollCreator, { PollData } from '../polls/PollCreator';
import { useMediaUpload, UploadedMedia } from '../../hooks/useMediaUpload';
import { useChunkedUpload, ChunkedUploadProgress } from '../../hooks/useChunkedUpload';
import LocationMap from '../shared/LocationMap';
import MiniMap from '../shared/MiniMap';

interface CreatePostProps {
  onPostCreated?: () => void;
  editMode?: boolean;
  editPost?: {
    id: number;
    content: string;
    attached_pets?: number[];
    attachments?: any[];
    tags?: string[];
    poll?: any;
    location_lat?: number;
    location_lon?: number;
    location_name?: string;
  };
  onPostUpdated?: () => void;
}

type ReplySettingType = 'anyone' | 'followers' | 'following' | 'mentions';

export default function CreatePost({ onPostCreated, editMode = false, editPost, onPostUpdated }: CreatePostProps) {
  const { user } = useAuth();
  const { uploadMultiple, uploading, optimizing } = useMediaUpload();
  const { uploadFile: uploadChunked } = useChunkedUpload();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [showReplySettings, setShowReplySettings] = useState(false);
  const [replySetting, setReplySetting] = useState<ReplySettingType>('anyone');
  const [verifyReplies, setVerifyReplies] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState('19:00');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftMenuOpen, setDraftMenuOpen] = useState<number | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]); // Загруженные медиа
  const [uploadingFiles, setUploadingFiles] = useState<{
    file: File;
    preview: string;
    status: 'uploading' | 'optimizing';
    progress: number;
    uploadedChunks?: number;
    totalChunks?: number;
  }[]>([]); // Файлы в процессе загрузки
  const [showPetsModal, setShowPetsModal] = useState(false);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [pets, setPets] = useState<any[]>([]); // Список питомцев пользователя
  
  // Организации для публикации
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<'user' | 'organization'>('user');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  // Геолокация
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Загружаем данные поста при редактировании
  useEffect(() => {
    if (editMode && editPost) {
      setContent(editPost.content || '');
      setSelectedPets(editPost.attached_pets || []);
      if (editPost.attachments && editPost.attachments.length > 0) {
        setUploadedMedia(editPost.attachments.map(att => ({
          id: att.id || 0,
          url: att.url,
          media_type: att.type === 'video' ? 'video' : 'image',
          file_name: att.file_name || '',
          original_name: att.file_name || '',
          file_size: att.size || 0,
          mime_type: att.type === 'video' ? 'video/mp4' : 'image/jpeg',
          size: att.size || 0,
        })));
      }
      // Загружаем местоположение если оно есть
      if (editPost.location_lat && editPost.location_lon) {
        setLocation({
          lat: editPost.location_lat,
          lon: editPost.location_lon,
          name: editPost.location_name || 'Местоположение',
        });
      }
      // Загружаем опрос если он есть
      if (editPost.poll) {
        setPollData({
          question: editPost.poll.question,
          options: editPost.poll.options.map((opt: any) => opt.text),
          multiple_choice: editPost.poll.multiple_choice || false,
          allow_vote_changes: editPost.poll.allow_vote_changes || false,
          anonymous_voting: editPost.poll.anonymous_voting || false,
          expires_at: editPost.poll.expires_at,
        });
        setShowPollCreator(false);
      }
      // Открываем модальное окно сразу в режиме редактирования
      setShowModal(true);
    }
  }, [editMode, editPost]);

  const handleSubmit = async () => {
    if (!content.trim() && !pollData && uploadedMedia.length === 0) return;

    console.log('📤 Submitting post with media:', uploadedMedia);

    setIsSubmitting(true);
    try {
      const postData: any = {
        content,
        attached_pets: selectedPets,
        attachments: uploadedMedia.map((media) => ({
          url: media.url,
          type: media.media_type === 'video' ? 'video' : 'image',
          media_type: media.media_type,
          file_name: media.file_name,
        })),
        tags: [],
        author_type: selectedAuthor,
        organization_id: selectedAuthor === 'organization' ? selectedOrganizationId : null,
        location_lat: location?.lat,
        location_lon: location?.lon,
        location_name: location?.name,
      };

      console.log('📦 Post data attachments:', postData.attachments);

      // Add poll if exists
      if (pollData) {
        postData.poll = pollData;
      }

      // If scheduled, add scheduled_at field
      if (scheduledDate && scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':');
        const scheduledDateTime = new Date(scheduledDate);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        postData.scheduled_at = scheduledDateTime.toISOString();
        postData.status = 'scheduled'; // Mark as scheduled
      } else {
        postData.status = 'published'; // Publish immediately
      }

      if (editMode && editPost) {
        // Режим редактирования - PUT запрос
        await apiClient.put(`/api/posts/${editPost.id}`, postData);
        onPostUpdated?.();
      } else {
        // Режим создания - POST запрос
        await apiClient.post('/api/posts', postData);
        onPostCreated?.();
      }

      setContent('');
      setUploadedMedia([]);
      setPollData(null);
      setShowPollCreator(false);
      setScheduledDate(null);
      setScheduledTime('19:00');
      setSelectedPets([]);
      setSelectedAuthor('user');
      setSelectedOrganizationId(null);
      setLocation(null);
      setShowModal(false);
    } catch (error) {
      console.error(editMode ? 'Ошибка обновления поста:' : 'Ошибка создания поста:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('📸 Selected files:', Array.from(files).map(f => f.name));

    // Limit to 10 photos total
    const remainingSlots = 10 - uploadedMedia.length;
    if (remainingSlots <= 0) {
      alert('Максимум 10 медиа файлов');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    // Validate files
    const validFiles: File[] = [];
    for (const file of filesToProcess) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Файл "${file.name}" слишком большой. Максимальный размер: 10MB`);
        continue;
      }

      if (!file.type.startsWith('image/')) {
        alert(`Файл "${file.name}" не является изображением`);
        continue;
      }
      
      validFiles.push(file);
    }

    console.log('✅ Valid files:', validFiles.map(f => f.name));

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Upload files
    const uploaded = await uploadMultiple(validFiles, 'photo');
    console.log('📤 Uploaded files:', uploaded.map(u => u.original_name));
    
    if (uploaded.length > 0) {
      setUploadedMedia((prev) => [...prev, ...uploaded]);
    }

    // Reset input
    e.target.value = '';
  };

  // Handle video upload with chunked upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to 10 media total
    const remainingSlots = 10 - uploadedMedia.length - uploadingFiles.length;
    if (remainingSlots <= 0) {
      alert('Максимум 10 медиа файлов');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    // Validate files and create previews
    const validFiles: {file: File, preview: string}[] = [];
    for (const file of filesToProcess) {
      if (file.size > 100 * 1024 * 1024) {
        alert(`Файл "${file.name}" слишком большой. Максимальный размер: 100MB`);
        continue;
      }

      if (!file.type.startsWith('video/')) {
        alert(`Файл "${file.name}" не является видео`);
        continue;
      }
      
      // Создаем превью для видео
      const preview = await createVideoThumbnail(file);
      validFiles.push({file, preview});
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    console.log('🚀 Начинаем chunked загрузку видео...', validFiles.length);

    // Добавляем файлы в состояние загрузки
    setUploadingFiles(prev => [...prev, ...validFiles.map(vf => ({
      ...vf,
      status: 'uploading' as const,
      progress: 0,
      uploadedChunks: 0,
      totalChunks: 0,
    }))]);

    // Upload files one by one with chunked upload
    for (const {file, preview} of validFiles) {
      try {
        const result = await uploadChunked(file, 'video', (chunkProgress) => {
          // Update progress for this file
          setUploadingFiles(prev => prev.map(uf => 
            uf.preview === preview ? {
              ...uf,
              status: chunkProgress.status === 'optimizing' ? 'optimizing' : 'uploading',
              progress: chunkProgress.percentage,
              uploadedChunks: chunkProgress.uploadedChunks,
              totalChunks: chunkProgress.totalChunks,
            } : uf
          ));
        });

        if (result) {
          setUploadedMedia(prev => [...prev, result]);
          console.log('✅ Видео добавлено в состояние');
        } else {
          console.error('❌ Не удалось загрузить видео');
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        alert(`Ошибка загрузки видео: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }

      // Remove from uploading state
      setUploadingFiles(prev => prev.filter(uf => uf.preview !== preview));
    }

    // Reset input
    e.target.value = '';
  };

  // Create video thumbnail
  const createVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = 0.1; // Get frame at 0.1 second
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        }
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
    // TODO: Optionally delete from server
  };

  // Load drafts when drafts modal opens
  useEffect(() => {
    if (showDrafts) {
      loadDrafts();
      setDraftMenuOpen(null); // Reset menu state
    }
  }, [showDrafts]);

  // Load pets when pets modal opens
  useEffect(() => {
    if (showPetsModal) {
      loadPets();
    }
  }, [showPetsModal]);

  // Загрузка организаций при монтировании компонента (только если пользователь авторизован)
  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  // Также загружаем при открытии модального окна (для случая когда форма в модалке)
  useEffect(() => {
    if (showModal && user) {
      loadOrganizations();
    }
  }, [showModal, user]);

  const loadPets = async () => {
    if (!user) return;
    
    try {
      const response = await apiClient.get(`/api/pets/user/${user.id}`);
      setPets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Ошибка загрузки питомцев:', error);
      setPets([]);
    }
  };

  const loadOrganizations = async () => {
    // Не загружаем если пользователь не авторизован
    if (!user) {
      setOrganizations([]);
      return;
    }

    try {
      const response = await apiClient.get('/api/organizations/my');
      if (response.success && response.data) {
        setOrganizations(Array.isArray(response.data) ? response.data : []);
      } else {
        setOrganizations([]);
      }
    } catch (error) {
      // Тихо игнорируем ошибки - организации опциональны
      setOrganizations([]);
    }
  };

  const togglePetSelection = (petId: number) => {
    setSelectedPets(prev => 
      prev.includes(petId) 
        ? prev.filter(id => id !== petId)
        : [...prev, petId]
    );
  };

  const loadDrafts = async () => {
    try {
      const response = await apiClient.get('/api/posts/drafts');
      setDrafts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Ошибка загрузки черновиков:', error);
    }
  };

  const saveDraft = async () => {
    if (!content.trim() && uploadedMedia.length === 0) return;

    try {
      await apiClient.post('/api/posts', {
        content,
        attached_pets: [],
        attachments: uploadedMedia.map((media) => ({
          url: media.url,
          type: 'image',
          file_name: media.file_name,
        })),
        tags: [],
        status: 'draft',
      });
      setContent('');
      setUploadedMedia([]);
      setShowSaveDraftDialog(false);
      setShowModal(false);
      setShowDrafts(true); // Open drafts after saving
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
    }
  };

  const loadDraft = (draft: any) => {
    setContent(draft.content);
    setShowDrafts(false);
    // TODO: Delete draft from server after loading
  };

  const deleteDraft = async (draftId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/api/posts/${draftId}`);
      setDrafts(drafts.filter(d => d.id !== draftId));
      setDraftMenuOpen(null);
    } catch (error) {
      console.error('Ошибка удаления черновика:', error);
    }
  };

  // Close modal on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowModal(false);
    }
  };

  const replySettingLabels: Record<ReplySettingType, string> = {
    anyone: 'Кто угодно',
    followers: 'Ваши подписчики',
    following: 'Профили, на которые вы подписаны',
    mentions: 'Упомянутые профили',
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const monthNames = [
    'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
    'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
  ];

  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const isSelectedDate = (day: number, month: number, year: number) => {
    if (!scheduledDate) return false;
    return day === scheduledDate.getDate() && 
           month === scheduledDate.getMonth() && 
           year === scheduledDate.getFullYear();
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
          {user?.avatar ? (
            <img src={getMediaUrl(user.avatar) || ''} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-6 h-6 text-gray-500" />
          )}
        </div>

        {/* Input Trigger */}
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 text-left text-gray-500 text-[15px] py-2 hover:text-gray-700 transition-colors"
        >
          Что нового?
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 p-4 overflow-y-auto backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div className="bg-white rounded-2xl w-full max-w-[600px] shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <button
                onClick={() => {
                  if (content.trim() || uploadedMedia.length > 0) {
                    setShowSaveDraftDialog(true);
                  } else {
                    setShowModal(false);
                  }
                }}
                className="text-[15px] text-gray-700 hover:text-gray-900 font-medium"
              >
                Отмена
              </button>
              <h3 className="font-bold text-[16px]">Новая метка</h3>
              <div className="flex items-center gap-1">
                {/* Drafts Button */}
                <button
                  onClick={() => {
                    if (content.trim() || uploadedMedia.length > 0) {
                      setShowSaveDraftDialog(true);
                    } else {
                      setShowDrafts(true);
                    }
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors relative"
                  title="Черновики"
                >
                  <DocumentDuplicateIcon className="w-6 h-6 text-gray-600" strokeWidth={2} />
                </button>
                
                {/* Schedule Button */}
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  title="Запланировать публикацию"
                >
                  <ClockIcon className="w-6 h-6 text-gray-600" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-4 py-3">
              {/* User Info */}
              <div className="flex items-start gap-3 mb-2">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold flex-shrink-0 text-[14px] overflow-hidden">
                  {selectedAuthor === 'user' ? (
                    user?.avatar ? (
                      <img src={getMediaUrl(user.avatar) || ''} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-gray-500" />
                    )
                  ) : (
                    organizations.find(org => org.id === selectedOrganizationId)?.logo ? (
                      <img 
                        src={getMediaUrl(organizations.find(org => org.id === selectedOrganizationId)?.logo) || ''} 
                        alt="Organization" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-gray-500" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  {/* Author Selector Dropdown */}
                  <div className="relative mb-1">
                    <button
                      onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                      className="flex items-center gap-1 font-semibold text-[15px] hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                    >
                      {selectedAuthor === 'user' ? (
                        getFullName(user?.name || 'Пользователь', user?.last_name)
                      ) : (
                        organizations.find(org => org.id === selectedOrganizationId)?.short_name || 
                        organizations.find(org => org.id === selectedOrganizationId)?.name || 
                        'Организация'
                      )}
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showAuthorDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                        {/* От себя */}
                        <button
                          onClick={() => {
                            setSelectedAuthor('user');
                            setSelectedOrganizationId(null);
                            setShowAuthorDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                            {user?.avatar ? (
                              <img src={getMediaUrl(user.avatar) || ''} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{getFullName(user?.name || 'Пользователь', user?.last_name)}</div>
                            <div className="text-xs text-gray-500">От себя</div>
                          </div>
                        </button>

                        {/* Организации */}
                        {organizations.length > 0 && (
                          <>
                            <div className="border-t border-gray-200 my-1"></div>
                            {organizations.map((org) => (
                              <button
                                key={org.id}
                                onClick={() => {
                                  setSelectedAuthor('organization');
                                  setSelectedOrganizationId(org.id);
                                  setShowAuthorDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                                  {org.logo ? (
                                    <img src={getMediaUrl(org.logo) || ''} alt={org.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{org.short_name || org.name}</div>
                                  <div className="text-xs text-gray-500">Организация</div>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Text Input - no border, just placeholder */}
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Что нового у вашего питомца?"
                    rows={1}
                    className="w-full text-[15px] border-none focus:outline-none resize-none text-gray-900 placeholder-gray-400 overflow-hidden"
                    autoFocus
                    style={{
                      minHeight: '24px',
                      maxHeight: '400px',
                      height: 'auto',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>
              </div>

              {/* Attachment Icons */}
              <div className="flex items-center gap-0.5 mb-2 ml-12">
                <label className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Добавить фото">
                  <PhotoIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <label className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Добавить видео">
                  <VideoCameraIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowPetsModal(true)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${selectedPets.length > 0 ? 'bg-blue-50' : ''}`}
                  title="Прикрепить карточку питомца"
                >
                  <MdPets className={`w-5 h-5 ${selectedPets.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => setShowPollCreator(!showPollCreator)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showPollCreator || pollData ? 'bg-blue-50' : ''}`}
                  title="Голосование"
                >
                  <ListBulletIcon className={`w-5 h-5 ${showPollCreator || pollData ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={2} />
                </button>
                <button
                  onClick={() => setShowLocationPicker(true)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${location ? 'bg-blue-50' : ''}`}
                  title={location ? location.name : "Добавить местоположение"}
                >
                  <MapPinIcon className={`w-5 h-5 ${location ? 'text-blue-600' : 'text-gray-400'}`} strokeWidth={2} />
                </button>
              </div>

              {/* Photos/Videos Preview */}
              {(uploadedMedia.length > 0 || uploadingFiles.length > 0) && (
                <div className="mb-3 ml-12 max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Uploading files with preview */}
                    {uploadingFiles.map((item, index) => (
                      <div key={`uploading-${index}`} className="relative group rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={item.preview}
                          alt="Загрузка..."
                          className="w-full h-48 object-cover opacity-60"
                        />
                        {/* Status indicator in top-right corner */}
                        <div className="absolute top-2 right-2">
                          {item.status === 'uploading' ? (
                            <div className="relative">
                              {/* Circular progress */}
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  stroke="rgba(255,255,255,0.3)"
                                  strokeWidth="3"
                                  fill="none"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  stroke="white"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - item.progress / 100)}`}
                                  className="transition-all duration-300"
                                />
                              </svg>
                              {/* Percentage text */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white text-xs font-bold drop-shadow-lg">
                                  {item.progress}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 bg-black/80 rounded-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-400 border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                        {/* Status text at bottom */}
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 text-white text-xs rounded font-medium">
                          {item.status === 'uploading' ? (
                            item.totalChunks && item.totalChunks > 1 ? (
                              `📤 Загрузка ${item.uploadedChunks}/${item.totalChunks} частей`
                            ) : (
                              '📤 Загрузка...'
                            )
                          ) : (
                            '🎬 Оптимизация...'
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Uploaded media */}
                    {uploadedMedia.map((media, index) => {
                      // Если URL уже полный (начинается с http), используем как есть
                      const mediaUrl = media.url.startsWith('http') 
                        ? `${media.url}?t=${Date.now()}`
                        : `http://localhost:8000${media.url}?t=${Date.now()}`;
                      
                      return (
                        <div key={media.id} className="relative group rounded-lg overflow-hidden bg-gray-100">
                          {media.media_type === 'video' ? (
                            <video
                              src={mediaUrl}
                              className="w-full h-48 object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={media.original_name}
                              className="w-full h-48 object-cover"
                            />
                          )}
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4 text-white" strokeWidth={2} />
                          </button>
                          {media.media_type === 'video' && (
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                              {media.optimizing ? '🎬 Оптимизация в фоне...' : 'Видео'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(uploadedMedia.length + uploadingFiles.length) >= 10 && (
                    <p className="text-xs text-gray-500 mt-2">Максимум 10 медиа файлов</p>
                  )}
                </div>
              )}

              {/* Poll Creator */}
              {showPollCreator && !pollData && (
                <PollCreator
                  onPollChange={(poll) => {
                    setPollData(poll);
                    if (poll) {
                      setShowPollCreator(false);
                    }
                  }}
                  onClose={() => setShowPollCreator(false)}
                />
              )}

              {/* Poll Preview */}
              {pollData && !showPollCreator && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-[14px] text-gray-900 mb-2">{pollData.question}</div>
                      <div className="space-y-1">
                        {pollData.options.map((option, index) => (
                          <div key={index} className="text-[13px] text-gray-700 px-2 py-1 bg-white rounded">
                            {option}
                          </div>
                        ))}
                      </div>
                      <div className="text-[12px] text-gray-500 mt-2">
                        {pollData.multiple_choice ? 'Множественный выбор' : 'Один вариант'} • 
                        {pollData.allow_vote_changes ? ' Можно изменить' : ' Нельзя изменить'}
                        {pollData.anonymous_voting && ' • Анонимно'}
                        {pollData.expires_at && ' • Ограничен по времени'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPollData(null);
                        setShowPollCreator(false);
                      }}
                      className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 text-blue-700" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}

              {/* Location Preview */}
              {location && (
                <div className="mb-3 ml-12 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        <div className="text-xs text-gray-500">
                          {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowLocationPicker(true)}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                        title="Изменить местоположение"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => setLocation(null)}
                        className="p-1 hover:bg-green-100 rounded-full transition-colors"
                        title="Удалить местоположение"
                      >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  {/* Мини-карта */}
                  <MiniMap 
                    lat={location.lat} 
                    lon={location.lon} 
                    locationName={location.name}
                    height="120px"
                  />
                </div>
              )}

              {/* Selected Pets Preview */}
              {selectedPets.length > 0 && (
                <div className="mb-3 ml-12">
                  <div className="flex flex-wrap gap-2">
                    {pets
                      .filter(pet => selectedPets.includes(pet.id))
                      .map((pet) => (
                        <div
                          key={pet.id}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-full"
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-[10px] font-semibold overflow-hidden">
                            {pet.photo ? (
                              <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                            ) : (
                              pet.name[0]?.toUpperCase()
                            )}
                          </div>
                          <span className="text-[13px] font-medium text-gray-900">{pet.name}</span>
                          <button
                            onClick={() => togglePetSelection(pet.id)}
                            className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <XMarkIcon className="w-3.5 h-3.5 text-blue-700" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Bottom Section */}
              <div className="pt-3 border-t border-gray-200">
                {/* Scheduled Info */}
                {scheduledDate && (
                  <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] text-blue-700">
                      <ClockIcon className="w-4 h-4" strokeWidth={2} />
                      <span>
                        Запланировано: {scheduledDate.toLocaleDateString('ru-RU')} в {scheduledTime}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setScheduledDate(null);
                        setScheduledTime('19:00');
                      }}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <XMarkIcon className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                )}

                {/* Reply Settings Dropdown */}
                {showReplySettings && (
                  <div className="mb-4 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4">
                      <h4 className="text-[13px] text-gray-500 mb-3">Кто может отвечать и цитировать</h4>
                      
                      {/* Options */}
                      <div className="space-y-0">
                        {(['anyone', 'followers', 'following', 'mentions'] as ReplySettingType[]).map((option) => (
                          <button
                            key={option}
                            onClick={() => setReplySetting(option)}
                            className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <span className="text-[15px] text-gray-900">{replySettingLabels[option]}</span>
                            {replySetting === option && (
                              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Verify Toggle */}
                    <div className="border-t border-gray-200 p-4">
                      <button
                        onClick={() => setVerifyReplies(!verifyReplies)}
                        className="w-full flex items-center justify-between"
                      >
                        <span className="text-[15px] text-gray-900">Проверять и одобрять ответы</span>
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${verifyReplies ? 'bg-black' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${verifyReplies ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setShowReplySettings(!showReplySettings)}
                    className="text-[13px] text-gray-500 hover:text-gray-900 flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Настройки ответов
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={(!content.trim() && !pollData) || isSubmitting}
                    className="px-5 py-1.5 bg-black text-white rounded-full text-[14px] font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Публикация...' : scheduledDate ? 'Запланировать' : 'Поставить метку'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drafts Modal */}
      {showDrafts && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 p-4 overflow-y-auto backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDrafts(false);
              setDraftMenuOpen(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[600px] shadow-2xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={() => {
                  setShowDrafts(false);
                  setDraftMenuOpen(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" strokeWidth={2} />
              </button>
              <h3 className="font-bold text-[16px]">Черновики</h3>
              <div className="w-8"></div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {drafts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Черновиков пока нет</p>
                </div>
              ) : (
                <div>
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="relative border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => loadDraft(draft)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold flex-shrink-0 text-[14px]">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] text-gray-900 line-clamp-3">{draft.content}</div>
                            <div className="text-[13px] text-gray-500 mt-1">
                              {new Date(draft.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      {/* Three dots menu */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraftMenuOpen(draftMenuOpen === draft.id ? null : draft.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" strokeWidth={2} />
                        </button>
                        
                        {/* Dropdown menu */}
                        {draftMenuOpen === draft.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                            <button
                              onClick={(e) => deleteDraft(draft.id, e)}
                              className="w-full px-4 py-3 text-left text-[15px] text-red-600 hover:bg-gray-50 transition-colors"
                            >
                              Удалить черновик
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Draft Dialog */}
      {showSaveDraftDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <h3 className="font-bold text-[18px] mb-2">Сохранить как черновик?</h3>
              <p className="text-[14px] text-gray-500">
                Сохранить как черновик, чтобы отредактировать и отправить позже.
              </p>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={saveDraft}
                className="w-full py-3 text-[15px] font-semibold hover:bg-gray-50 transition-colors"
              >
                Сохранить
              </button>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={() => {
                  setShowSaveDraftDialog(false);
                  setShowModal(false);
                  setContent('');
                  setUploadedMedia([]);
                }}
                className="w-full py-3 text-[15px] text-red-500 font-semibold hover:bg-gray-50 transition-colors"
              >
                Не сохранять
              </button>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowSaveDraftDialog(false)}
                className="w-full py-3 text-[15px] hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowScheduleModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" strokeWidth={2} />
              </button>
              <h3 className="font-bold text-[16px]">Запланировать публикацию</h3>
              <div className="w-8"></div>
            </div>
            
            <div className="p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[18px] font-bold">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()} г.
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Week Days */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-[13px] text-gray-400 font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                  const days = [];
                  
                  // Empty cells before first day
                  for (let i = 0; i < startingDayOfWeek; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />);
                  }
                  
                  // Days of month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const today = isToday(day, month, year);
                    const selected = isSelectedDate(day, month, year);
                    
                    days.push(
                      <button
                        key={day}
                        onClick={() => setScheduledDate(new Date(year, month, day))}
                        className={`aspect-square rounded-full flex items-center justify-center text-[15px] transition-colors
                          ${selected ? 'bg-black text-white font-bold' : 
                            today ? 'bg-gray-200 font-semibold' : 
                            'hover:bg-gray-100'}`}
                      >
                        {day}
                      </button>
                    );
                  }
                  
                  return days;
                })()}
              </div>

              {/* Time Picker */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="flex-1 px-4 py-2 text-[15px] bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-300"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (scheduledDate) {
                    setShowScheduleModal(false);
                    // Date and time are now set, user can publish
                  }
                }}
                disabled={!scheduledDate}
                className="w-full mt-6 py-3 bg-black text-white rounded-full text-[15px] font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pets Modal */}
      {showPetsModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-white/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPetsModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[600px] shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={() => setShowPetsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" strokeWidth={2} />
              </button>
              <h3 className="font-bold text-[16px]">Выбрать питомцев</h3>
              <button
                onClick={() => setShowPetsModal(false)}
                className="px-4 py-1.5 bg-black text-white rounded-full text-[14px] font-semibold hover:bg-gray-800 transition-colors"
              >
                Готово
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {pets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <MdPets className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-[16px] font-semibold text-gray-900 mb-2">
                    У вас пока нет питомцев
                  </h4>
                  <p className="text-[14px] text-gray-500 mb-4">
                    Добавьте своего первого питомца, чтобы прикреплять его к меткам
                  </p>
                  <button
                    onClick={() => {
                      setShowPetsModal(false);
                      // TODO: Navigate to add pet page
                    }}
                    className="px-6 py-2 bg-black text-white rounded-full text-[14px] font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Добавить питомца
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => togglePetSelection(pet.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        selectedPets.includes(pet.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {/* Pet Photo */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                        {pet.photo ? (
                          <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          pet.name[0]?.toUpperCase()
                        )}
                      </div>

                      {/* Pet Info */}
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-[15px] text-gray-900">{pet.name}</div>
                        <div className="text-[13px] text-gray-600">{pet.species}</div>
                      </div>

                      {/* Checkmark */}
                      {selectedPets.includes(pet.id) && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Pets Count */}
            {selectedPets.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <p className="text-[13px] text-gray-600 text-center">
                  Выбрано: {selectedPets.length} {selectedPets.length === 1 ? 'питомец' : 'питомца'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Map Modal - показывает текущее местоположение */}
      {showLocationPicker && (
        <LocationMap
          onLocationSelect={(loc) => {
            setLocation(loc);
            setShowLocationPicker(false);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </>
  );
}
