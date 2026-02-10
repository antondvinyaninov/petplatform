import { useEffect, useState } from 'react';

interface TimelineEvent {
  id: number;
  type: 'registration' | 'medical' | 'post' | 'event' | 'document';
  title: string;
  description?: string;
  date: string;
  icon: string;
  color: string;
  metadata?: any;
}

interface PetTimelineProps {
  petId: number;
  pet: any; // Добавляем pet для доступа к created_at
}

export default function PetTimeline({ petId, pet }: PetTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [petId, pet]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      
      // Создаем базовые события из данных питомца
      const baseEvents: TimelineEvent[] = [];
      
      // Событие регистрации
      if (pet.created_at) {
        baseEvents.push({
          id: 1,
          type: 'registration',
          title: 'Регистрация в системе',
          description: `Питомец "${pet.name}" добавлен в базу данных`,
          date: pet.created_at,
          icon: '📝',
          color: 'blue',
          metadata: {
            owner: pet.owner_name,
            species: pet.species_name,
            breed: pet.breed_name,
          }
        });
      }

      // TODO: Загрузить остальные события из API
      // const response = await fetch(`/api/admin/pets/${petId}/timeline`, {
      //   credentials: 'include',
      // });
      // const data = await response.json();
      // const apiEvents = data.events || [];
      
      // Объединяем и сортируем по дате
      const allEvents = [...baseEvents].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setEvents(allEvents);
    } catch (err) {
      console.error('Ошибка загрузки хронологии:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'registration':
        return 'bg-blue-500';
      case 'medical':
        return 'bg-red-500';
      case 'post':
        return 'bg-green-500';
      case 'event':
        return 'bg-purple-500';
      case 'document':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return '📝';
      case 'medical':
        return '🏥';
      case 'post':
        return '📱';
      case 'event':
        return '🎉';
      case 'document':
        return '📄';
      default:
        return '📌';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Загрузка хронологии...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Пока нет событий</h3>
        <p className="text-gray-600">
          Здесь будет отображаться вся история питомца: визиты к врачу, посты, события и документы
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Всего событий: {events.length}
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          Фильтры
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Вертикальная линия */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* События */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Иконка события */}
              <div className={`
                flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl
                ${getEventColor(event.type)} text-white shadow-lg z-10
              `}>
                {getEventIcon(event.type)}
              </div>

              {/* Контент события */}
              <div className="flex-1 bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {event.title}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {formatDate(event.date)}
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-gray-600 mb-2">{event.description}</p>
                )}

                {/* Метаданные события */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mb-2 space-y-1">
                    {event.metadata.owner && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Владелец:</span> {event.metadata.owner}
                      </p>
                    )}
                    {event.metadata.species && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Вид:</span> {event.metadata.species}
                      </p>
                    )}
                    {event.metadata.breed && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Порода:</span> {event.metadata.breed}
                      </p>
                    )}
                  </div>
                )}

                {/* Тип события */}
                <div className="flex items-center gap-2">
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium text-white
                    ${getEventColor(event.type)}
                  `}>
                    {event.type === 'registration' && 'Регистрация'}
                    {event.type === 'medical' && 'Медицина'}
                    {event.type === 'post' && 'Пост'}
                    {event.type === 'event' && 'Событие'}
                    {event.type === 'document' && 'Документ'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Информационное сообщение */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Хронология питомца</h4>
            <p className="text-sm text-blue-800">
              Здесь отображаются все события, связанные с питомцем: регистрация, визиты к ветеринару, 
              посты в социальных сетях, важные события и загруженные документы. 
              События отсортированы от новых к старым.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
