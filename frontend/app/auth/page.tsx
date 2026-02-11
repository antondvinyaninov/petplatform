'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthForm from '../components/AuthForm';

export default function AdminAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Устанавливаем title страницы
  useEffect(() => {
    document.title = 'Вход в кабинет зоопомощника - ЗооПлатформа';
  }, []);

  // Проверяем авторизацию при загрузке страницы
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Пользователь уже авторизован - перенаправляем в кабинет
          console.log('✅ User already authenticated, redirecting to /pets');
          router.push('/pets');
          return;
        }
      }
    } catch (err) {
      console.log('Not authenticated, showing login form');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (data: { email: string; password: string }) => {
    try {
      console.log('🔐 Attempting login...');
      
      // Логинимся через Next.js proxy (обходим CORS)
      const loginResponse = await fetch('/api/gateway/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      console.log('📥 Login response status:', loginResponse.status);
      const loginResult = await loginResponse.json();
      console.log('📥 Login result:', loginResult);

      if (!loginResult.success) {
        console.error('❌ Login failed:', loginResult.error);
        return { success: false, error: loginResult.error || 'Неверный email или пароль' };
      }

      console.log('✅ Login successful!');

      // Успешный вход - редирект в кабинет
      router.push('/pets');
      return { success: true };
    } catch (err) {
      console.error('💥 Login error:', err);
      return { success: false, error: 'Ошибка подключения к серверу' };
    }
  };

  // Показываем загрузку пока проверяем авторизацию
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-gray-500">Проверка авторизации...</div>
      </div>
    );
  }

  return (
    <AuthForm
      mode="login"
      showTabs={false}
      onSubmit={handleSubmit}
      logoText="ЗооПлатформа"
      logoAlt="ЗооПлатформа - Кабинет зоопомощника"
      subtitle="Войдите в кабинет зоопомощника"
      infoTitle="🐾 Кабинет зоопомощника"
      infoText="Управляйте информацией о ваших подопечных"
    />
  );
}
