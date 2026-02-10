# 📦 Полное руководство по S3 хранилищу

## Содержание
- [Обзор](#обзор)
- [Настройка S3](#настройка-s3)
- [Конфигурация Backend](#конфигурация-backend)
- [Структура хранилища](#структура-хранилища)
- [Использование в коде](#использование-в-коде)
- [Миграция данных](#миграция-данных)
- [Тестирование](#тестирование)
- [Безопасность](#безопасность)
- [Мониторинг](#мониторинг)
- [Troubleshooting](#troubleshooting)

---

## Обзор

Проект использует S3-совместимое хранилище для всех пользовательских файлов. Поддерживается работа как с AWS S3, так и с альтернативными провайдерами (FirstVDS, DigitalOcean Spaces, MinIO и др.).

### Что хранится в S3

- **Аватары пользователей** - `users/{user_id}/avatars/`
- **Обложки профилей** - `users/{user_id}/covers/`
- **Фото в постах** - `users/{user_id}/photos/{year}/{month}/`
- **Медиа в сообщениях** - `users/{user_id}/messages/{year}/{month}/`
- **Аватары питомцев** - `pets/{pet_id}/avatars/`
- **Фото питомцев** - `pets/{pet_id}/photos/{year}/{month}/`
- **Логотипы организаций** - `organizations/{org_id}/logos/`
- **Обложки организаций** - `organizations/{org_id}/covers/`

### Преимущества S3

✅ **Масштабируемость** - неограниченное хранилище
✅ **Надежность** - репликация данных
✅ **CDN интеграция** - быстрая доставка контента
✅ **Резервное копирование** - автоматические бэкапы
✅ **Экономия** - оплата только за использованное место
✅ **Изоляция данных** - файлы каждого пользователя в отдельной папке
✅ **Производительность** - CDN кеширует файлы по путям

---

## Настройка S3

### 1. Создание бакета (FirstVDS)

1. Войдите в панель управления FirstVDS
2. Перейдите в раздел "S3 Storage"
3. Нажмите "Создать бакет"
4. Укажите имя бакета (например: `zooplatforma`)
5. Выберите регион: `ru-1`
6. Настройте публичный доступ: **Включить**

### 2. Получение ключей доступа

1. В разделе "S3 Storage" найдите ваш бакет
2. Перейдите в "Настройки" → "Ключи доступа"
3. Нажмите "Создать ключ"
4. Сохраните:
   - **Access Key** (например: `L3BKDZK45R5VHEZ106FG`)
   - **Secret Key** (например: `kqk5rjkLqOUwIPMSt6eb0iRJTo7Y8Z6pCVivQXHZ`)

⚠️ **Важно**: Secret Key показывается только один раз! Сохраните его в безопасном месте.

### 3. Настройка CORS (если нужна загрузка с фронтенда)

В настройках бакета добавьте CORS правило:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Конфигурация Backend

### Файл `.env`

Создайте или обновите файл `backend/.env`:

```env
# S3 Storage Configuration (FirstVDS)
USE_S3=true
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=ru-1
S3_BUCKET=zooplatforma
S3_ACCESS_KEY=L3BKDZK45R5VHEZ106FG
S3_SECRET_KEY=kqk5rjkLqOUwIPMSt6eb0iRJTo7Y8Z6pCVivQXHZ
S3_CDN_URL=https://zooplatforma.s3.firstvds.ru
```

### Параметры конфигурации

| Параметр | Описание | Обязательный | Пример |
|----------|----------|--------------|--------|
| `USE_S3` | Включить S3 хранилище | Да | `true` или `false` |
| `S3_ENDPOINT` | URL S3 сервера | Да | `https://s3.firstvds.ru` |
| `S3_REGION` | Регион бакета | Да | `ru-1` |
| `S3_BUCKET` | Имя бакета | Да | `zooplatforma` |
| `S3_ACCESS_KEY` | Ключ доступа | Да | `L3BKDZK45R5VHEZ106FG` |
| `S3_SECRET_KEY` | Секретный ключ | Да | `kqk5rjk...` |
| `S3_CDN_URL` | URL для доступа к файлам | Нет | `https://cdn.example.com` |

### Конфигурация для разных провайдеров

#### AWS S3
```env
USE_S3=true
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_CDN_URL=https://d111111abcdef8.cloudfront.net
```

#### DigitalOcean Spaces
```env
USE_S3=true
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=my-space
S3_ACCESS_KEY=DO00EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_CDN_URL=https://my-space.nyc3.cdn.digitaloceanspaces.com
```

#### MinIO (Self-hosted)
```env
USE_S3=true
S3_ENDPOINT=https://minio.example.com
S3_REGION=us-east-1
S3_BUCKET=uploads
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_CDN_URL=https://cdn.example.com
```

### Локальное хранилище (для разработки)

Если не хотите использовать S3 в development:

```env
USE_S3=false
```

Файлы будут сохраняться в `backend/uploads/`

---

## Структура хранилища

### Иерархия папок

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

### Примеры путей

#### Пользователи
- Аватар: `users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg`
- Обложка: `users/1/covers/f3a2b1c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o.jpg`
- Фото в посте: `users/1/photos/2026/02/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.jpg`
- Видео в посте: `users/1/photos/2026/02/c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8.mp4`
- Фото в чате: `users/1/messages/2026/02/b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7.jpg`
- Видео в чате: `users/1/messages/2026/02/d4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9.mp4`
- Документ в чате: `users/1/messages/2026/02/e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0.pdf`

#### Питомцы
- Аватар: `pets/42/avatars/d28a928e-b831-46e8-81f1-1509c3504514.jpg`
- Фото: `pets/42/photos/2026/02/e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0.jpg`
- Видео: `pets/42/photos/2026/02/f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1.mp4`

#### Организации
- Логотип: `organizations/5/logos/a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6.png`
- Обложка: `organizations/5/covers/b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7.jpg`
- Фото: `organizations/5/photos/2026/02/c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8.jpg`

### URL форматы

#### С CDN (production)
```
https://cdn.example.com/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

#### Без CDN (S3 direct)
```
https://bucket.s3.region.amazonaws.com/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

#### Локальное хранилище (development)
```
/uploads/users/1/avatars/8781bb65-1daf-4090-ad7a-539b9c93de3a.jpg
```

### Правила именования

1. **UUID v4** для всех файлов - гарантирует уникальность
2. **Оригинальное расширение** - сохраняется тип файла
   - Изображения: `.jpg`, `.png`, `.gif`, `.webp`, `.heic`
   - Видео: `.mp4`, `.mov`, `.avi`, `.webm`, `.mkv`
   - Документы: `.pdf`, `.doc`, `.docx`, `.txt`
   - Аудио: `.mp3`, `.wav`, `.ogg`, `.m4a`
3. **Год/месяц** для медиа - упрощает управление и поиск
4. **ID владельца** - изоляция данных пользователей

### Backend API эндпоинты

- `POST /api/users/avatar` → `users/{user_id}/avatars/{uuid}.{ext}`
- `POST /api/users/cover` → `users/{user_id}/covers/{uuid}.{ext}`
- `POST /api/media/upload` → `users/{user_id}/photos/{year}/{month}/{uuid}.{ext}`
- `POST /api/messages/upload` → `users/{user_id}/messages/{year}/{month}/{uuid}.{ext}`
- `POST /api/pets/{id}/avatar` → `pets/{pet_id}/avatars/{uuid}.{ext}`
- `POST /api/organizations/{id}/logo` → `organizations/{org_id}/logos/{uuid}.{ext}`

---

## Использование в коде

### Инициализация (main.go)

```go
package main

import (
    "backend/storage"
    "log"
)

func main() {
    // Инициализация S3
    if err := storage.InitS3(); err != nil {
        log.Printf("⚠️  S3 initialization failed: %v", err)
        log.Println("📁 Falling back to local file storage")
    }
    
    // Остальной код...
}
```

### Загрузка файла

```go
import (
    "backend/storage"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "path/filepath"
    "fmt"
)

func UploadAvatar(c *gin.Context) {
    // Получаем файл из формы
    file, header, err := c.Request.FormFile("avatar")
    if err != nil {
        c.JSON(400, gin.H{"error": "No file uploaded"})
        return
    }
    defer file.Close()
    
    // Генерируем имя файла
    userID := c.GetInt("user_id")
    filename := fmt.Sprintf("users/%d/avatars/%s%s", 
        userID, 
        uuid.New().String(), 
        filepath.Ext(header.Filename))
    
    // Сохраняем (автоматически в S3 или локально)
    fileURL, err := storage.SaveFile(file, filename, header.Header.Get("Content-Type"))
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to save file"})
        return
    }
    
    // Обновляем в базе данных
    db.Exec("UPDATE users SET avatar = ? WHERE id = ?", fileURL, userID)
    
    c.JSON(200, gin.H{
        "success": true,
        "avatar_url": fileURL,
    })
}
```

### Получение URL файла

```go
// Получить правильный URL (с CDN если настроен)
url := storage.GetFileURL("/uploads/users/1/avatar.jpg")
// Вернет: https://zooplatforma.s3.firstvds.ru/users/1/avatar.jpg
```

### Удаление файла

```go
func DeleteAvatar(c *gin.Context) {
    userID := c.GetInt("user_id")
    
    // Получаем текущий URL аватара
    var avatarURL string
    db.QueryRow("SELECT avatar FROM users WHERE id = ?", userID).Scan(&avatarURL)
    
    // Удаляем файл из S3
    if avatarURL != "" {
        if err := storage.DeleteFile(avatarURL); err != nil {
            log.Printf("Failed to delete file: %v", err)
        }
    }
    
    // Обновляем базу данных
    db.Exec("UPDATE users SET avatar = NULL WHERE id = ?", userID)
    
    c.JSON(200, gin.H{"success": true})
}
```

### Получение профиля с CDN URL

```go
func GetUserProfile(c *gin.Context) {
    var user User
    db.QueryRow("SELECT id, username, avatar FROM users WHERE id = ?", userID).
        Scan(&user.ID, &user.Username, &user.Avatar)
    
    // Преобразуем путь в CDN URL (если настроен)
    user.Avatar = storage.GetFileURL(user.Avatar)
    
    c.JSON(200, user)
}
```

### Прямая загрузка в S3

```go
func UploadToS3Directly(c *gin.Context) {
    file, header, _ := c.Request.FormFile("file")
    defer file.Close()
    
    userID := c.GetInt("user_id")
    filename := fmt.Sprintf("users/%d/photos/%s%s", 
        userID, 
        uuid.New().String(),
        filepath.Ext(header.Filename))
    
    // Прямая загрузка через S3 клиент
    fileURL, err := storage.GlobalS3Client.UploadFile(
        file, 
        filename, 
        header.Header.Get("Content-Type"))
    
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, gin.H{"url": fileURL})
}
```

---

## Миграция данных

### Миграция с локального хранилища на S3

Если у вас уже есть файлы в `backend/uploads/`, их нужно перенести в S3.

#### Скрипт миграции

Создайте `backend/scripts/migrate_to_s3/main.go`:

```go
package main

import (
    "backend/storage"
    "database/sql"
    "fmt"
    "log"
    "os"
    "path/filepath"
    
    "github.com/joho/godotenv"
    _ "github.com/mattn/go-sqlite3"
)

func main() {
    // Загружаем .env
    if err := godotenv.Load("../../.env"); err != nil {
        log.Fatal("Error loading .env file")
    }
    
    // Инициализируем S3
    if err := storage.InitS3(); err != nil {
        log.Fatal("Failed to initialize S3:", err)
    }
    
    // Подключаемся к БД
    db, err := sql.Open("sqlite3", "../../data.db")
    if err != nil {
        log.Fatal("Failed to open database:", err)
    }
    defer db.Close()
    
    // Мигрируем аватары пользователей
    migrateUserAvatars(db)
    
    // Мигрируем обложки
    migrateUserCovers(db)
    
    // Мигрируем фото в постах
    migratePostPhotos(db)
    
    log.Println("✅ Migration completed!")
}
```

```go
func migrateUserAvatars(db *sql.DB) {
    rows, _ := db.Query("SELECT id, avatar FROM users WHERE avatar LIKE '/uploads/%'")
    defer rows.Close()
    
    for rows.Next() {
        var userID int
        var oldPath string
        rows.Scan(&userID, &oldPath)
        
        // Локальный путь
        localPath := filepath.Join("../../", oldPath)
        if _, err := os.Stat(localPath); os.IsNotExist(err) {
            log.Printf("⚠️  File not found: %s", localPath)
            continue
        }
        
        // Новый S3 ключ
        filename := filepath.Base(oldPath)
        s3Key := fmt.Sprintf("users/%d/avatars/%s", userID, filename)
        
        // Загружаем в S3
        newURL, err := storage.GlobalS3Client.UploadFileFromPath(
            localPath, 
            s3Key, 
            "image/jpeg")
        
        if err != nil {
            log.Printf("❌ Failed to upload %s: %v", oldPath, err)
            continue
        }
        
        // Обновляем в БД
        db.Exec("UPDATE users SET avatar = ? WHERE id = ?", newURL, userID)
        
        log.Printf("✅ Migrated avatar: %s -> %s", oldPath, newURL)
    }
}

func migrateUserCovers(db *sql.DB) {
    // Аналогично migrateUserAvatars для обложек
}

func migratePostPhotos(db *sql.DB) {
    // Аналогично migrateUserAvatars для фото в постах
}
```

#### Запуск миграции

```bash
cd backend/scripts/migrate_to_s3
go run main.go
```

### Обновление URL в базе данных

Если файлы уже в S3, но URL в БД старые:

```sql
-- Обновить аватары
UPDATE users 
SET avatar = REPLACE(avatar, '/uploads/', 'https://zooplatforma.s3.firstvds.ru/')
WHERE avatar LIKE '/uploads/%';

-- Обновить обложки
UPDATE users 
SET cover_photo = REPLACE(cover_photo, '/uploads/', 'https://zooplatforma.s3.firstvds.ru/')
WHERE cover_photo LIKE '/uploads/%';

-- Обновить вложения в сообщениях
UPDATE message_attachments 
SET file_path = REPLACE(file_path, '/uploads/', 'https://zooplatforma.s3.firstvds.ru/')
WHERE file_path LIKE '/uploads/%';

-- Обновить фото в постах
UPDATE post_media 
SET file_path = REPLACE(file_path, '/uploads/', 'https://zooplatforma.s3.firstvds.ru/')
WHERE file_path LIKE '/uploads/%';
```

---

## Тестирование

### Тест подключения к S3

Создайте `backend/scripts/test_s3/main.go`:

```go
package main

import (
    "backend/storage"
    "fmt"
    "log"
    "os"
    
    "github.com/joho/godotenv"
)

func main() {
    // Загружаем .env
    godotenv.Load("../../.env")
    
    // Инициализируем S3
    fmt.Println("🔄 Initializing S3...")
    if err := storage.InitS3(); err != nil {
        log.Fatal("❌ Failed:", err)
    }
    fmt.Println("✅ S3 initialized")
    
    fmt.Println("✅ All tests passed!")
}
```

#### Запуск теста

```bash
cd backend/scripts/test_s3
go run main.go
```

#### Ожидаемый вывод

```
🔄 Initializing S3...
☁️  S3 storage initialized: bucket=zooplatforma, region=ru-1
🌐 CDN URL: https://zooplatforma.s3.firstvds.ru
✅ S3 initialized
✅ All tests passed!
```

---

## Безопасность

### Публичный доступ

Файлы загружаются с `ACL: public-read`, что означает:
- ✅ Файлы доступны по прямой ссылке
- ✅ Не требуется авторизация для просмотра
- ⚠️ Любой кто знает URL может скачать файл

### Приватные файлы

Если нужны приватные файлы (например, документы):

```go
// Загрузить без публичного доступа
result, err := uploader.Upload(&s3manager.UploadInput{
    Bucket:      aws.String(bucket),
    Key:         aws.String(filename),
    Body:        file,
    ContentType: aws.String(contentType),
    // ACL:         aws.String("public-read"), // Убрать эту строку
})

// Создать временную ссылку (expires in 1 hour)
req, _ := svc.GetObjectRequest(&s3.GetObjectInput{
    Bucket: aws.String(bucket),
    Key:    aws.String(filename),
})
url, err := req.Presign(1 * time.Hour)
```

### Рекомендации по безопасности

1. **Не храните ключи в коде** - используйте `.env` файл
2. **Добавьте `.env` в `.gitignore`** - не коммитьте секреты
3. **Используйте разные ключи** для production и development
4. **Ограничьте права доступа** - создайте отдельного пользователя только для S3
5. **Настройте CORS** - разрешите только нужные домены

---

## Мониторинг

### Проверка использования

```bash
# Через AWS CLI (если установлен)
aws s3 ls s3://zooplatforma --recursive --summarize --human-readable \
    --endpoint-url https://s3.firstvds.ru

# Или через веб-интерфейс FirstVDS
```

### Логи Backend

Backend логирует все операции с S3:

```
☁️  S3 storage initialized: bucket=zooplatforma, region=ru-1
🌐 CDN URL: https://zooplatforma.s3.firstvds.ru
```

При ошибках:

```
⚠️  S3 initialization failed: ...
📁 Falling back to local file storage
```

### Lifecycle Policy

Рекомендуется настроить lifecycle policy в S3:
- Временные файлы (`temp/`) удаляются через 24 часа
- Старые версии файлов удаляются через 30 дней
- Неиспользуемые файлы архивируются через 90 дней

---

## Troubleshooting

### Ошибка: "failed to create S3 session"

**Причины:**
- Неверный `S3_ENDPOINT`
- Неверные `S3_ACCESS_KEY` или `S3_SECRET_KEY`
- Нет интернет-соединения

**Решение:**
1. Проверьте `.env` файл
2. Убедитесь что ключи скопированы полностью (без пробелов)
3. Проверьте доступ к интернету
4. Попробуйте подключиться к endpoint через браузер

### Ошибка: "Cannot access bucket"

**Причины:**
- Бакет не существует
- Неверный регион
- Нет прав доступа у ключа

**Решение:**
1. Проверьте что бакет создан в панели управления
2. Убедитесь что `S3_REGION` совпадает с регионом бакета
3. Проверьте права доступа ключа (должен иметь права на чтение/запись)
4. Проверьте имя бакета (без опечаток)

### Файлы не загружаются

**Причины:**
- `USE_S3=false` в `.env`
- S3 клиент не инициализирован
- Ошибка в коде загрузки
- Недостаточно прав у ключа

**Решение:**
1. Проверьте `USE_S3=true` в `.env`
2. Проверьте логи при запуске: должно быть "☁️ S3 storage initialized"
3. Проверьте код загрузки файлов
4. Проверьте права доступа ключа

### CORS ошибки

Если загрузка с фронтенда не работает:

1. Проверьте CORS настройки бакета
2. Добавьте ваш домен в `AllowedOrigins`
3. Убедитесь что методы `PUT`, `POST` разрешены
4. Проверьте что `AllowedHeaders` включает `*` или нужные заголовки

### Fallback на локальное хранилище

Если S3 недоступен, система автоматически переключится на локальное хранилище:

```
⚠️  S3 initialization failed: ...
📁 Falling back to local file storage
```

Файлы будут сохраняться в `backend/uploads/`

### Переключение между S3 и локальным хранилищем

#### Использовать S3
```env
USE_S3=true
```

#### Использовать локальное хранилище
```env
USE_S3=false
```

⚠️ **Важно**: Перезапустите Backend после изменения!

---

## Дополнительные ресурсы

- [FirstVDS S3 Documentation](https://firstvds.ru/technology/s3-storage)
- [AWS SDK for Go](https://docs.aws.amazon.com/sdk-for-go/api/service/s3/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)

---

**Дата создания:** 8 февраля 2026  
**Последнее обновление:** 8 февраля 2026  
**Автор:** Kiro AI Assistant
