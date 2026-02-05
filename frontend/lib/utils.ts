// Утилиты для работы с медиа и пользователями

const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://my-projects-gateway-zp.crv1ic.easypanel.host'
    : 'http://localhost:8000');

/**
 * Получить полный URL для медиа файла
 * @param url - относительный URL из базы данных (например, /uploads/users/1/avatars/file.png)
 * @returns полный URL (например, http://localhost:8000/uploads/users/1/avatars/file.png)
 */
export function getMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  // Если URL уже полный, возвращаем как есть
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Добавляем базовый URL
  return `${API_URL}${url}`;
}

/**
 * Получить полное имя пользователя
 * @param name - имя пользователя
 * @param lastName - фамилия пользователя (опционально)
 * @returns полное имя (например, "Иван Петров" или просто "Иван")
 */
export function getFullName(name: string, lastName?: string | null): string {
  if (!lastName) return name;
  return `${name} ${lastName}`;
}


/**
 * Форматировать время последней активности
 * @param dateString - строка с датой/временем
 * @returns отформатированная строка (например, "5 мин назад", "вчера", "2 нед назад")
 */
export function formatLastSeen(dateString: string | null | undefined): string {
  if (!dateString) return 'Статус неизвестен';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return `${diffDays} дн назад`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед назад`;
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Получить статус онлайн пользователя
 * @param isOnline - флаг онлайн статуса
 * @param lastSeen - время последней активности
 * @returns объект с текстом и цветом статуса
 */
export function getOnlineStatus(isOnline: boolean | undefined, lastSeen: string | null | undefined) {
  if (isOnline) {
    return {
      text: 'Онлайн',
      color: 'bg-green-500',
      textColor: 'text-green-700',
    };
  }
  
  return {
    text: lastSeen ? `Был ${formatLastSeen(lastSeen)}` : 'Статус неизвестен',
    color: 'bg-gray-400',
    textColor: 'text-gray-700',
  };
}
