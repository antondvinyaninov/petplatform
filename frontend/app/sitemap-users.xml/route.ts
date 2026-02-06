import { NextResponse } from 'next/server';

export const revalidate = 3600; // Обновлять каждый час

export async function GET() {
  const baseUrl = 'https://zooplatforma.ru';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.zooplatforma.ru';

  try {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Получаем список пользователей
    const usersResponse = await fetch(`${apiUrl}/api/sitemap/users`, {
      cache: 'no-store',
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      if (usersData.success && usersData.data) {
        for (const user of usersData.data) {
          sitemap += `  <url>
    <loc>${baseUrl}/id${user.id}</loc>
    <lastmod>${new Date(user.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      }
    }

    sitemap += `</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('❌ Error generating users sitemap:', error);
    
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

    return new NextResponse(fallbackSitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}
