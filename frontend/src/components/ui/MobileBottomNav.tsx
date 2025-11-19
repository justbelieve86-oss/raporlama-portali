import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface BottomNavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number | string;
  onClick?: () => void;
}

export interface MobileBottomNavProps {
  items: BottomNavItem[];
  className?: string;
}

/**
 * Mobile Bottom Navigation Component
 * Fixed bottom navigation bar for mobile devices
 */
export function MobileBottomNav({ items, className }: MobileBottomNavProps) {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    // Get current pathname
    setCurrentPath(window.location.pathname);
  }, []);

  const handleClick = (item: BottomNavItem) => {
    if (item.onClick) {
      item.onClick();
    } else {
      window.location.href = item.path;
    }
  };

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white border-t border-gray-200',
        'safe-area-inset-bottom', // iOS safe area support
        'shadow-lg',
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {items.map((item, index) => {
          const isActive = currentPath === item.path;
          
          return (
            <button
              key={index}
              onClick={() => handleClick(item)}
              className={clsx(
                'flex flex-col items-center justify-center',
                'py-2 px-1 rounded-lg',
                'transition-all duration-200',
                'touch-manipulation',
                'min-h-[44px]', // iOS touch target
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
              )}
              aria-label={item.label}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span
                    className={clsx(
                      'absolute -top-1 -right-1',
                      'min-w-[18px] h-[18px]',
                      'flex items-center justify-center',
                      'text-[10px] font-bold text-white',
                      'bg-error-500 rounded-full',
                      'px-1'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium mt-1',
                  isActive ? 'text-primary-600' : 'text-gray-600'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

