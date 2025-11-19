import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/axiosClient';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError, type FriendlyError } from '../lib/errorUtils';
import { isMobileDevice } from '../utils/deviceDetection';
import { logger } from '../lib/logger';

export default function AuthGuard() {
  const [_loading] = useState(true);
  const [error, setError] = useState<FriendlyError | null>(null);

  useEffect(() => {
    let isMounted = true;
    let redirectTimeout: ReturnType<typeof setTimeout> | null = null;

    const redirectToLogin = () => {
      if (!isMounted) return;
      // Eğer zaten login sayfasındaysak yönlendirme yapma
      if (window.location.pathname === '/login') return;
      
      // Tek seferlik yönlendirme için flag kullan
      const hasRedirectedToLogin = sessionStorage.getItem('auth_redirected_to_login');
      if (hasRedirectedToLogin) {
        return; // Zaten yönlendirme yapıldı, tekrar yapma
      }
      
      sessionStorage.setItem('auth_redirected_to_login', 'true');
      redirectTimeout = setTimeout(() => {
        if (isMounted && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 1000);
    };

    const checkAuthAndRedirect = async () => {
      try {
        // Mevcut path'i kontrol et - eğer zaten doğru sayfadaysak yönlendirme yapma
        const currentPath = window.location.pathname;
        
        // Supabase session kontrolü
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          // Giriş yapmamış - sadece login sayfasında değilsek yönlendir
          if (currentPath !== '/login') {
            redirectToLogin();
          }
          return;
        }

        // Giriş yapmış - backend'den rol bilgisini al
        try {
          const response = await api.get('/me');
          const { role } = response.data;
          
          // Mevcut path'e göre yönlendirme yapma
          const targetPath = role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : (isMobileDevice() ? '/user/mobile' : '/user');
          
          // Eğer zaten doğru sayfadaysak yönlendirme yapma
          if (currentPath === targetPath || currentPath.startsWith(targetPath + '/')) {
            return; // Zaten doğru sayfadayız, yönlendirme yapma
          }
          
          // Sadece root path'teysek yönlendir (başka sayfalarda yönlendirme yapma)
          if (currentPath === '/' || currentPath === '/index.html') {
            // Tek seferlik yönlendirme için flag kullan
            const hasRedirected = sessionStorage.getItem('auth_redirected');
            if (!hasRedirected) {
              sessionStorage.setItem('auth_redirected', 'true');
              window.location.href = targetPath;
            }
          }
        } catch (apiError: unknown) {
          // API hatası - muhtemelen token geçersiz
          logger.error('API error in AuthGuard', apiError);
          
          // Token'ları temizle
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_role');
          sessionStorage.removeItem('auth_redirected');
          
          // Sadece login sayfasında değilsek yönlendir
          if (currentPath !== '/login') {
            redirectToLogin();
          }
        }
      } catch (error) {
        logger.error('Error in AuthGuard', error);
        setError(toUserFriendlyError(error));
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          redirectToLogin();
        }
      }
    };

    checkAuthAndRedirect();
    
    return () => {
      isMounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <ErrorAlert
            title="Kimlik doğrulama hatası"
            message={error.message}
            details={(error.status ? `Durum: ${error.status}` : '') || undefined}
          />
          <div className="mt-2 text-center text-sm text-gray-500">Login sayfasına yönlendiriliyorsunuz...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <div className="text-gray-700 text-lg mb-2">Yönlendiriliyor...</div>
        <div className="text-sm text-gray-500">Kimlik doğrulaması kontrol ediliyor</div>
      </div>
    </div>
  );
}