/**
 * Утилиты для работы с URL
 * Автоматически определяет правильные URL в зависимости от окружения
 */

// API Base URL
export const getApiUrl = (): string => {
  // В production используем относительные пути для rewrites
  // В development используем localhost
  if (typeof window !== 'undefined') {
    // Client-side: используем относительные пути для rewrites
    return process.env.NEXT_PUBLIC_API_URL || '/api';
  } else {
    // Server-side (SSR, sitemap): используем полный URL
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.zooplatforma.ru';
  }
};

// WebSocket URL (всегда полный URL)
export const getWebSocketUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.zooplatforma.ru';
  // Преобразуем http(s) в ws(s)
  return apiUrl.replace(/^http/, 'ws');
};

// Auth Service URL
export const getAuthUrl = (): string => {
  return process.env.NEXT_PUBLIC_AUTH_URL || '';
};

// Media Base URL (для изображений, видео и т.д.)
export const getMediaUrl = (): string => {
  return process.env.NEXT_PUBLIC_MEDIA_URL || process.env.NEXT_PUBLIC_S3_CDN_URL || '';
};

// S3 CDN URL
export const getS3CdnUrl = (): string => {
  return process.env.NEXT_PUBLIC_S3_CDN_URL || '';
};

/**
 * Преобразует путь к медиа файлу в полный URL
 * @param path - путь к файлу (например, "/uploads/users/1/avatar.jpg" или "users/1/avatar.jpg")
 * @returns полный URL к файлу
 */
export const getMediaFileUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  
  // Если путь уже полный URL (начинается с http:// или https://), возвращаем как есть
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const s3CdnUrl = getS3CdnUrl();
  const mediaUrl = getMediaUrl();
  
  // Убираем начальный слеш если есть
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Если есть S3 CDN URL, используем его
  if (s3CdnUrl) {
    // Убираем /uploads/ из пути если есть (в S3 файлы без этого префикса)
    const s3Path = cleanPath.replace(/^uploads\//, '');
    return `${s3CdnUrl}/${s3Path}`;
  }
  
  // Если есть Media URL, используем его
  if (mediaUrl) {
    return `${mediaUrl}/${cleanPath}`;
  }
  
  // Иначе используем относительный путь
  return `/${cleanPath}`;
};

/**
 * Преобразует аватар пользователя в полный URL
 */
export const getUserAvatarUrl = (avatar: string | null | undefined): string => {
  return getMediaFileUrl(avatar);
};

/**
 * Преобразует обложку пользователя в полный URL
 */
export const getUserCoverUrl = (cover: string | null | undefined): string => {
  return getMediaFileUrl(cover);
};

/**
 * Преобразует фото питомца в полный URL
 */
export const getPetPhotoUrl = (photo: string | null | undefined): string => {
  return getMediaFileUrl(photo);
};

/**
 * Преобразует логотип организации в полный URL
 */
export const getOrgLogoUrl = (logo: string | null | undefined): string => {
  return getMediaFileUrl(logo);
};

/**
 * Проверяет, является ли текущее окружение production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Проверяет, является ли текущее окружение development
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};
