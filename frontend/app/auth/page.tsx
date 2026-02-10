'use client';

import { useRouter } from 'next/navigation';
import AuthForm from '../components/AuthForm';

export default function AdminAuth() {
  const router = useRouter();

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

  return (
    <AuthForm
      mode="login"
      showTabs={false}
      onSubmit={handleSubmit}
      logoText="ЗооПлатформа"
      logoAlt="ЗооПлатформа - Кабинет владельца"
      subtitle="Войдите в кабинет владельца животных"
      infoTitle="🐾 Кабинет владельца"
      infoText="Управляйте информацией о ваших питомцах"
    />
  );
}
