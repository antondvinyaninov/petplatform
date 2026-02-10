# Структура таблицы pets

## Полная структура таблицы (актуальная на 10.02.2026)

| Column             | Type                      | Nullable | Default                    | Описание                           |
|--------------------|---------------------------|----------|----------------------------|------------------------------------|
| id                 | integer                   | NOT NULL | nextval('pets_id_seq')     | ID питомца (PRIMARY KEY)           |
| user_id            | integer                   | NOT NULL |                            | ID владельца (FK → users.id)       |
| name               | text                      | NOT NULL |                            | Имя питомца                        |
| species            | text                      | NOT NULL |                            | Вид (текст, для обратной совм.)    |
| breed              | text                      | NULL     |                            | Порода (текст, для обратной совм.) |
| age                | integer                   | NULL     |                            | Возраст (старое поле)              |
| weight             | numeric(5,2)              | NULL     |                            | Вес питомца                        |
| color              | text                      | NULL     |                            | Окрас                              |
| gender             | text                      | NULL     |                            | Пол (male/female)                  |
| microchip          | text                      | NULL     |                            | Микрочип (старое поле)             |
| tag_number         | text                      | NULL     |                            | Номер бирки                        |
| sterilization_date | date                      | NULL     |                            | Дата стерилизации                  |
| created_at         | timestamp without time zone | NULL   | CURRENT_TIMESTAMP          | Дата создания записи               |
| updated_at         | timestamp without time zone | NULL   | CURRENT_TIMESTAMP          | Дата обновления записи             |
| photo              | text                      | NULL     |                            | Фото питомца (URL)                 |
| curator_id         | integer                   | NULL     |                            | ID куратора                        |
| location           | text                      | NULL     |                            | Местоположение                     |
| relationship       | varchar(20)               | NULL     | 'owner'                    | Отношение (owner/guardian/etc)     |
| species_id         | integer                   | NULL     |                            | ID вида (FK → species.id)          |
| breed_id           | integer                   | NULL     |                            | ID породы (FK → breeds.id)         |
| birth_date         | date                      | NULL     |                            | Дата рождения                      |
| age_type           | varchar(20)               | NULL     | 'exact'                    | Тип возраста (exact/approximate)   |
| approximate_years  | integer                   | NULL     | 0                          | Приблизительный возраст (годы)     |
| approximate_months | integer                   | NULL     | 0                          | Приблизительный возраст (месяцы)   |
| description        | text                      | NULL     |                            | Описание питомца                   |
| fur                | varchar(100)              | NULL     |                            | Тип шерсти                         |
| ears               | varchar(100)              | NULL     |                            | Тип ушей                           |
| tail               | varchar(100)              | NULL     |                            | Тип хвоста                         |
| size               | varchar(20)               | NULL     |                            | Размер (small/medium/large)        |
| special_marks      | text                      | NULL     |                            | Особые приметы                     |
| marking_date       | date                      | NULL     |                            | Дата маркирования                  |
| brand_number       | varchar(50)               | NULL     |                            | Номер клейма                       |
| chip_number        | varchar(50)               | NULL     |                            | Номер чипа                         |

## Группировка полей

### Основная информация
- id, user_id, name, gender, birth_date, age_type, approximate_years, approximate_months
- species, species_id (текст + ID для обратной совместимости)
- breed, breed_id (текст + ID для обратной совместимости)

### Физические характеристики
- color (окрас)
- fur (тип шерсти)
- ears (тип ушей)
- tail (тип хвоста)
- size (размер: small/medium/large)
- weight (вес)
- special_marks (особые приметы)

### Идентификация
- microchip (старое поле)
- chip_number (новое поле для номера чипа)
- tag_number (номер бирки)
- brand_number (номер клейма)
- marking_date (дата маркирования)

### Медицинская информация
- sterilization_date (дата стерилизации)

### Дополнительная информация
- description (описание)
- photo (фото)
- location (местоположение)
- relationship (отношение к владельцу)
- curator_id (ID куратора)

### Системные поля
- created_at (дата создания)
- updated_at (дата обновления)

## Связи (Foreign Keys)

- `user_id` → `users.id` (владелец питомца)
- `species_id` → `species.id` (вид животного)
- `breed_id` → `breeds.id` (порода)
- `curator_id` → `users.id` (куратор, если есть)

## Примечания

1. **Обратная совместимость**: Поля `species` и `breed` (TEXT) заполняются автоматически при создании/обновлении питомца вместе с `species_id` и `breed_id` (INTEGER)

2. **Возраст**: Используется либо `birth_date` (если известна точная дата), либо `approximate_years` + `approximate_months` (если возраст приблизительный). Поле `age_type` определяет тип: 'exact' или 'approximate'

3. **Идентификация**: Есть старое поле `microchip` и новое `chip_number`. Рекомендуется использовать `chip_number`

4. **Defaults**: 
   - `relationship` = 'owner'
   - `age_type` = 'exact'
   - `approximate_years` = 0
   - `approximate_months` = 0
