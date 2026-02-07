# Шаги для деплоя Admin Panel

## 1. Подготовка Git

```bash
# Создать ветку admin
git checkout -b admin

# Добавить все файлы
git add .

# Закоммитить
git commit -m "Admin panel ready for deployment"

# Запушить в GitHub
git push origin admin
```

## 2. Easypanel - Backend Service

**Создать сервис:**
- Name: `admin-backend`
- Type: App
- Source: GitHub
  - Repository: `antondvinyaninovpetplatform`
  - Branch: `admin`
  - Build Path: `backend`

**Environment Variables:**
```
GATEWAY_URL=https://api.zooplatforma.ru
JWT_SECRET=jyjy4VlgOPGIPSG5vJPurXDnd1ZpHj2X2dIBtdWfjJE=
PORT=9000
ENVIRONMENT=production
CORS_ORIGINS=https://admin.zooplatforma.ru,https://api.zooplatforma.ru
```

**Ports:**
- Internal: 9000

**Deploy!**

## 3. Easypanel - Frontend Service

**Создать сервис:**
- Name: `admin-frontend`
- Type: App
- Source: GitHub
  - Repository: `antondvinyaninovpetplatform`
  - Branch: `admin`
  - Build Path: `frontend`

**Environment Variables:**
```
ADMIN_API_URL=http://admin-backend:9000
NEXT_PUBLIC_GATEWAY_URL=https://api.zooplatforma.ru
NEXT_PUBLIC_ENVIRONMENT=production
```

**Ports:**
- Internal: 3000
- External: 80

**Domain:**
- `admin.zooplatforma.ru`
- Enable SSL

**Deploy!**

## 4. DNS Settings

В вашем DNS провайдере добавьте:

```
Type: A
Name: admin
Value: <IP сервера Easypanel>
TTL: 300
```

## 5. Проверка

### Backend Health
```bash
curl http://admin-backend:9000/api/admin/health
```

### Frontend
Откройте: `https://admin.zooplatforma.ru`

## 6. Первый вход

1. Откройте `https://admin.zooplatforma.ru`
2. Войдите с учетными данными superadmin
3. Проверьте все страницы:
   - Dashboard
   - Users
   - Posts
   - Organizations
   - Logs
   - Monitoring
   - Moderation

## Готово! 🎉

Админ-панель развернута и готова к использованию.

## Обновления

Для обновления просто пушьте изменения в ветку `admin`:

```bash
git add .
git commit -m "Update admin panel"
git push origin admin
```

Easypanel автоматически пересоберет и задеплоит.
