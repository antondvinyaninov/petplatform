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
        ],
      },
    ],
    sitemap: 'https://zooplatforma.ru/sitemap.xml',
  };
}
