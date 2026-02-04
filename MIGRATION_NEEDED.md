# ⚠️ ТРЕБУЕТСЯ МИГРАЦИЯ БАЗЫ ДАННЫХ

## Проблема

В таблице `users` отсутствуют колонки для профиля пользователя:
- `avatar` - URL аватара
- `cover_photo` - URL обложки профиля
- `last_name` - фамилия
- `bio` - информация о себе
- `phone` - телефон
- `location` - город
- `profile_visibility` - видимость профиля (public/friends/private)
- `show_phone` - кто видит телефон (everyone/friends/nobody)
- `show_email` - кто видит email (everyone/friends/nobody)
- `allow_messages` - кто может писать (everyone/friends/nobody)
- `show_online` - показывать онлайн статус (yes/no)

## Текущая схема

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    password TEXT NOT NULL DEFAULT ''
);
```

## Требуемая схема

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    bio TEXT,
    phone TEXT,
    location TEXT,
    avatar TEXT,
    cover_photo TEXT,
    profile_visibility TEXT DEFAULT 'public',
    show_phone TEXT DEFAULT 'nobody',
    show_email TEXT DEFAULT 'nobody',
    allow_messages TEXT DEFAULT 'everyone',
    show_online TEXT DEFAULT 'yes',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Миграция (SQL)

```sql
-- Добавляем колонки профиля
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;
ALTER TABLE users ADD COLUMN cover_photo TEXT;
ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public';
ALTER TABLE users ADD COLUMN show_phone TEXT DEFAULT 'nobody';
ALTER TABLE users ADD COLUMN show_email TEXT DEFAULT 'nobody';
ALTER TABLE users ADD COLUMN allow_messages TEXT DEFAULT 'everyone';
ALTER TABLE users ADD COLUMN show_online TEXT DEFAULT 'yes';
```

## Как применить

### Вариант 1: Через основной проект (рекомендуется)

1. Открой основной проект (весь репозиторий)
2. Создай миграцию в `database/migrations/`
3. Примени миграцию на всех сервисах
4. Вернись в Main workspace

### Вариант 2: Вручную (для разработки)

```bash
# Применить миграцию к Main БД
sqlite3 backend/data.db < migration.sql

# Или через sqlite3 интерактивно
sqlite3 backend/data.db
> ALTER TABLE users ADD COLUMN last_name TEXT;
> ALTER TABLE users ADD COLUMN bio TEXT;
> ... (остальные колонки)
> .quit
```

### Вариант 3: Через Go миграцию

Создай файл `backend/migrations/add_user_profile_fields.go`:

```go
package main

import (
    "database/sql"
    "log"
    _ "github.com/mattn/go-sqlite3"
)

func main() {
    db, err := sql.Open("sqlite3", "./data.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    migrations := []string{
        "ALTER TABLE users ADD COLUMN last_name TEXT",
        "ALTER TABLE users ADD COLUMN bio TEXT",
        "ALTER TABLE users ADD COLUMN phone TEXT",
        "ALTER TABLE users ADD COLUMN location TEXT",
        "ALTER TABLE users ADD COLUMN avatar TEXT",
        "ALTER TABLE users ADD COLUMN cover_photo TEXT",
        "ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT 'public'",
        "ALTER TABLE users ADD COLUMN show_phone TEXT DEFAULT 'nobody'",
        "ALTER TABLE users ADD COLUMN show_email TEXT DEFAULT 'nobody'",
        "ALTER TABLE users ADD COLUMN allow_messages TEXT DEFAULT 'everyone'",
        "ALTER TABLE users ADD COLUMN show_online TEXT DEFAULT 'yes'",
    }

    for _, migration := range migrations {
        _, err := db.Exec(migration)
        if err != nil {
            log.Printf("Warning: %v (column may already exist)", err)
        } else {
            log.Printf("✅ Applied: %s", migration)
        }
    }

    log.Println("✅ Migration completed!")
}
```

Запусти:
```bash
cd backend/migrations
go run add_user_profile_fields.go
```

## Проверка

После применения миграции проверь схему:

```bash
sqlite3 backend/data.db ".schema users"
```

Должны быть все новые колонки.

## Влияние на другие сервисы

⚠️ **ВАЖНО**: Эта миграция влияет на таблицу `users`, которая используется всеми сервисами!

Нужно проверить что изменения не сломают:
- Auth Service (7100) - использует `users` для авторизации
- Admin Service (9000) - управляет пользователями
- Другие сервисы, которые читают данные пользователей

## Следующие шаги

После применения миграции:

1. ✅ Перезапусти Main Backend
2. ✅ Проверь что загрузка аватара работает
3. ✅ Проверь что редактирование профиля работает
4. ✅ Проверь что отображение профиля работает

---

**Дата создания:** 3 февраля 2026
**Статус:** Требуется применение миграции
