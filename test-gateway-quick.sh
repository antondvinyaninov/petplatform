#!/bin/bash

# Быстрая проверка критичных Gateway роутов
# Использование: ./test-gateway-quick.sh YOUR_AUTH_TOKEN

GATEWAY_URL="https://my-projects-gateway-zp.crv1ic.easypanel.host"
AUTH_TOKEN="${1:-}"

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Ошибка: не указан auth token"
    echo ""
    echo "Как получить токен:"
    echo "1. Открой DevTools (F12) → Application → Cookies"
    echo "2. Найди auth_token для домена easypanel.host"
    echo "3. Кликни на него и скопируй ПОЛНОЕ значение"
    echo ""
    echo "Использование: ./test-gateway-quick.sh 'YOUR_TOKEN'"
    exit 1
fi

echo "🔍 Быстрая проверка критичных Gateway роутов..."
echo ""

# Функция для проверки
check() {
    local path=$1
    local name=$2
    
    echo -n "Проверяю $name... "
    
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: auth_token=$AUTH_TOKEN" \
        "$GATEWAY_URL$path")
    
    if [ "$http_code" = "200" ]; then
        echo "✅ OK"
        return 0
    elif [ "$http_code" = "401" ]; then
        echo "❌ 401 Unauthorized (проверь токен)"
        return 1
    elif [ "$http_code" = "404" ]; then
        echo "❌ 404 Not Found (роут не настроен в Gateway)"
        return 1
    else
        echo "⚠️  $http_code"
        return 1
    fi
}

# Проверяем критичные endpoints
echo "=== Критичные endpoints ==="
check "/api/polls/post/12" "Опросы"
check "/api/chats" "Мессенджер"
check "/api/posts" "Посты"
check "/api/friends" "Друзья"
check "/api/auth/me" "Авторизация"

echo ""
echo "=== Дополнительные ==="
check "/api/notifications" "Уведомления"
check "/api/organizations/all" "Организации"
check "/api/users/1" "Пользователи"

echo ""
echo "✅ Проверка завершена!"
