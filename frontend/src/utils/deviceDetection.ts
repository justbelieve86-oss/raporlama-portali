/**
 * Device detection utilities for mobile/tablet/desktop
 */

/**
 * Check if the device is mobile (phone)
 * @returns true if device is mobile (screen width < 640px or user agent indicates mobile)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check screen width first (most reliable)
  if (window.innerWidth < 640) {
    return true;
  }
  
  // Check user agent as fallback
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Check if the device is tablet
 * @returns true if device is tablet (screen width 640px - 1023px or user agent indicates tablet)
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const width = window.innerWidth;
  if (width >= 640 && width < 1024) {
    return true;
  }
  
  // Check user agent for tablet
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
  return tabletRegex.test(userAgent);
}

/**
 * Check if the device is mobile or tablet
 * @returns true if device is mobile or tablet
 */
export function isMobileOrTablet(): boolean {
  return isMobileDevice() || isTabletDevice();
}

/**
 * Check if the device is desktop
 * @returns true if device is desktop
 */
export function isDesktopDevice(): boolean {
  return !isMobileOrTablet();
}

/**
 * Get device type
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
}

