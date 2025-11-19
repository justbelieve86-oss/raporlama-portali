import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

export type TransitionType = 'fade' | 'slide' | 'scale';

export interface PageTransitionProps {
  children: React.ReactNode;
  type?: TransitionType;
  duration?: number;
  className?: string;
}

/**
 * Page Transition Component
 * Smooth page transitions for route changes
 */
export function PageTransition({
  children,
  type = 'fade',
  duration = 300,
  className,
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const transitionClasses = {
    fade: clsx(
      'transition-opacity',
      isVisible ? 'opacity-100' : 'opacity-0'
    ),
    slide: clsx(
      'transition-all',
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
    ),
    scale: clsx(
      'transition-all',
      isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
    ),
  };

  return (
    <div
      className={clsx(
        transitionClasses[type],
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}


