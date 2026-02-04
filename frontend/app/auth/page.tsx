'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import AuthForm from '../components/AuthForm';

// Отключаем static generation
export const dynamic = 'force-dynamic';

function AuthPageContent() {
  const { login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (data: { name?: string; email: string; password: string; mode: 'login' | 'register' }) => {
    const result = data.mode === 'login' 
      ? await login(data.email, data.password)
      : await register(data.name!, data.email, data.password);

    if (result.success) {
      // Проверяем есть ли параметр redirect
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        // Редиректим на внешний URL (Owner, Volunteer и т.д.)
        window.location.href = redirectUrl;
      } else {
        // Редиректим на главную страницу Main
        router.push('/');
      }
    }

    return result;
  };

  return (
    <AuthForm
      showTabs={true}
      onSubmit={handleSubmit}
      logoText="Зооплатформа"
      logoAlt="ЗооПлатформа"
    />
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
