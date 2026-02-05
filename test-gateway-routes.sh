#!/bin/bash

# Скрипт для проверки всех Gateway роутов
# Использование: ./test-gateway-routes.sh YOUR_AUTH_TOKEN

GATEWAY_URL="https://my-projects-gateway-zp.crv1ic.easypanel.host"
AUTH_TOKEN="${1:-}"

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ Ошибка: не указан auth token"
    echo "Использование: ./test-gateway-routes.sh YOUR_AUTH_TOKEN"
    echo ""
    echo "Чтобы получить токен:"
    echo "1. Открой DevTools (F12)"
    echo "2. Перейди в Application → Cookies"
    echo "3. Скопируй значение auth_token"
    exit 1
fi

echo "🔍 Проверка Gateway роутов..."
echo "Gateway: $GATEWAY_URL"
echo ""

# Счетчики
TOTAL=0
SUCCESS=0
FAILED=0

# Функция для проверки endpoint
check_endpoint() {
    local method=$1
    local path=$2
    local description=$3
    local expect_auth=${4:-false}
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "[$TOTAL] $method $path - $description... "
    
    # Делаем запрос
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" \
            -H "Cookie: auth_token=$AUTH_TOKEN" \
            -H "Origin: https://my-projects-zooplatforma.crv1ic.easypanel.host" \
            "$GATEWAY_URL$path" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Cookie: auth_token=$AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -H "Origin: https://my-projects-zooplatforma.crv1ic.easypanel.host" \
            "$GATEWAY_URL$path" 2>&1)
    fi
    
    # Извлекаем HTTP код (последняя строка)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    # Проверяем результат
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "✅ OK ($http_code)"
        SUCCESS=$((SUCCESS + 1))
    elif [ "$http_code" = "401" ] && [ "$expect_auth" = "true" ]; then
        echo "⚠️  Требует авторизацию ($http_code) - проверь токен"
        FAILED=$((FAILED + 1))
    elif [ "$http_code" = "404" ]; then
        echo "❌ Not Found ($http_code) - роут не настроен в Gateway"
        FAILED=$((FAILED + 1))
    elif [ "$http_code" = "000" ]; then
        echo "❌ Connection Failed - Gateway недоступен"
        FAILED=$((FAILED + 1))
    else
        echo "⚠️  $http_code"
        # Показываем первые 100 символов ответа
        echo "   Response: $(echo "$body" | head -c 100)"
        FAILED=$((FAILED + 1))
    fi
}

echo "=== 1. Авторизация ==="
check_endpoint "GET" "/api/auth/me" "Получить текущего пользователя" true

echo ""
echo "=== 2. Пользователи ==="
check_endpoint "GET" "/api/users/1" "Получить пользователя по ID"
check_endpoint "GET" "/api/users/stats" "Статистика пользователей"

echo ""
echo "=== 3. Профиль ==="
check_endpoint "GET" "/api/profile" "Получить профиль" true

echo ""
echo "=== 4. Посты ==="
check_endpoint "GET" "/api/posts" "Получить список постов"
check_endpoint "GET" "/api/posts/1" "Получить пост по ID"

echo ""
echo "=== 5. Комментарии ==="
check_endpoint "GET" "/api/comments/post/1" "Получить комментарии к посту"

echo ""
echo "=== 6. Опросы ⚠️ ВАЖНО ==="
check_endpoint "GET" "/api/polls/post/12" "Получить опрос для поста 12"

echo ""
echo "=== 7. Питомцы ==="
check_endpoint "GET" "/api/pets" "Получить список питомцев"
check_endpoint "GET" "/api/pets/user/1" "Получить питомцев пользователя"

echo ""
echo "=== 8. Объявления ==="
check_endpoint "GET" "/api/announcements" "Получить список объявлений"

echo ""
echo "=== 9. Друзья ==="
check_endpoint "GET" "/api/friends" "Получить список друзей" true
check_endpoint "GET" "/api/friends/requests" "Получить запросы в друзья" true

echo ""
echo "=== 10. Уведомления ==="
check_endpoint "GET" "/api/notifications" "Получить уведомления" true
check_endpoint "GET" "/api/notifications/unread" "Количество непрочитанных" true

echo ""
echo "=== 11. Организации ==="
check_endpoint "GET" "/api/organizations/all" "Получить все организации"
check_endpoint "GET" "/api/organizations/my" "Мои организации" true

echo ""
echo "=== 12. Мессенджер ⚠️ ВАЖНО ==="
check_endpoint "GET" "/api/chats" "Получить список чатов" true
check_endpoint "GET" "/api/messages/unread" "Непрочитанные сообщения" true

echo ""
echo "=== 13. Избранное ==="
check_endpoint "GET" "/api/favorites" "Получить избранное" true

echo ""
echo "=== 14. Роли ==="
check_endpoint "GET" "/api/roles/available" "Доступные роли"

echo ""
echo "=== 15. Health Check ==="
check_endpoint "GET" "/api/health" "Health check"
check_endpoint "GET" "/ping" "Ping"

echo ""
echo "=========================================="
echo "📊 Результаты проверки:"
echo "   Всего: $TOTAL"
echo "   ✅ Успешно: $SUCCESS"
echo "   ❌ Ошибок: $FAILED"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo "🎉 Все роуты работают!"
    exit 0
else
    echo "⚠️  Найдены проблемы с $FAILED роутами"
    exit 1
fi
