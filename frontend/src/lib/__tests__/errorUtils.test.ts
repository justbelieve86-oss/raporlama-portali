import { describe, it, expect } from 'vitest';
import { toUserFriendlyError } from '../errorUtils';
import axios from 'axios';

describe('errorUtils', () => {
  describe('toUserFriendlyError', () => {
    it('should handle AxiosError with status 400', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Invalid request' },
        },
        code: 'ERR_BAD_REQUEST',
      };
      const result = toUserFriendlyError(error as any);
      expect(result.title).toBe('İşlem gerçekleştirilemedi');
      expect(result.message).toBe('Invalid request');
      expect(result.status).toBe(400);
      expect(result.code).toBe('ERR_BAD_REQUEST');
    });

    it('should handle AxiosError with status 401', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
        },
      };
      const result = toUserFriendlyError(error as any);
      expect(result.title).toBe('İşlem gerçekleştirilemedi');
      expect(result.message).toBe('Oturumunuz geçersiz veya süresi dolmuş. Lütfen yeniden giriş yapın.');
      expect(result.status).toBe(401);
    });

    it('should handle AxiosError with status 403', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 403,
        },
      };
      const result = toUserFriendlyError(error as any);
      expect(result.message).toBe('Bu işlem için yetkiniz yok. Gerekirse yönetici ile iletişime geçin.');
    });

    it('should handle AxiosError with status 404', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 404,
        },
      };
      const result = toUserFriendlyError(error as any);
      expect(result.message).toBe('Aradığınız kaynak bulunamadı.');
    });

    it('should handle AxiosError with status 429', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
        },
      };
      const result = toUserFriendlyError(error as any);
      expect(result.message).toBe('Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.');
    });

    it('should handle AxiosError with status 500', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 500,
        },
      };
      const result = toUserFriendlyError(error as any);
      expect(result.message).toBe('Sunucuda bir problem oluştu. Biraz sonra tekrar deneyin.');
    });

    it('should handle AxiosError with error field', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Custom error message' },
        },
      };
      const result = toUserFriendlyError(error as any);
      expect(result.message).toBe('Custom error message');
    });

    it('should handle RLS violation error', () => {
      const error = new Error('row-level security policy violation');
      const result = toUserFriendlyError(error);
      expect(result.title).toBe('Yetki Hatası');
      expect(result.code).toBe('RLS_VIOLATION');
      expect(result.message).toContain('satır düzeyi güvenlik');
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const result = toUserFriendlyError(error);
      expect(result.title).toBe('İşlem sırasında hata');
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle string error', () => {
      const result = toUserFriendlyError('String error');
      expect(result.title).toBe('İşlem sırasında hata');
      expect(result.message).toBe('String error');
    });

    it('should handle unknown error', () => {
      const result = toUserFriendlyError({});
      expect(result.title).toBe('İşlem sırasında hata');
      expect(result.message).toBe('[object Object]');
    });

    it('should handle null error', () => {
      const result = toUserFriendlyError(null);
      expect(result.title).toBe('İşlem sırasında hata');
      // String(null) returns "null"
      expect(result.message).toBe('null');
    });

    it('should handle undefined error', () => {
      const result = toUserFriendlyError(undefined);
      expect(result.title).toBe('İşlem sırasında hata');
      // String(undefined) returns "undefined"
      expect(result.message).toBe('undefined');
    });
  });
});

