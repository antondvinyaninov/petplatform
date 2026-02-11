# 🐾 ЗооПлатформа - Кабинет зоопомощника

> Сервис для волонтёров и зоопомощников, которые ухаживают за питомцами в приютах и организациях

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/zooplatforma/volunteer-cabinet)
[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://golang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)

---

## 📋 Описание

**Кабинет зоопомощника** - это веб-приложение для волонтёров, которые помогают животным в приютах, клиниках и других организациях. Сервис позволяет вести учёт подопечных питомцев, отмечать ежедневный уход, хранить медицинские записи и координировать работу с другими волонтёрами.

### Кто такие зоопомощники?

- 🐕 Волонтёры приютов
- 🏥 Помощники в ветклиниках
- 🤝 Кураторы питомцев
- 💚 Люди, помогающие бездомным животным

---

## ✨ Основной функционал

### 🐾 Мои подопечные
- Список питомцев, за которыми вы ухаживаете
- Подробные карточки с фото и информацией
- Быстрый доступ к важным данным

### 📋 Ежедневный уход (планируется)
- Отметки о кормлении и выгуле
- Заметки о поведении
- Контроль веса и самочувствия

### 💉 Здоровье
- Медицинские записи
- История прививок
- Обработки от паразитов
- Напоминания о предстоящих процедурах

### 📸 Фото и документы
- Загрузка фото питомцев
- Хранение документов
- Идентификация (чип, бирка, клеймо)

---

## 🏗️ Архитектура

```
┌─────────────────────────┐
│  Volunteer Frontend     │
│  (Next.js, Port 4000)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Volunteer Backend      │
│  (Go, Port 9000)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Gateway API            │
│  (Port 80)              │
└───────────┬─────────────┘
            │
            ├──────────────────┐
            ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  PetID Service  │  │  Main Service   │
│  (Pets data)    │  │  (Users, etc)   │
└─────────────────┘  └─────────────────┘
```

---

## 🚀 Быстрый старт

### Требования
- Go 1.21+
- Node.js 18+
- npm или yarn

### 1. Клонировать репозиторий
```bash
git clone https://github.com/zooplatforma/volunteer-cabinet.git
cd volunteer-cabinet
```

### 2. Запустить Backend
```bash
cd backend
cp .env.example .env
# Отредактируйте .env файл
go run main.go
```

Backend запустится на `http://localhost:9000`

### 3. Запустить Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend запустится на `http://localhost:4000`

### 4. Открыть в браузере
```
http://localhost:4000
```

Подробная инструкция: [QUICKSTART.md](QUICKSTART.md)

---

## 📁 Структура проекта

```
volunteer-cabinet/
├── backend/              # Go API сервер
│   ├── handlers/        # HTTP handlers
│   ├── middleware/      # Middleware (auth, gateway)
│   └── main.go         # Точка входа
│
├── frontend/            # Next.js приложение
│   ├── app/            # Next.js App Router
│   │   ├── (dashboard)/ # Защищённые страницы
│   │   ├── auth/       # Авторизация
│   │   └── page.tsx    # Главная страница
│   └── lib/            # Утилиты
│
└── docs/               # Документация
    ├── VOLUNTEER_CABINET.md  # Концепция
    ├── CHANGES.md           # Изменения
    ├── QUICKSTART.md        # Быстрый старт
    ├── PETID.md            # PetID сервис
    └── DATABASE_SCHEMA.md  # Схема БД
```

---

## 🔌 API Endpoints

### Питомцы
```
GET    /api/admin/pets              # Список подопечных
POST   /api/admin/pets              # Добавить подопечного
GET    /api/admin/pets/:id          # Карточка питомца
PUT    /api/admin/pets/:id          # Обновить данные
DELETE /api/admin/pets/:id          # Удалить питомца
POST   /api/admin/pets/:id/photo    # Загрузить фото
```

### Породы
```
GET    /api/admin/breeds            # Список пород
```

### Авторизация
```
GET    /api/admin/auth/me           # Текущий пользователь
POST   /api/admin/auth/logout       # Выход
```

Полная документация API: [PETID_API_DOCUMENTATION.md](PETID_API_DOCUMENTATION.md)

---

## 🔐 Авторизация

Система использует JWT токены через cookie `auth_token`.

### Роли пользователей:
- `user` - обычный пользователь
- `curator` - зоопомощник (волонтёр) ⭐
- `admin` - администратор
- `superadmin` - суперадминистратор

При создании питомца автоматически устанавливается `relationship: 'curator'`, что означает что текущий пользователь становится куратором питомца.

---

## 💻 Технологии

### Backend
- **Go 1.21+** - язык программирования
- **net/http** - HTTP сервер
- **gorilla/mux** - роутинг
- **golang-jwt** - JWT токены

### Frontend
- **Next.js 16** - React фреймворк
- **React 19** - UI библиотека
- **TypeScript** - типизация
- **Tailwind CSS 4** - стилизация
- **Heroicons** - иконки

### База данных
- **PostgreSQL 15** - реляционная БД
- **PetID Service** - Single Source of Truth для питомцев

---

## 📚 Документация

- [VOLUNTEER_CABINET.md](VOLUNTEER_CABINET.md) - Полное описание концепции
- [QUICKSTART.md](QUICKSTART.md) - Быстрый старт
- [CHANGES.md](CHANGES.md) - История изменений
- [PETID.md](PETID.md) - Документация PetID сервиса
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Схема базы данных
- [PETID_API_DOCUMENTATION.md](PETID_API_DOCUMENTATION.md) - API документация

---

## 🎯 Roadmap

### Фаза 1 (Февраль 2026) ✅
- [x] Переименование проекта
- [x] Адаптация интерфейса для волонтёров
- [x] Изменение дефолтной роли на curator
- [x] Обновление документации

### Фаза 2 (Март 2026)
- [ ] Ежедневный уход (кормление, выгул)
- [ ] Заметки о поведении
- [ ] Календарь ухода
- [ ] Фильтрация по curator_id

### Фаза 3 (Апрель 2026)
- [ ] Напоминания о прививках/обработках
- [ ] Статистика по подопечным
- [ ] Экспорт данных
- [ ] Мобильная версия

### Фаза 4 (Май 2026)
- [ ] Чат с другими волонтёрами
- [ ] Координация выгулов
- [ ] Система задач
- [ ] Геймификация (достижения)

---

## 🤝 Вклад в проект

Мы приветствуем вклад в развитие проекта!

### Как помочь:
1. Fork репозитория
2. Создайте ветку для вашей фичи (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📝 Лицензия

© 2026 ЗооПлатформа. Все права защищены.

---

## 📞 Контакты

**Вопросы и предложения:**
- Email: dev@zooplatforma.ru
- Telegram: @zooplatforma_dev

**Основной сайт:**
- https://zooplatforma.ru

---

## 🙏 Благодарности

Спасибо всем волонтёрам и зоопомощникам, которые помогают животным! Этот проект создан специально для вас. 💚

---

**Кабинет зоопомощника - помогаем тем, кто помогает животным.**

*Последнее обновление: 11 февраля 2026*
