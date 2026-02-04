# API Keys

Этот файл содержит все API ключи, используемые в проекте.

⚠️ **ВАЖНО**: Этот файл должен быть добавлен в `.gitignore` для безопасности!

## DaData API

**Назначение**: Поиск организаций по ИНН/ОГРН/названию, определение города по IP, автодополнение адресов

- **API-ключ**: `300ba9e25ef32f0d6ea7c41826b2255b138e19e2`
- **Секретный ключ**: `4330a2f087fa8cfab03eaa6d915308abae5bc0a4`
- **Документация**: https://dadata.ru/api/
- **Используется в**:
  - `frontend/app/components/layout/CityDetector.tsx` - определение города
  - `frontend/app/components/shared/OrganizationSearch.tsx` - поиск организаций

## Yandex Maps API

**Назначение**: Отображение карт и геокодирование адресов

- **API-ключ**: `ece8ef8e-8782-426f-951d-79e965468547`
- **Документация**: https://yandex.ru/dev/maps/
- **Используется в**:
  - `frontend/app/components/shared/YandexMap.tsx` - отображение карты организации

---

## Микросервисная архитектура

### Main Service (Главный сервис)

**Backend:**
- **Порт**: 8000
- **URL**: http://localhost:8000
- **База данных**: SQLite (`database/data.db`)
- **Hot reload**: Air
- **Статус**: Локальная разработка

**Frontend:**
- **Порт**: 3000
- **URL**: http://localhost:3000
- **Статус**: Локальная разработка

### Admin Panel (Админ-панель)

**Backend:**
- **Порт**: 9000
- **URL**: http://localhost:9000
- **База данных**: Общая с Main (`database/data.db`)
- **Hot reload**: Air
- **Доступ**: Только для суперадминов

**Frontend:**
- **Порт**: 4000
- **URL**: http://localhost:4000
- **Доступ**: Только для суперадминов

### PetBase (ЗооБаза)

**Backend:**
- **Порт**: 8100
- **URL**: http://localhost:8100
- **База данных**: Общая с Main (`database/data.db`)
- **Доступ**: Только для суперадминов

**Frontend:**
- **Порт**: 4100
- **URL**: http://localhost:4100
- **Доступ**: Только для суперадминов

### Mobile App

- **Порт**: 8081 (Metro Bundler)
- **URL**: http://localhost:8081
- **Платформы**: iOS, Android, Web
- **Статус**: Локальная разработка

---

## Сервисы и подключения

### GitHub

**Назначение**: Хостинг кода, версионирование

- **Репозиторий**: https://github.com/dvinyaninov/zooplatforma
- **Владелец**: dvinyaninov
- **Доступ**: Приватный репозиторий

### Vercel

**Назначение**: Хостинг frontend приложения

- **Проект**: zooplatforma
- **URL**: https://zooplatforma.vercel.app
- **Подключен к**: GitHub репозиторию
- **Автодеплой**: Включен для main ветки
- **Папка**: `main/frontend/`

---

## Backend Configuration

### JWT Secret (SSO)

**Назначение**: Подпись и проверка JWT токенов для всех микросервисов (SSO)

- **Секрет**: `jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=`
- **Файлы**: 
  - `main/backend/.env`
  - `admin/backend/.env`
  - `petbase/backend/.env`
- **Переменная**: `JWT_SECRET`
- **Генерация**: `openssl rand -base64 32`

⚠️ **КРИТИЧЕСКИ ВАЖНО**: 
- Все микросервисы ДОЛЖНЫ использовать ОДИН И ТОТ ЖЕ секрет для SSO
- Секрет должен быть уникальным для каждого окружения (dev, staging, production)
- При смене секрета все пользователи будут разлогинены

### SSO (Single Sign-On)

**Назначение**: Единая авторизация для всех микросервисов

- **Cookie**: `auth_token` (общий для всех сервисов)
- **Роли**: `user`, `superadmin`, `moderator`
- **Verify endpoint**: `http://localhost:8000/api/auth/verify`
- **Документация**: `docs/SSO_ARCHITECTURE.md`, `docs/SSO_FLOW.md`

**Как работает:**
1. Пользователь входит на Main (localhost:3000)
2. Получает JWT токен с ролями в cookie `auth_token`
3. Токен автоматически доступен всем микросервисам
4. Каждый сервис проверяет права доступа по ролям

### Database

**Назначение**: Общая база данных для всех микросервисов

- **Тип**: SQLite 3
- **Путь**: `database/data.db`
- **Модуль**: `database/` (отдельный Go модуль)
- **Таблицы**: users, posts, pets, likes, comments, polls, poll_options, poll_votes, admins, admin_logs, system_logs, species, breeds, pet_cards

⚠️ **ВАЖНО**: Все микросервисы используют одну базу данных

---

## Создание первого суперадмина

**Скрипт**: `admin/backend/create-superadmin.sh`

**Использование:**
```bash
cd admin/backend
./create-superadmin.sh <user_id>
```

**Пример:**
```bash
./create-superadmin.sh 1  # Сделать пользователя с ID=1 суперадмином
```

**Что делает:**
- Добавляет запись в таблицу `admins`
- Устанавливает роль `superadmin`
- Дает полные права доступа

---

## Environment Variables

### Main Backend (`main/backend/.env`)
```env
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=8000
```

### Admin Backend (`admin/backend/.env`)
```env
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
```

### PetBase Backend (`petbase/backend/.env`)
```env
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=8100
```

### Main Frontend (`main/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Admin Frontend (`admin/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

### PetBase Frontend (`petbase/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8100
```

### Mobile (`mobile/.env`)
```env
EXPO_PUBLIC_API_URL=http://192.168.0.12:8000
```

---

## Примечания

- Все ключи должны быть перенесены в environment variables (`.env.local`) в production
- Регулярно проверяйте лимиты использования API
- При компрометации ключей немедленно их замените
- GitHub репозиторий должен оставаться приватным до релиза
- Backend требует деплоя на отдельный сервер (например, Railway, Render, DigitalOcean)
- JWT_SECRET должен быть ОДИНАКОВЫМ для всех микросервисов (SSO)
- JWT_SECRET должен быть разным для dev и production
- Никогда не коммитьте `.env` файлы в Git
- При смене JWT_SECRET все пользователи будут разлогинены
- Для production используйте PostgreSQL вместо SQLite

---

**Последнее обновление:** 27 декабря 2025  
**Версия проекта:** 0.3.0
