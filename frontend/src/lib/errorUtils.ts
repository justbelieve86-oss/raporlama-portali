import axios, { AxiosError } from 'axios';

export type FriendlyError = {
  title: string;
  message: string;
  status?: number;
  code?: string;
};

function statusToMessage(status?: number) {
  switch (status) {
    case 400:
      return 'İstek geçersiz görünüyor. Lütfen bilgileri kontrol edin.';
    case 401:
      return 'Oturumunuz geçersiz veya süresi dolmuş. Lütfen yeniden giriş yapın.';
    case 403:
      return 'Bu işlem için yetkiniz yok. Gerekirse yönetici ile iletişime geçin.';
    case 404:
      return 'Aradığınız kaynak bulunamadı.';
    case 429:
      return 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.';
    case 500:
      return 'Sunucuda bir problem oluştu. Biraz sonra tekrar deneyin.';
    default:
      return 'Beklenmeyen bir hata oluştu.';
  }
}

export function toUserFriendlyError(err: unknown): FriendlyError {
  // Axios hatası
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>;
    const status = ax.response?.status;
    const backendMsg = ax.response?.data?.message || ax.response?.data?.error;
    const msg = backendMsg || statusToMessage(status);
    return {
      title: 'İşlem gerçekleştirilemedi',
      message: msg,
      status,
      code: ax.code,
    };
  }

  // Fetch veya genel hata
  const anyErr = err as any;
  const rawMessage = anyErr?.message || String(anyErr) || 'Beklenmeyen bir hata oluştu.';

  // Supabase / Postgres RLS ihlali için daha anlaşılır mesaj
  const normalized = String(rawMessage).toLowerCase();
  if (normalized.includes('row-level security')) {
    return {
      title: 'Yetki Hatası',
      message:
        'Bu işlem satır düzeyi güvenlik (RLS) politikası nedeniyle reddedildi. Seçili marka için yetkilendirilmiş değilsiniz. Admin panelinden (Admin → Kullanıcılar → Kullanıcıyı Düzenle → Markalar) kullanıcıya ilgili marka atanmalı.',
      code: 'RLS_VIOLATION',
    };
  }

  return {
    title: 'İşlem sırasında hata',
    message: rawMessage,
  };
}