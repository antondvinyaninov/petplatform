#!/bin/bash

# Скрипт для создания первого суперадмина
# Использование: ./create-superadmin.sh <user_id>

if [ -z "$1" ]; then
  echo "❌ Ошибка: укажите ID пользователя"
  echo "Использование: ./create-superadmin.sh <user_id>"
  echo ""
  echo "Пример: ./create-superadmin.sh 1"
  exit 1
fi

USER_ID=$1
DB_PATH="../../database/data.db"

# Проверяем, существует ли пользователь
USER_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users WHERE id = $USER_ID;")

if [ "$USER_EXISTS" -eq 0 ]; then
  echo "❌ Ошибка: пользователь с ID $USER_ID не найден"
  echo ""
  echo "Список пользователей:"
  sqlite3 "$DB_PATH" "SELECT id, name, email FROM users;"
  exit 1
fi

# Проверяем, не является ли пользователь уже админом
ADMIN_EXISTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM admins WHERE user_id = $USER_ID;")

if [ "$ADMIN_EXISTS" -gt 0 ]; then
  echo "⚠️  Пользователь с ID $USER_ID уже является администратором"
  sqlite3 "$DB_PATH" "SELECT role FROM admins WHERE user_id = $USER_ID;"
  exit 0
fi

# Добавляем пользователя в таблицу admins
sqlite3 "$DB_PATH" "INSERT INTO admins (user_id, role) VALUES ($USER_ID, 'superadmin');"

echo "✅ Пользователь с ID $USER_ID успешно назначен суперадминистратором"
echo ""
echo "Информация о пользователе:"
sqlite3 "$DB_PATH" "SELECT u.id, u.name, u.email, a.role FROM users u JOIN admins a ON u.id = a.user_id WHERE u.id = $USER_ID;"
