import { useEffect } from 'react';
import { isMobileDevice } from '../utils/deviceDetection';

/**
 * Mobil cihazlarda otomatik olarak mobil sayfaya yönlendirir
 */
export default function MobileRedirect() {
  useEffect(() => {
    if (isMobileDevice() && window.location.pathname === '/user') {
      window.location.href = '/user/mobile';
    }
  }, []);

  return null;
}

