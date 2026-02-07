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

      console.log('✅ Login successful, checking admin rights...');

      // Проверяем права администратора через proxy
      const meResponse = await fetch('/api/gateway/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      console.log('📥 Me response status:', meResponse.status);
      const meResult = await meResponse.json();
      console.log('📥 Me result:', meResult);
      console.log('📥 Full user object:', JSON.stringify(meResult.user, null, 2));

      if (!meResult.success) {
        console.error('❌ Me check failed:', meResult.error);
        return { success: false, error: 'У вас нет прав администратора' };
      }

      // Проверяем роль superadmin
      // Gateway может возвращать либо role (строка), либо roles (массив)
      const userRole = meResult.user?.role;
      const userRoles = meResult.user?.roles || [];
      const roles = userRoles.length > 0 ? userRoles : (userRole ? [userRole] : []);
      
      console.log('👤 User role:', userRole);
      console.log('👤 User roles array:', roles);
      
      if (!roles.includes('superadmin')) {
        console.error('❌ No superadmin role. Roles:', roles);
        return { success: false, error: 'Требуются права суперадмина' };
      }

      console.log('✅ Superadmin confirmed! Redirecting...');

      // Успешный вход
      router.push('/dashboard');
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
      logoText="ЗооАдминка"
      logoAlt="ЗооАдминка"
      subtitle="Войдите в панель администратора"
      infoTitle="🔒 Доступ ограничен"
      infoText="Доступ только для администраторов платформы"
    />
  );
}
