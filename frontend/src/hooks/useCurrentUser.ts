import { useQuery } from '@tanstack/react-query';
import { getMe } from '../services/api';
import { supabase } from '../lib/supabase';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useEffect } from 'react';

export interface UserInfo extends Partial<User> {
  username: string;
  full_name: string | undefined;
  avatar_url: string | undefined;
  role: string;
}

// TanStack Query ile optimize edilmiş useCurrentUser
export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return null;
      }

      try {
        const { user, role } = await getMe();
        
        if (!user) {
          return null;
        }

        const userInfo: UserInfo = {
          id: user.id,
          email: user.email || '',
          username: user.user_metadata?.username || user.email?.split('@')[0],
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          role: role,
        };

        return userInfo;
      } catch (err: unknown) {
        // 401 hatası durumunda token'ları temizle
        const error = err as { response?: { status?: number }; message?: string };
        if (error?.response?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_role');
          
          // Login sayfasına yönlendir (sadece login sayfasında değilsek ve root path'te değilsek)
          // Root path'te AuthGuard zaten yönlendirme yapacak
          if (typeof window !== 'undefined' && 
              window.location.pathname !== '/login' && 
              window.location.pathname !== '/' &&
              window.location.pathname !== '/index.html') {
            window.location.href = '/login';
          }
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 10 * 60 * 1000, // 10 dakika
    retry: 1,
    retryDelay: 1000,
    // Token yoksa query'yi çalıştırma
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('access_token'),
  });

  // Supabase auth state change listener - query'yi invalidate et
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        // Auth state değiştiğinde query'yi refetch et
        query.refetch();
      } else {
        // Logout durumunda query'yi invalidate et
        query.refetch();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [query]);

  // Error handling - session timeout durumunda login sayfasına yönlendir
  useEffect(() => {
    if (query.error) {
      const errorMessage = (query.error as Error)?.message || '';
      const isSessionError = errorMessage.includes('Kullanıcı bilgileri alınamadı') || 
                             errorMessage.includes('Mevcut kullanıcı alınamadı') ||
                             errorMessage.includes('401') ||
                             errorMessage.includes('Unauthorized');
      
      // Root path'te AuthGuard zaten yönlendirme yapacak, burada yönlendirme yapma
      if (isSessionError && typeof window !== 'undefined' && 
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/' &&
          window.location.pathname !== '/index.html') {
        // Token'ları temizle
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        
        // Login sayfasına yönlendir
        window.location.href = '/login';
      }
    }
  }, [query.error]);

  return {
    user: query.data || null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error)?.message || 'Kullanıcı bilgileri alınamadı' : null,
  };
}

export default useCurrentUser;

