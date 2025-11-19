import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast.js';
import type { ToastProps } from './toast.types.js';

interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const positionClasses = {
  'top-right': 'top-4 right-3 sm:right-4',
  'top-left': 'top-4 left-3 sm:left-4',
  'bottom-right': 'bottom-4 right-3 sm:bottom-6 sm:right-6',
  'bottom-left': 'bottom-4 left-3 sm:bottom-6 sm:left-6',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'bottom-center': 'bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2'
};

export default function ToastContainer({ 
  toasts, 
  position = 'top-right' 
}: ToastContainerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything during SSR or before hydration
  if (!isMounted) {
    return <div style={{ display: 'none' }} />;
  }

  return createPortal(
    <div
      className={`fixed z-50 pointer-events-none ${positionClasses[position]}`}
      aria-live="assertive"
    >
      <div className="flex flex-col space-y-2">
        {toasts.slice(-5).map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>,
    document.body
  );
}