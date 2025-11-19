import { useIdleTimeout } from '../hooks/useIdleTimeout';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { supabase } from '../lib/supabase';
import { QueryProvider } from './providers/QueryProvider';
import { logger } from '../lib/logger';

/**
 * Kullanıcı belirli bir süre işlem yapmazsa otomatik olarak logout yapar
 * 
 * Varsayılan timeout: 30 dakika
 * Aktivite event'leri: mousedown, mousemove, keypress, scroll, touchstart, click, keydown
 */
function IdleTimeoutHandlerContent() {
  const { user } = useCurrentUser();

  // Sadece authenticated kullanıcılar için idle timeout aktif
  const isAuthenticated = !!user;
  const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

  useIdleTimeout({
    timeout: 30 * 60 * 1000, // 30 dakika
    enabled: isAuthenticated && !isLoginPage,
    onIdle: () => {
      logger.debug('[IdleTimeout] Kullanıcı aktivitesi yok, otomatik logout yapılıyor');
      
      // Token'ları temizle
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_role');
      
      // Supabase session'ı temizle
      supabase.auth.signOut().catch(() => {
        // Ignore errors
      });
      
      // Login sayfasına yönlendir
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?message=Oturum%20süresi%20doldu.%20Lütfen%20tekrar%20giriş%20yapın.';
      }
    },
    onActive: () => {
      // Aktivite tespit edildiğinde (opsiyonel - debug için)
      // console.log('[IdleTimeout] Kullanıcı aktivitesi tespit edildi');
    },
  });

  // Component render etmiyor, sadece side effect için
  return null;
}

export default function IdleTimeoutHandler() {
  return (
    <QueryProvider>
      <IdleTimeoutHandlerContent />
    </QueryProvider>
  );
}

