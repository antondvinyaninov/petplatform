import { NextResponse } from 'next/server';

export const revalidate = 3600; // Обновлять каждый час

export async function GET() {
  const baseUrl = 'https://zooplatforma.ru';

  // Sitemap Index - ссылается на отдельные sitemap файлы
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-users.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-posts.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new NextResponse(sitemapIndex, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
