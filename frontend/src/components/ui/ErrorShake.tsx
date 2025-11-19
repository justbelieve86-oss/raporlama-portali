import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface ErrorShakeProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

/**
 * Error Shake Component
 * Shake animation for error states
 */
export function ErrorShake({ children, trigger = false, className }: ErrorShakeProps) {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div
      className={clsx(
        'transition-all duration-300',
        isShaking && 'animate-shake',
        className
      )}
    >
      {children}
    </div>
  );
}


