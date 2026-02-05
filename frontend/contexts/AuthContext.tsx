'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, authApi, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем авторизацию при загрузке (только на клиенте)
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const checkAuth = async () => {
      try {
        // Проверяем есть ли токен в localStorage
        const storedToken = localStorage.getItem('auth_token');
        if (!storedToken) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // Простой запрос к Auth Service
        const response = await authApi.me();
        
        if (mounted && response.success) {
          // Gateway возвращает {success: true, user: {...}}
          // Main Service возвращает {success: true, data: {user: {...}, token: ...}}
          let userData = null;
          
          // Сначала проверяем data.user (Main Service)
          if ((response as any).data?.user) {
            userData = (response as any).data.user;
          }
          // Затем проверяем прямо user (Gateway)
          else if ((response as any).user) {
            userData = (response as any).user;
          }
          // Fallback на data (если это сам объект пользователя)
          else if ((response as any).data?.id) {
            userData = (response as any).data;
          }
          
          if (userData && userData.id) {
            setUser(userData);
            setToken(storedToken);
          } else {
            // Нет данных пользователя - удаляем токен
            localStorage.removeItem('auth_token');
          }
        } else {
          // Токен невалидный - удаляем
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    
    if (response.success && response.data) {
      const responseData = response.data as any;
      const user = responseData.user;
      const token = responseData.token;
      
      // Сохраняем токен в localStorage (если Gateway вернул)
      if (token) {
        localStorage.setItem('auth_token', token);
        setToken(token);
        
        // ✅ Сохраняем токен в cookie для WebSocket (Gateway читает из cookie)
        // Токен живет 30 дней (как в Gateway)
        const maxAge = 30 * 24 * 60 * 60; // 30 дней в секундах
        document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
      } else {
        // Gateway использует cookie, токена в ответе нет
        // Устанавливаем флаг что пользователь авторизован
        setToken('authenticated');
      }
      
      setUser(user);
      return { success: true };
    }

    console.error('❌ Login failed:', { success: response.success, error: response.error });
    return { success: false, error: response.error };
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authApi.register(name, email, password);
    
    if (response.success && response.data) {
      const responseData = response.data as any;
      const user = responseData.user;
      const token = responseData.token;
      
      // Сохраняем токен в localStorage
      if (token) {
        localStorage.setItem('auth_token', token);
        
        // ✅ Сохраняем токен в cookie для WebSocket
        const maxAge = 30 * 24 * 60 * 60; // 30 дней в секундах
        document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
      }
      
      setToken(token || 'authenticated');
      setUser(user);
      return { success: true };
    }

    return { success: false, error: response.error };
  };

  const logout = async () => {
    await authApi.logout();
    // Удаляем токен из localStorage
    localStorage.removeItem('auth_token');
    
    // ✅ Удаляем cookie
    document.cookie = 'auth_token=; path=/; max-age=0';
    
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const authResponse = await authApi.me();
      
      if (authResponse.success) {
        // Gateway возвращает {success: true, user: {...}}
        // Main Service возвращает {success: true, data: {user: {...}, token: ...}}
        let userData = null;
        
        // Сначала проверяем data.user (Main Service)
        if ((authResponse as any).data?.user) {
          userData = (authResponse as any).data.user;
        }
        // Затем проверяем прямо user (Gateway)
        else if ((authResponse as any).user) {
          userData = (authResponse as any).user;
        }
        // Fallback на data (если это сам объект пользователя)
        else if ((authResponse as any).data?.id) {
          userData = (authResponse as any).data;
        }
        
        if (userData && userData.id) {
          setUser(userData);
        } else {
          console.error('❌ No valid user data found in response');
        }
      }
    } catch (error) {
      console.error('User refresh failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
