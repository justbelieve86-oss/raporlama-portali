import { useEffect, useRef, useCallback, useMemo } from 'react';

export interface UseIdleTimeoutOptions {
  /**
   * Timeout süresi (milisaniye cinsinden)
   * Varsayılan: 30 dakika (30 * 60 * 1000)
   */
  timeout?: number;
  /**
   * Aktivite event'lerini dinle
   * Varsayılan: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
   */
  events?: string[];
  /**
   * Timeout sonunda çağrılacak callback
   */
  onIdle?: () => void;
  /**
   * Aktivite tespit edildiğinde çağrılacak callback
   */
  onActive?: () => void;
  /**
   * Hook'u aktif/pasif yap
   * Varsayılan: true
   */
  enabled?: boolean;
}

/**
 * Kullanıcı aktivitesini takip eder ve belirli bir süre aktivite olmazsa callback çağırır
 * 
 * @example
 * ```tsx
 * useIdleTimeout({
 *   timeout: 30 * 60 * 1000, // 30 dakika
 *   onIdle: () => {
 *     localStorage.clear();
 *     window.location.href = '/login';
 *   }
 * });
 * ```
 */
export function useIdleTimeout({
  timeout = 30 * 60 * 1000, // 30 dakika varsayılan
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'],
  onIdle,
  onActive,
  enabled = true,
}: UseIdleTimeoutOptions = {}) {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Callback'leri ref'lerde sakla (dependency array sorunlarını önlemek için)
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  
  // Callback'leri güncelle
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
  }, [onIdle, onActive]);

  // Events array'ini memoize et (her render'da yeni referans oluşmasını önle)
  const memoizedEvents = useMemo(() => events, [events.join(',')]);

  const resetTimer = useCallback(() => {
    // Mevcut timer'ı temizle
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    // Son aktivite zamanını güncelle
    lastActivityRef.current = Date.now();

    // onActive callback'ini çağır
    if (onActiveRef.current) {
      onActiveRef.current();
    }

    // Yeni timer başlat
    if (enabled && onIdleRef.current) {
      timeoutIdRef.current = setTimeout(() => {
        if (onIdleRef.current) {
          onIdleRef.current();
        }
      }, timeout);
    }
  }, [timeout, enabled]);

  useEffect(() => {
    if (!enabled || !onIdleRef.current) {
      // Disabled durumunda timer'ı temizle
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      return;
    }

    // İlk timer'ı başlat
    resetTimer();

    // Debounced activity handler (çok fazla event'i önlemek için)
    const handleActivity = () => {
      // Debounce: Son 1 saniye içinde zaten bir aktivite varsa, yeni timer başlatma
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        resetTimer();
      }, 1000); // 1 saniye debounce
    };

    // Visibility change event'i (tab değiştiğinde veya pencere minimize edildiğinde)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab tekrar görünür olduğunda, son aktivite zamanını kontrol et
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= timeout) {
          // Timeout süresi geçmişse, idle callback'ini çağır
          if (onIdleRef.current) {
            onIdleRef.current();
          }
        } else {
          // Henüz timeout olmamışsa, kalan süreyi hesapla ve timer'ı güncelle
          resetTimer();
        }
      }
    };

    // Tüm aktivite event'lerini dinle (throttled)
    memoizedEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      memoizedEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, memoizedEvents, resetTimer, timeout]);

  return {
    /**
     * Timer'ı manuel olarak sıfırla
     */
    reset: resetTimer,
    /**
     * Son aktivite zamanı
     */
    lastActivity: lastActivityRef.current,
  };
}

