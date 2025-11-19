import { toast } from '../hooks/useToast';

// Utility functions for common toast scenarios
export const showSuccessToast = (title: string, message?: string) => {
  return toast.success({ title, message });
};

export const showErrorToast = (title: string, message?: string) => {
  return toast.error({ title, message });
};

export const showWarningToast = (title: string, message?: string) => {
  return toast.warning({ title, message });
};

export const showInfoToast = (title: string, message?: string) => {
  return toast.info({ title, message });
};

// API response toast helpers
export const showApiSuccessToast = (action: string) => {
  return toast.success({
    title: 'Başarılı',
    message: `${action} işlemi başarıyla tamamlandı.`
  });
};

export const showApiErrorToast = (action: string, error?: string) => {
  return toast.error({
    title: 'Hata',
    message: error || `${action} işlemi sırasında bir hata oluştu.`
  });
};

// Form validation toast helpers
export const showValidationErrorToast = (message: string = 'Lütfen form alanlarını kontrol edin.') => {
  return toast.error({
    title: 'Doğrulama Hatası',
    message
  });
};

// Network error toast helpers
export const showNetworkErrorToast = () => {
  return toast.error({
    title: 'Bağlantı Hatası',
    message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
  });
};

// Permission error toast helpers
export const showPermissionErrorToast = () => {
  return toast.error({
    title: 'Yetki Hatası',
    message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.'
  });
};

// Loading toast helpers (for long operations)
export const showLoadingToast = (message: string) => {
  return toast.info({
    title: 'Yükleniyor...',
    message,
    duration: 0 // Don't auto-dismiss
  });
};

export const updateLoadingToast = (id: string, success: boolean, message: string) => {
  toast.removeToast(id);
  if (success) {
    return toast.success({
      title: 'Tamamlandı',
      message
    });
  } else {
    return toast.error({
      title: 'Hata',
      message
    });
  }
};