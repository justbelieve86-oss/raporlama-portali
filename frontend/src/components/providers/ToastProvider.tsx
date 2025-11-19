import React, { createContext, useContext, ReactNode } from 'react';
import { useToast, UseToastReturn } from '../../hooks/useToast';
import ToastContainer from '../ui/ToastContainer';

const ToastContext = createContext<UseToastReturn | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastProvider({ children, position = 'top-right' }: ToastProviderProps) {
  const toastMethods = useToast();

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      <ToastContainer toasts={toastMethods.toasts} position={position} />
    </ToastContext.Provider>
  );
}

export function useToastContext(): UseToastReturn {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}