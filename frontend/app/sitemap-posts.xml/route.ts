import { NextResponse } from 'next/server';

export const revalidate = 3600; // Обновлять каждый час

export async function GET() {
  const baseUrl = 'https://zooplatforma.ru';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.zooplatforma.ru';

  try {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Получаем список постов
    const postsResponse = await fetch(`${apiUrl}/api/sitemap/posts`, {
      cache: 'no-store',
    });
    
    if (postsResponse.ok) {
      const postsData = await postsResponse.json();
      if (postsData.success && postsData.data) {
        for (const post of postsData.data) {
          sitemap += `  <url>
    <loc>${baseUrl}/?metka=${post.id}</loc>
    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
    console.error('❌ Error generating posts sitemap:', error);
    
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
