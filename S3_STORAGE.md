# S3 Storage Configuration

## ☁️ Настройка S3 хранилища (FirstVDS)

Все файлы пользователей теперь хранятся в S3 вместо локальной файловой системы.

## 📦 Что хранится в S3

- **Аватары пользователей** - `users/{user_id}/avatars/`
- **Обложки профилей** - `users/{user_id}/covers/`
- **Медиа в сообщениях** - `messages/`
- **Фото постов** - `posts/`
- **Другие загрузки** - `uploads/`

## 🔧 Конфигурация

### .env файл

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

### Параметры

- **USE_S3** - включить/выключить S3 (`true`/`false`)
- **S3_ENDPOINT** - адрес S3 сервера
- **S3_REGION** - регион (для FirstVDS обычно `ru-1`)
- **S3_BUCKET** - имя бакета
- **S3_ACCESS_KEY** - ключ доступа
- **S3_SECRET_KEY** - секретный ключ
- **S3_CDN_URL** - URL для доступа к файлам (опционально)

## 🧪 Тестирование подключения

```bash
cd main/backend/scripts/test_s3
go run main.go
```

Скрипт проверит:
- ✅ Подключение к S3
- ✅ Доступ к бакету
- ✅ Загрузку тестового файла
- ✅ Удаление файла

## 📝 Использование в коде

### Загрузка файла

```go
import "backend/storage"

// Сохранить файл (автоматически в S3 или локально)
fileURL, err := storage.SaveFile(file, "users/1/avatar.jpg", "image/jpeg")
if err != nil {
    // Обработка ошибки
}

// fileURL будет:
// - S3: https://zooplatforma.s3.firstvds.ru/users/1/avatar.jpg
// - Local: /uploads/users/1/avatar.jpg
```

### Получение URL файла

```go
// Получить правильный URL (с CDN если настроен)
url := storage.GetFileURL("/uploads/users/1/avatar.jpg")
// Вернет: https://zooplatforma.s3.firstvds.ru/users/1/avatar.jpg
```

### Удаление файла

```go
// Удалить файл из S3
err := storage.GlobalS3Client.DeleteFile(fileURL)
```

## 🔄 Миграция с локального хранилища на S3

Если у вас уже есть файлы в локальном хранилище:

### 1. Создать скрипт миграции

```go
// scripts/migrate_to_s3/main.go
package main

import (
    "backend/storage"
    "fmt"
    "os"
    "path/filepath"
    
    "github.com/joho/godotenv"
)

func main() {
    // Load .env
    godotenv.Load("../../.env")
    
    storage.InitS3()
    
    // Пройтись по всем файлам в uploads/
    filepath.Walk("../../../uploads", func(path string, info os.FileInfo, err error) error {
        if err != nil || info.IsDir() {
            return nil
        }
        
        // Определить S3 ключ
        relPath, _ := filepath.Rel("../../../uploads", path)
        
        // Загрузить в S3
        url, err := storage.GlobalS3Client.UploadFileFromPath(path, relPath, "application/octet-stream")
        if err != nil {
            fmt.Printf("❌ Failed: %s - %v\n", path, err)
        } else {
            fmt.Printf("✅ Migrated: %s -> %s\n", path, url)
        }
        
        return nil
    })
}
```

### 2. Запустить миграцию

```bash
cd main/backend/scripts/migrate_to_s3
go run main.go
```

### 3. Обновить URL в базе данных

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
```

## 🔒 Безопасность

### Публичный доступ

Файлы загружаются с `ACL: public-read`, что означает:
- ✅ Файлы доступны по прямой ссылке
- ✅ Не требуется авторизация для просмотра
- ⚠️ Любой кто знает URL может скачать файл

### Приватные файлы

Если нужны приватные файлы:

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

## 📊 Мониторинг

### Проверка использования

```bash
# Через AWS CLI (если установлен)
aws s3 ls s3://zooplatforma --recursive --summarize --human-readable \
    --endpoint-url https://s3.firstvds.ru

# Или через веб-интерфейс FirstVDS
```

### Логи

Backend логирует все операции с S3:

```
☁️  S3 storage initialized: bucket=zooplatforma, region=ru-1
🌐 CDN URL: https://zooplatforma.s3.firstvds.ru
```

## 🚨 Troubleshooting

### Ошибка: "failed to create S3 session"

Проверь:
- ✅ `S3_ENDPOINT` правильный
- ✅ `S3_ACCESS_KEY` и `S3_SECRET_KEY` корректные
- ✅ Интернет соединение работает

### Ошибка: "Cannot access bucket"

Проверь:
- ✅ Бакет `zooplatforma` существует
- ✅ У пользователя есть права на бакет
- ✅ Бакет в правильном регионе

### Fallback на локальное хранилище

Если S3 недоступен, система автоматически переключится на локальное хранилище:

```
⚠️  S3 initialization failed: ...
📁 Falling back to local file storage
```

Файлы будут сохраняться в `../../uploads/`

## 🔄 Переключение между S3 и локальным хранилищем

### Использовать S3

```env
USE_S3=true
```

### Использовать локальное хранилище

```env
USE_S3=false
```

Перезапусти Backend после изменения.

## 📚 Дополнительная информация

- [FirstVDS S3 Documentation](https://firstvds.ru/technology/s3-storage)
- [AWS SDK for Go](https://docs.aws.amazon.com/sdk-for-go/api/service/s3/)

---

**Дата обновления:** 3 февраля 2026
