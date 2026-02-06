import { NextResponse } from 'next/server';

export const revalidate = 3600; // Обновлять sitemap каждый час

export async function GET() {
  const baseUrl = 'https://zooplatforma.ru';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.zooplatforma.ru';

  try {
    // Статические страницы
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/catalog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/team</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

    // Получаем список пользователей
    try {
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
    } catch (error) {
      console.error('❌ Error fetching users for sitemap:', error);
    }

    // Получаем список постов
    try {
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
    } catch (error) {
      console.error('❌ Error fetching posts for sitemap:', error);
    }

    sitemap += `</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    
    // Возвращаем минимальный sitemap в случае ошибки
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(fallbackSitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}
