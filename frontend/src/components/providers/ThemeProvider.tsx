import React, { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';

/**
 * ThemeProvider - Applies theme to document root
 * This component should be used at the root level to ensure theme is applied
 * Note: The theme is also applied via inline script in AppLayout.astro to prevent FOUC
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    
    // Apply theme class immediately
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Update meta theme-color for mobile browsers
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
        metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#1e1f27' : '#ffffff'); // Shark for dark mode
    
    // Force a reflow to ensure styles are applied
    root.offsetHeight;
  }, [resolvedTheme]);

  return <>{children}</>;
}
