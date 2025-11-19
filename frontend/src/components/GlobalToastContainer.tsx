import React from 'react';
import { useGlobalToast } from '../hooks/useToast';
import ToastContainer from './ui/ToastContainer';

interface GlobalToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export default function GlobalToastContainer({ 
  position = 'bottom-right' 
}: GlobalToastContainerProps) {
  const { toasts } = useGlobalToast();

  return <ToastContainer toasts={toasts} position={position} />;
}