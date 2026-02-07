# TODO для Gateway

## Добавить endpoints для админ-панели

### 1. Organizations (GET)
```
GET /api/organizations
```
Сейчас возвращает 405 (Method Not Allowed).
Нужно разрешить GET метод.

### 2. Activity Stats
```
GET /api/activity/stats
```
Сейчас возвращает 404 (Not Found).
Нужно создать endpoint который возвращает:
```json
{
  "online_now": 0,
  "active_last_hour": 0,
  "active_last_24h": 0
}
```

---

**Приоритет:** Низкий (админка работает, просто нет данных на дашборде)

**Дата:** 6 февраля 2026
