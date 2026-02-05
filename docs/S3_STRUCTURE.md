# S3 Storage Structure

## Структура папок в S3

```
bucket/
├── users/
│   └── {user_id}/
│       ├── avatars/
│       │   └── {uuid}.{ext}           # Аватары пользователей
│       ├── covers/
│       │   └── {uuid}.{ext}           # Обложки профилей
│       ├── photos/
│       │   └── {year}/
│       │       └── {month}/
│       │           └── {uuid}.{ext}   # Фото в постах
│       └── messages/
│           └── {year}/
│               └── {month}/
│                   └── {uuid}.{ext}   # Фото/файлы из чата
│
├── pets/
│   └── {pet_id}/
│       ├── avatars/
│       │   └── {uuid}.{ext}           # Аватары питомцев
│       └── photos/
│           └── {year}/
│               └── {month}/
│                   └── {uuid}.{ext}   # Фото питомцев
│
├── organizations/
│   └── {org_id}/
│       ├── logos/
│       │   └── {uuid}.{ext}           # Логотипы организаций
│       ├── covers/
│       │   └── {uuid}.{ext}           # Обложки организаций
│       └── photos/
│           └── {year}/
│               └── {month}/
│                   └── {uuid}.{ext}   # Фото организаций
│
└── temp/
    └── {uuid}.{ext}                   # Временные файлы (удаляются через 24 часа)
```

## Примеры путей

### Пользователи
- Аватар: `users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg`
- Обложка: `users/1/covers/f3a2b1c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o.jpg`
- Фото в посте: `users/1/photos/2026/02/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg`
- Видео в посте: `users/1/photos/2026/02/c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8.mp4`
- Фото в чате: `users/1/messages/2026/02/b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7.jpg`
- Видео в чате: `users/1/messages/2026/02/d4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9.mp4`
- Документ в чате: `users/1/messages/2026/02/e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0.pdf`

### Питомцы
- Аватар: `pets/42/avatars/d28a928e-b831-46e8-81f1-1509c3504514.jpg`
- Фото: `pets/42/photos/2026/02/e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0.jpg`
- Видео: `pets/42/photos/2026/02/f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1.mp4`

### Организации
- Логотип: `organizations/5/logos/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.png`
- Обложка: `organizations/5/covers/b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7.jpg`
- Фото: `organizations/5/photos/2026/02/c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8.jpg`

## URL форматы

### С CDN (production)
```
https://cdn.example.com/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

### Без CDN (S3 direct)
```
https://bucket.s3.region.amazonaws.com/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

### Локальное хранилище (development)
```
/uploads/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

## Правила именования

1. **UUID для файлов**: Все файлы используют UUID v4 для уникальности
2. **Расширения**: Сохраняем оригинальное расширение файла
   - Изображения: `.jpg`, `.png`, `.gif`, `.webp`, `.heic`
   - Видео: `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`
   - Документы: `.pdf`, `.doc`, `.docx`, `.txt`
   - Аудио: `.mp3`, `.wav`, `.ogg`, `.m4a`
3. **Год/месяц для медиа**: Фото и видео группируются по дате для удобства управления
4. **ID владельца**: Каждая папка привязана к ID пользователя/питомца/организации

## Преимущества структуры

✅ **Изоляция данных**: Файлы каждого пользователя в отдельной папке
✅ **Масштабируемость**: Легко найти и удалить все файлы пользователя
✅ **Организация**: Фото группируются по дате (год/месяц)
✅ **Безопасность**: Можно настроить права доступа на уровне папок
✅ **Производительность**: CDN кеширует файлы по путям

## Миграция существующих файлов

Если есть старые файлы с плоской структурой:
```
/uploads/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

Нужно переместить в новую структуру:
```
users/{user_id}/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

## Конфигурация (.env)

```env
# S3 Configuration
USE_S3=true
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_CDN_URL=https://cdn.example.com  # Опционально
```

## Backend API

### Загрузка файлов
- `POST /api/users/avatar` → `users/{user_id}/avatars/{uuid}.{ext}`
- `POST /api/users/cover` → `users/{user_id}/covers/{uuid}.{ext}`
- `POST /api/media/upload` → `users/{user_id}/photos/{year}/{month}/{uuid}.{ext}`
- `POST /api/messages/upload` → `users/{user_id}/messages/{year}/{month}/{uuid}.{ext}`
- `POST /api/pets/{id}/avatar` → `pets/{pet_id}/avatars/{uuid}.{ext}`
- `POST /api/organizations/{id}/logo` → `organizations/{org_id}/logos/{uuid}.{ext}`

### Получение файлов
Backend возвращает полный URL (с CDN если настроен):
```json
{
  "success": true,
  "data": {
    "avatar_url": "https://cdn.example.com/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg"
  }
}
```

Frontend использует этот URL напрямую в `<img src={avatar_url}>`.

## Очистка старых файлов

Рекомендуется настроить lifecycle policy в S3:
- Временные файлы (`temp/`) удаляются через 24 часа
- Старые версии файлов удаляются через 30 дней
- Неиспользуемые файлы архивируются через 90 дней

---

**Дата создания:** 3 февраля 2026
