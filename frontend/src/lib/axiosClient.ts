import axios from 'axios';
import { supabase } from './supabase';
import { toUserFriendlyError } from './errorUtils';
import { logger } from './logger';

// import.meta.env tipi ortamda mevcut değilse güvenli bir şekilde okunur
interface ImportMetaWithEnv {
  env?: {
    PUBLIC_API_URL?: string;
  };
}

const baseURL =
  (typeof import.meta !== 'undefined' && (import.meta as ImportMetaWithEnv).env?.PUBLIC_API_URL) ||
  (typeof process !== 'undefined' && process.env?.PUBLIC_API_URL) ||
  'http://localhost:4000/api';

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

// Authorization header'ını otomatik ekle (önce localStorage, sonra Supabase session)
api.interceptors.request.use(async (config) => {
  try {
    let token: string | null = null;

    // 1) Öncelik: localStorage token (login sonrası garantili)
    if (typeof window !== 'undefined') {
      const localToken = localStorage.getItem('access_token');
      if (localToken) token = localToken;
    }

    // 2) Fallback: Supabase session (varsa)
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;
        logger.debug('Supabase session checked for token:', { hasSession: !!data.session, hasToken: !!token });
      } catch (sessionErr) {
        logger.warn('Supabase session lookup failed:', sessionErr);
      }
    }

    if (token) {
      const authValue = `Bearer ${token}`;
      const headers = config.headers;
      if (headers && 'set' in headers && typeof headers.set === 'function') {
        headers.set('Authorization', authValue);
      } else {
        config.headers = {
          ...(config.headers || {}),
          Authorization: authValue,
        };
      }
    } else {
      logger.warn('No auth token available; request sent without Authorization');
    }
  } catch (error) {
    logger.error('Error preparing auth header:', error);
  }
  return config;
});

// Global error handling interceptor - moved here to avoid circular imports
interface ToastModule {
  toast?: {
    success: (opts?: { title?: string; message?: string; duration?: number; action?: { label: string; onClick: () => void } }) => void;
    error: (opts?: { title?: string; message?: string; duration?: number; action?: { label: string; onClick: () => void } }) => void;
    warning: (opts?: { title?: string; message?: string; duration?: number }) => void;
    info: (opts?: { title?: string; message?: string; duration?: number }) => void;
    clearToasts: () => void;
  };
}

let toastModule: ToastModule | null = null;

// Provide a safe noop toast in case dynamic import fails during navigation/HMR
const noopToast = {
  success: (_opts?: { title?: string; message?: string; duration?: number; action?: { label: string; onClick: () => void } }) => {},
  error: (_opts?: { title?: string; message?: string; duration?: number; action?: { label: string; onClick: () => void } }) => {},
  warning: (_opts?: { title?: string; message?: string; duration?: number }) => {},
  info: (_opts?: { title?: string; message?: string; duration?: number }) => {},
  clearToasts: () => {},
};

// Lazy load toast to avoid circular dependencies
const getToast = async () => {
  if (!toastModule) {
    try {
      toastModule = await import('../hooks/useToast') as ToastModule;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      logger.warn('Toast module load aborted or failed', { error: errorMessage });
      return noopToast;
    }
  }
  return (toastModule && toastModule.toast) ? toastModule.toast : noopToast;
};

// Helper function to determine if error toast should be suppressed
function shouldSuppressErrorToast(error: { config?: { url?: string } }): boolean {
  // Don't show toast for login page errors
  if (typeof window !== 'undefined' && window.location.pathname === '/login') {
    return true;
  }
  
  // Don't show toast for specific API endpoints that handle their own errors
  const suppressedEndpoints = ['/auth/login', '/auth/register'];
  const requestUrl = error.config?.url || '';
  
  return suppressedEndpoints.some(endpoint => requestUrl.includes(endpoint));
}

// Global response interceptor for error handling
api.interceptors.response.use(
  async (response) => {
    // Success response - check if there's a success message to show
    try {
      // Certain background actions shouldn't surface success toasts
      const suppressSuccessToast = (() => {
        try {
          const url = String(response?.config?.url || '');
          const method = String(response?.config?.method || '').toLowerCase();
          // Do not show success toast for KPI ordering initialization checks
          // These run in the background during page load and are noisy.
          if (method === 'post' && url.includes('/kpi-ordering') && url.includes('/initialize')) {
            return true;
          }
          return false;
        } catch {
          return false;
        }
      })();

      if (response.data?.message && response.config.method !== 'get' && !suppressSuccessToast) {
        const toast = await getToast();
        if (toast && typeof toast.success === 'function') {
          toast.success({ title: response.data.message });
        }
      }
    } catch (e) {
      // Swallow toast display errors; never block the response
      logger.debug('Toast display skipped due to error:', e);
    }
    return response;
  },
  async (error) => {
    // Handle different types of errors
    const friendlyError = toUserFriendlyError(error);
    
    // Don't show toast for certain status codes or specific routes
    const shouldShowToast = !shouldSuppressErrorToast(error);
    
    if (shouldShowToast) {
      try {
        const toast = await getToast();
        if (toast && typeof toast.error === 'function') {
          const extra = [
            typeof friendlyError.status === 'number' ? `Durum: ${friendlyError.status}` : null,
            friendlyError.code ? `Kod: ${friendlyError.code}` : null,
          ].filter(Boolean).join(' | ');

          const message = extra ? `${friendlyError.message} (${extra})` : friendlyError.message;

          // Hata detaylarını kolayca kopyalayabilmek için action ekleyelim
          const details = (() => {
            try {
              const body = error?.response?.data ?? {};
              const text = typeof body === 'string' ? body : JSON.stringify(body);
              return [
                `URL: ${error?.config?.url ?? ''}`,
                `Method: ${error?.config?.method ?? ''}`,
                `Status: ${error?.response?.status ?? ''}`,
                `Message: ${error?.message ?? ''}`,
                `Body: ${text}`,
              ].join('\n');
            } catch {
              return String(error);
            }
          })();

          toast.error({ 
            title: friendlyError.title,
            message,
            duration: 8000,
            action: {
              label: 'Detayı kopyala',
              onClick: () => {
                try {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    void navigator.clipboard.writeText(details);
                  }
                } catch (e) {
                  logger.debug('axiosClient: copy details failed', e);
                }
              }
            }
          });
        }
      } catch (e) {
        // Ignore toast errors, proceed with normal error handling
        logger.debug('Toast error suppressed:', e);
      }
    }
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      // /me endpoint'i için 401 hatasını lokal olarak ele al, global yönlendirme yapma
      if (requestUrl.includes('/me')) {
        return Promise.reject(error);
      }

      // Tek seferlik otomatik refresh ve retry denemesi
      interface RetryableRequest {
        __retry?: boolean;
        headers?: Record<string, string>;
        url?: string;
        method?: string;
      }
      const originalRequest = (error.config || {}) as RetryableRequest;
      if (!originalRequest.__retry) {
        originalRequest.__retry = true;
        try {
          // Mevcut session'ı al ve refresh dene
          const { data: s } = await supabase.auth.getSession();
          const refreshToken = s?.session?.refresh_token || (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);

          let refreshed: { data: { session: { access_token: string; refresh_token?: string } } | null; error: unknown } | null = null;
          try {
            if (refreshToken) {
              refreshed = await supabase.auth.refreshSession({ refresh_token: refreshToken });
            } else {
              refreshed = await supabase.auth.refreshSession();
            }
          } catch (e) {
            refreshed = { data: null, error: e };
          }

          const newSession = refreshed?.data?.session;
          if (newSession?.access_token) {
            // Yeni tokenları kaydet ve isteği tekrar dene
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('access_token', newSession.access_token);
                if (newSession.refresh_token) localStorage.setItem('refresh_token', newSession.refresh_token);
              } catch {}
            }
            // Authorization header'ını güncelle ve tekrar dene
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${newSession.access_token}`
            };
            return api.request(originalRequest);
          }
        } catch (refreshErr) {
          logger.debug('Token refresh failed', { error: refreshErr });
        }
      }

      // Refresh başarısızsa login sayfasına yönlendir
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);