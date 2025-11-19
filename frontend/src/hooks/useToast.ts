import { useState, useCallback, useEffect } from 'react';
import type { ToastProps, ToastType } from '../components/ui/toast.types.js';

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseToastReturn {
  toasts: ToastProps[];
  addToast: (type: ToastType, options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (options: ToastOptions) => string;
  error: (options: ToastOptions) => string;
  warning: (options: ToastOptions) => string;
  info: (options: ToastOptions) => string;
}

let toastId = 0;

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const generateId = () => `toast-${++toastId}`;

  const addToast = useCallback((type: ToastType, options: ToastOptions): string => {
    const id = generateId();
    const toast: ToastProps = {
      id,
      type,
      ...options,
      onClose: (toastId: string) => removeToast(toastId)
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback((options: ToastOptions) => {
    return addToast('success', options);
  }, [addToast]);

  const error = useCallback((options: ToastOptions) => {
    return addToast('error', options);
  }, [addToast]);

  const warning = useCallback((options: ToastOptions) => {
    return addToast('warning', options);
  }, [addToast]);

  const info = useCallback((options: ToastOptions) => {
    return addToast('info', options);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };
}

// Global toast instance for use outside of React components
class ToastManager {
  private listeners: Set<(toasts: ToastProps[]) => void> = new Set();
  private toasts: ToastProps[] = [];
  private toastId = 0;

  subscribe(listener: (toasts: ToastProps[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  private generateId() {
    return `global-toast-${++this.toastId}`;
  }

  addToast(type: ToastType, options: ToastOptions): string {
    const id = this.generateId();
    const toast: ToastProps = {
      id,
      type,
      ...options,
      onClose: (toastId: string) => this.removeToast(toastId)
    };

    this.toasts.push(toast);
    this.notify();
    return id;
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  clearToasts() {
    this.toasts = [];
    this.notify();
  }

  success(options: ToastOptions) {
    return this.addToast('success', options);
  }

  error(options: ToastOptions) {
    return this.addToast('error', options);
  }

  warning(options: ToastOptions) {
    return this.addToast('warning', options);
  }

  info(options: ToastOptions) {
    return this.addToast('info', options);
  }
}

export const toast = new ToastManager();

// Hook to use global toast manager
export function useGlobalToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    toasts,
    success: toast.success.bind(toast),
    error: toast.error.bind(toast),
    warning: toast.warning.bind(toast),
    info: toast.info.bind(toast),
    clearToasts: toast.clearToasts.bind(toast)
  };
}