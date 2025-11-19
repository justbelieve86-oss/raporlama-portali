import { useEffect } from 'react';
import { isMobileDevice } from '../utils/deviceDetection';

export default function MobileRedirectToDailyKpi() {
  useEffect(() => {
    if (typeof window !== 'undefined' && isMobileDevice()) {
      // Mobil cihazda /user/overview/daily-kpi-dashboard'a gelinirse mobil versiyona yönlendir
      if (window.location.pathname === '/user/overview/daily-kpi-dashboard') {
        window.location.href = '/user/mobile/daily-kpi';
      }
    }
  }, []);

  return null; // Bu bileşen UI render etmez, sadece yönlendirme yapar
}

