# Добавление геолокации к постам

## Проблема
В метках (постах) есть иконка местоположения, но при клике на неё ничего не происходит. Нужно добавить функционал показа Яндекс.Карты с точкой местоположения.

## Решение

### 1. Миграция БД (требует основной проект)

**⚠️ Это нужно сделать в основном проекте, не в Main workspace!**

Создать миграцию для добавления полей геолокации в таблицу `posts`:

```sql
-- Файл: database/migrations/XXXXXX_add_geolocation_to_posts.sql

ALTER TABLE posts 
ADD COLUMN location_lat DECIMAL(10, 8),
ADD COLUMN location_lon DECIMAL(11, 8),
ADD COLUMN location_name VARCHAR(255);

CREATE INDEX idx_posts_location ON posts(location_lat, location_lon);
```

### 2. Обновить модели (Main workspace)

#### Backend: `main/backend/models/post.go`

```go
type Post struct {
	// ... существующие поля ...
	LocationLat  *float64 `json:"location_lat,omitempty"`  // Широта
	LocationLon  *float64 `json:"location_lon,omitempty"`  // Долгота
	LocationName *string  `json:"location_name,omitempty"` // Название места
}

type CreatePostRequest struct {
	// ... существующие поля ...
	LocationLat  *float64 `json:"location_lat,omitempty"`
	LocationLon  *float64 `json:"location_lon,omitempty"`
	LocationName *string  `json:"location_name,omitempty"`
}

type UpdatePostRequest struct {
	// ... существующие поля ...
	LocationLat  *float64 `json:"location_lat,omitempty"`
	LocationLon  *float64 `json:"location_lon,omitempty"`
	LocationName *string  `json:"location_name,omitempty"`
}
```

#### Frontend: `main/frontend/lib/api.ts`

```typescript
export interface Post {
  // ... существующие поля ...
  location_lat?: number;
  location_lon?: number;
  location_name?: string;
}
```

### 3. Обновить SQL запросы (Main workspace)

#### `main/backend/handlers/posts.go`

Добавить поля геолокации во все SELECT запросы:

```go
// В функциях getAllPosts, getUserPosts, getPetPosts, getOrganizationPosts
SELECT 
	p.id, p.author_id, p.author_type, p.content, 
	p.attached_pets, p.attachments, p.tags, p.status, 
	p.scheduled_at, p.created_at, p.updated_at, p.is_deleted,
	p.location_lat, p.location_lon, p.location_name, -- ✅ Добавить
	// ... остальные поля
```

Добавить в INSERT и UPDATE запросы:

```go
// createPost
INSERT INTO posts (
	author_id, author_type, content, attached_pets, attachments, 
	tags, status, scheduled_at, created_at, updated_at,
	location_lat, location_lon, location_name -- ✅ Добавить
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

// updatePost
UPDATE posts SET 
	content = ?, 
	attached_pets = ?, 
	attachments = ?, 
	tags = ?,
	location_lat = ?,    -- ✅ Добавить
	location_lon = ?,    -- ✅ Добавить
	location_name = ?,   -- ✅ Добавить
	updated_at = NOW()
WHERE id = ?
```

### 4. Компонент карты (Main workspace)

#### Создать `main/frontend/app/components/shared/LocationMap.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';

interface LocationMapProps {
  lat: number;
  lon: number;
  locationName?: string;
  onClose: () => void;
}

export default function LocationMap({ lat, lon, locationName, onClose }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем Яндекс.Карты API
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=YOUR_API_KEY&lang=ru_RU`;
    script.async = true;
    
    script.onload = () => {
      // @ts-ignore
      ymaps.ready(() => {
        if (!mapRef.current) return;

        // @ts-ignore
        const map = new ymaps.Map(mapRef.current, {
          center: [lat, lon],
          zoom: 15,
          controls: ['zoomControl', 'fullscreenControl']
        });

        // Добавляем метку
        // @ts-ignore
        const placemark = new ymaps.Placemark([lat, lon], {
          balloonContent: locationName || 'Местоположение'
        }, {
          preset: 'islands#redDotIcon'
        });

        map.geoObjects.add(placemark);
      });
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [lat, lon, locationName]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[600px] m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {locationName || 'Местоположение'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div ref={mapRef} className="w-full h-[calc(100%-60px)]"></div>
      </div>
    </div>
  );
}
```

**⚠️ Важно:** Нужно получить API ключ Яндекс.Карт:
1. Зайди на https://developer.tech.yandex.ru/
2. Создай приложение
3. Получи API ключ
4. Замени `YOUR_API_KEY` в коде

### 5. Обновить PostCard (Main workspace)

#### `main/frontend/app/components/posts/PostCard.tsx`

Добавить импорт:
```typescript
import { MapPinIcon } from '@heroicons/react/24/outline';
import LocationMap from '../shared/LocationMap';
```

Добавить state:
```typescript
const [showMap, setShowMap] = useState(false);
```

Добавить иконку местоположения (после автора поста):
```typescript
{/* Местоположение */}
{post.location_lat && post.location_lon && (
  <button
    onClick={() => setShowMap(true)}
    className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
  >
    <MapPinIcon className="w-4 h-4" />
    <span>{post.location_name || 'Показать на карте'}</span>
  </button>
)}
```

Добавить модальное окно с картой (в конце компонента):
```typescript
{/* Модальное окно с картой */}
{showMap && post.location_lat && post.location_lon && (
  <LocationMap
    lat={post.location_lat}
    lon={post.location_lon}
    locationName={post.location_name}
    onClose={() => setShowMap(false)}
  />
)}
```

### 6. Добавить выбор местоположения в CreatePost (Main workspace)

#### `main/frontend/app/components/posts/CreatePost.tsx`

Добавить state:
```typescript
const [location, setLocation] = useState<{
  lat: number;
  lon: number;
  name: string;
} | null>(null);
```

Добавить кнопку выбора местоположения:
```typescript
<button
  type="button"
  onClick={() => {
    // Открыть модальное окно выбора местоположения
    // Или использовать геолокацию браузера
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: 'Моё местоположение'
        });
      });
    }
  }}
  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
  title="Добавить местоположение"
>
  <MapPinIcon className="w-5 h-5" />
</button>
```

Добавить в данные поста при отправке:
```typescript
const postData = {
  content: content.trim(),
  attachments: uploadedMedia,
  attached_pets: selectedPets,
  tags: selectedTags,
  poll: poll,
  location_lat: location?.lat,
  location_lon: location?.lon,
  location_name: location?.name,
};
```

## Итого

После выполнения всех шагов:
1. ✅ Пользователи смогут добавлять местоположение к постам
2. ✅ В постах будет отображаться иконка местоположения
3. ✅ При клике на иконку откроется Яндекс.Карта с точкой
4. ✅ Можно будет использовать геолокацию браузера или выбрать место на карте

## Что нужно сделать сейчас

1. **Открыть основной проект** и создать миграцию БД
2. Вернуться в Main workspace и обновить код согласно инструкции
3. Получить API ключ Яндекс.Карт
4. Протестировать функционал

---

**Дата создания:** 3 февраля 2026
