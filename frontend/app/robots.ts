import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth',
          '/profile/edit',
          '/messenger',
          '/notifications',
          '/admin/',
          '/favorites',
          '/friends/requests',
          // Блокируем параметры модальных окон (как у ВК)
          '*?w=*',
          // Блокируем UTM метки для чистоты индексации
          '*?utm_*',
          // Блокируем параметры сортировки и фильтров
          '*?sort=*',
          '*?filter=*',
        ],
      },
      // Специальные правила для Яндекса
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: [
          '/api/',
          '/auth',
          '/profile/edit',
          '/messenger',
          '/notifications',
          '/admin/',
          '/favorites',
          '/friends/requests',
          '*?w=*',
          '*?utm_*',
          '*?sort=*',
          '*?filter=*',
        ],
      },
    ],
    sitemap: 'https://zooplatforma.ru/sitemap.xml',
  };
}
