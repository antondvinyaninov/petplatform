import { Metadata } from 'next';
import HomeClient from './HomeClient';

type Props = {
  searchParams: Promise<{ metka?: string }>;
};

// Функция для получения данных поста (используется и в metadata, и в компоненте)
async function getPostData(metkaId: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/api/posts/${metkaId}`, {
      cache: 'no-store',
    });

    if (response.ok) {
      const result = await response.json();
      return result.data;
    }
  } catch (error) {
    console.error('Error fetching post for SEO:', error);
  }
  return null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const metkaId = params.metka;

  if (metkaId) {
    const post = await getPostData(metkaId);

    if (post) {
      // Формируем описание из контента поста
      const description = post.content.substring(0, 160) + (post.content.length > 160 ? '...' : '');
      
      // Получаем имя автора
      const authorName = post.author_type === 'organization' 
        ? (post.organization?.short_name || post.organization?.name || 'Организация')
        : (post.user?.name || 'Пользователь') + (post.user?.last_name ? ' ' + post.user.last_name : '');

      // Получаем первое изображение если есть
      const image = post.attachments?.find((a: any) => a.type === 'image' || a.media_type === 'image')?.url;

      return {
        title: `${authorName}: ${description}`,
        description: description,
        openGraph: {
          title: `${authorName}: ${description}`,
          description: description,
          images: image ? [image] : [],
          type: 'article',
          url: `/?metka=${metkaId}`,
        },
        twitter: {
          card: 'summary_large_image',
          title: `${authorName}: ${description}`,
          description: description,
          images: image ? [image] : [],
        },
      };
    }
  }

  // Дефолтные meta-теги для главной страницы
  return {
    title: 'Главная - Зооплатформа',
    description: 'Социальная сеть для владельцев домашних животных',
  };
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const metkaId = params.metka;

  // Получаем данные поста для JSON-LD
  let postSchema = null;
  if (metkaId) {
    const post = await getPostData(metkaId);
    
    if (post) {
      const authorName = post.author_type === 'organization' 
        ? (post.organization?.short_name || post.organization?.name || 'Организация')
        : (post.user?.name || 'Пользователь') + (post.user?.last_name ? ' ' + post.user.last_name : '');

      const image = post.attachments?.find((a: any) => a.type === 'image' || a.media_type === 'image')?.url;

      postSchema = {
        '@context': 'https://schema.org',
        '@type': 'SocialMediaPosting',
        headline: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        articleBody: post.content,
        author: {
          '@type': post.author_type === 'organization' ? 'Organization' : 'Person',
          name: authorName,
        },
        datePublished: post.created_at,
        ...(image && { image: image }),
        url: `https://zooplatforma.ru/?metka=${metkaId}`,
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: post.likes_count || 0,
          },
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: post.comments_count || 0,
          },
        ],
      };
    }
  }

  return (
    <>
      {postSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }}
        />
      )}
      <HomeClient searchParams={params} />
    </>
  );
}
