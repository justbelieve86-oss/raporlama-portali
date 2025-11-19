import React, { useState } from 'react';
import { api } from '../lib/axiosClient';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { email });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error?.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sol Bölüm - Görsel/Animasyon */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        
        {/* Animasyonlu Geometrik Şekiller */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-white/5 rounded-lg rotate-45 animate-bounce"></div>
          <div className="absolute bottom-32 left-32 w-40 h-40 bg-white/5 rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-white/10 rounded-lg rotate-12 animate-bounce delay-500"></div>
        </div>

        {/* İçerik */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            {/* Logo - Başlığın Üstünde */}
            <div className="mb-8 flex justify-center">
              <img 
                src="/logo.png" 
                alt="Kardelen Otomotiv" 
                className="h-24 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.endsWith('/logo.png')) {
                    target.src = '/logo.svg';
                  }
                }}
              />
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Şifre Sıfırlama
              <span className="block text-blue-200">E-posta adresinizi girin</span>
            </h1>
          </div>
        </div>

        {/* Dalga Efekti */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20 fill-white/5">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
          </svg>
        </div>
      </div>

      {/* Sağ Bölüm - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">E-posta Gönderildi</h2>
                <p className="text-gray-600 mb-6">
                  Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-posta kutunuzu kontrol edin.
                </p>
                <a 
                  href="/login" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors duration-200 hover:underline"
                >
                  Giriş sayfasına dön
                </a>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Şifre Sıfırlama</h2>
                  <p className="text-gray-600">E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      className={`w-full px-4 py-4 border-2 rounded-xl bg-gray-50 transition-all duration-300 focus:outline-none focus:bg-white ${
                        emailFocused || email ? 'border-indigo-500 pt-6' : 'border-gray-200'
                      }`}
                      placeholder=" "
                      required
                      autoComplete="email"
                    />
                    <label
                      className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                        emailFocused || email
                          ? 'top-2 text-xs text-indigo-600 font-medium'
                          : 'top-4 text-gray-500'
                      }`}
                    >
                      E-posta Adresi
                    </label>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 hover:shadow-lg active:scale-95'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Gönderiliyor...
                      </div>
                    ) : (
                      'Sıfırlama Linki Gönder'
                    )}
                  </button>

                  {/* Back to Login Link */}
                  <div className="text-center">
                    <a 
                      href="/login" 
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors duration-200 hover:underline"
                    >
                      Giriş sayfasına dön
                    </a>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}