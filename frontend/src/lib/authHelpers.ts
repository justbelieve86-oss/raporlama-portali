import { supabase } from './supabase';
import { api } from './axiosClient';
import { logger } from './logger';

let userIdCache: string | null = null;

/**
 * Supabase oturumunu garanti altına alır ve oturum verisini döndürür.
 * localStorage'daki token'ları kullanarak oturum oluşturmayı dener.
 */
export async function ensureSupabaseSession() {
  try {
    // 1. Mevcut oturumu kontrol et
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) {
      userIdCache = sessionData.session.user.id;
      return sessionData.session;
    }

    // 2. localStorage'dan token'larla yeni bir oturum kurmayı dene (SSR güvenli)
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

    if (accessToken && refreshToken) {
      // setSession bazı ortamlarda mevcut olmayabilir (stub)
      const setSessionFn = (supabase as any)?.auth?.setSession;
      if (typeof setSessionFn === 'function') {
        const { data: newSessionData, error } = await setSessionFn({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          logger.error('Supabase setSession hatası', { message: error.message });
          return null;
        }
        
        if (newSessionData?.user?.id) {
          userIdCache = newSessionData.user.id;
        }
        return newSessionData?.session ?? null;
      } else {
        // setSession yoksa sessizce devam et (Bearer header localStorage'dan gönderilecek)
        return null;
      }
    }

    return null;
  } catch (error) {
    logger.error('Supabase oturumu alınırken beklenmedik hata', error);
    return null;
  }
}

/**
 * Backend /api/me endpoint'inden kullanıcı ID'sini alır.
 * Bu, Supabase session senkronizasyon sorunları için bir yedek mekanizmadır.
 */
async function getUserIdFromApi(): Promise<string | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return null;

    const response = await api.get('/me');
    // Backend /api/me bazı yerlerde envelope olmadan dönebiliyor.
    // Her iki formata da uyumlu ol:
    // 1) Envelope: { success, data: { user: { id } } }
    // 2) Düz: { user: { id } }
    const userId = response.data?.data?.user?.id || response.data?.user?.id;

    if (userId) {
      userIdCache = userId;
    }
    
    return userId ?? null;
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    logger.error('/me endpoint hatası', { message: err?.message });
    if (err?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
      }
    }
    return null;
  }
}

/**
 * Geçerli kullanıcı ID'sini güvenilir bir şekilde alır.
 * Önce genel yolları kontrol eder, sonra cache'i, Supabase oturumunu ve son olarak /api/me endpoint'ini dener.
 */
export async function getUserId(): Promise<string | null> {
  // Public yollarda (örn: /login) ID almayı deneme
  if (typeof window !== 'undefined') {
    const publicPaths = ['/login'];
    if (publicPaths.includes(window.location.pathname)) {
      return null;
    }
  }

  if (userIdCache) {
    return userIdCache;
  }

  // 1. Supabase oturumunu dene
  const session = await ensureSupabaseSession();
  if (session?.user?.id) {
    return session.user.id;
  }

  // 2. /api/me endpoint'ine fallback yap
  logger.warn("Supabase oturumu bulunamadı, /api/me endpoint'ine fallback yapılıyor");
  const userId = await getUserIdFromApi();
  
  return userId;
}