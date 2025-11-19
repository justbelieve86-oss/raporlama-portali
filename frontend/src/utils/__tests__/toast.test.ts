import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the toast singleton - must be defined inside vi.mock factory
vi.mock('../../hooks/useToast', async () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    removeToast: vi.fn(),
  };
  
  const actual = await vi.importActual('../../hooks/useToast');
  return {
    ...actual,
    toast: mockToast,
  };
});

// Import after mock
import * as toastUtils from '../toast';
import { toast } from '../../hooks/useToast';

describe('toast utilities', () => {
  const mockToast = toast as {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    removeToast: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showSuccessToast', () => {
    it('should call toast.success with title', () => {
      toastUtils.showSuccessToast('Success title');
      expect(mockToast.success).toHaveBeenCalledWith({
        title: 'Success title',
        message: undefined,
      });
    });

    it('should call toast.success with title and message', () => {
      toastUtils.showSuccessToast('Success title', 'Success message');
      expect(mockToast.success).toHaveBeenCalledWith({
        title: 'Success title',
        message: 'Success message',
      });
    });
  });

  describe('showErrorToast', () => {
    it('should call toast.error with title', () => {
      toastUtils.showErrorToast('Error title');
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error title',
        message: undefined,
      });
    });

    it('should call toast.error with title and message', () => {
      toastUtils.showErrorToast('Error title', 'Error message');
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error title',
        message: 'Error message',
      });
    });
  });

  describe('showWarningToast', () => {
    it('should call toast.warning with title', () => {
      toastUtils.showWarningToast('Warning title');
      expect(mockToast.warning).toHaveBeenCalledWith({
        title: 'Warning title',
        message: undefined,
      });
    });

    it('should call toast.warning with title and message', () => {
      toastUtils.showWarningToast('Warning title', 'Warning message');
      expect(mockToast.warning).toHaveBeenCalledWith({
        title: 'Warning title',
        message: 'Warning message',
      });
    });
  });

  describe('showInfoToast', () => {
    it('should call toast.info with title', () => {
      toastUtils.showInfoToast('Info title');
      expect(mockToast.info).toHaveBeenCalledWith({
        title: 'Info title',
        message: undefined,
      });
    });

    it('should call toast.info with title and message', () => {
      toastUtils.showInfoToast('Info title', 'Info message');
      expect(mockToast.info).toHaveBeenCalledWith({
        title: 'Info title',
        message: 'Info message',
      });
    });
  });

  describe('showApiSuccessToast', () => {
    it('should show success toast for API action', () => {
      toastUtils.showApiSuccessToast('Kullanıcı oluşturma');
      expect(mockToast.success).toHaveBeenCalledWith({
        title: 'Başarılı',
        message: 'Kullanıcı oluşturma işlemi başarıyla tamamlandı.',
      });
    });
  });

  describe('showApiErrorToast', () => {
    it('should show error toast with default message', () => {
      toastUtils.showApiErrorToast('Kullanıcı oluşturma');
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Hata',
        message: 'Kullanıcı oluşturma işlemi sırasında bir hata oluştu.',
      });
    });

    it('should show error toast with custom error message', () => {
      toastUtils.showApiErrorToast('Kullanıcı oluşturma', 'Email zaten kullanılıyor');
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Hata',
        message: 'Email zaten kullanılıyor',
      });
    });
  });

  describe('showValidationErrorToast', () => {
    it('should show validation error with default message', () => {
      toastUtils.showValidationErrorToast();
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Doğrulama Hatası',
        message: 'Lütfen form alanlarını kontrol edin.',
      });
    });

    it('should show validation error with custom message', () => {
      toastUtils.showValidationErrorToast('Email formatı geçersiz');
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Doğrulama Hatası',
        message: 'Email formatı geçersiz',
      });
    });
  });

  describe('showNetworkErrorToast', () => {
    it('should show network error toast', () => {
      toastUtils.showNetworkErrorToast();
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Bağlantı Hatası',
        message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
      });
    });
  });

  describe('showPermissionErrorToast', () => {
    it('should show permission error toast', () => {
      toastUtils.showPermissionErrorToast();
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Yetki Hatası',
        message: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.',
      });
    });
  });

  describe('showLoadingToast', () => {
    it('should show loading toast with message', () => {
      toastUtils.showLoadingToast('Veriler yükleniyor...');
      expect(mockToast.info).toHaveBeenCalledWith({
        title: 'Yükleniyor...',
        message: 'Veriler yükleniyor...',
        duration: 0,
      });
    });
  });

  describe('updateLoadingToast', () => {
    it('should remove toast and show success', () => {
      toastUtils.updateLoadingToast('toast-id', true, 'İşlem tamamlandı');
      expect(mockToast.removeToast).toHaveBeenCalledWith('toast-id');
      expect(mockToast.success).toHaveBeenCalledWith({
        title: 'Tamamlandı',
        message: 'İşlem tamamlandı',
      });
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('should remove toast and show error', () => {
      toastUtils.updateLoadingToast('toast-id', false, 'İşlem başarısız');
      expect(mockToast.removeToast).toHaveBeenCalledWith('toast-id');
      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Hata',
        message: 'İşlem başarısız',
      });
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });
});

