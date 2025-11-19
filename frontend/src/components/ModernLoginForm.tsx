import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { loginSchema } from '../schemas/auth';
import { api } from '../lib/axiosClient';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError } from '../lib/errorUtils';
import { logger } from '../lib/logger';

export default function ModernLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    const parse = loginSchema.safeParse({ username, password });
    if (!parse.success) {
      const firstIssue = parse.error?.issues?.[0];
      setError(firstIssue?.message ?? 'Geçersiz kullanıcı bilgileri');
      return;
    }
    
    setLoading(true);
    
    try {
      // Backend'den JWT token al (envelope: { success, data, message })
      // baseURL zaten /api ile bitiyor, bu yüzden sadece /auth/login kullan
      logger.debug('Sending login request to /auth/login');
      const { data: envelope } = await api.post('/auth/login', { username, password });
      logger.debug('Received backend response', { envelope });

      // Hem envelope'lü hem de düz yanıtı destekle
      const payload = envelope?.data ?? envelope ?? {};
      const accessToken = payload?.token ?? payload?.access_token ?? '';
      const refreshToken = payload?.refresh_token ?? '';
      const user = payload?.user ?? null;
      const role = payload?.role ?? user?.user_metadata?.role ?? 'user';

      logger.debug('Login: Parsed payload', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        role,
        userId: user?.id
      });

      // Token'ı localStorage'a kaydet
      if (accessToken) localStorage.setItem('access_token', accessToken);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_role', role);

      logger.debug('Tokens saved to localStorage');

      // Supabase session'ını ayarlamaya çalış
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) throw error;
        logger.debug('Supabase session ayarlandı', { hasSession: !!data.session });
      } catch (sessionErr) {
        logger.warn('Supabase session hatası', sessionErr);
      }
      
      // Yönlendirme
      const target = role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : '/user';
      logger.debug('Redirecting to', { target });
      window.location.href = target;
    } catch (err) {
      const friendly = toUserFriendlyError(err);
      setError(friendly.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 backdrop-blur-sm transition-colors duration-300">
      {/* Başlık */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Giriş Yap
        </h2>
        <p className="text-gray-500 text-sm">Raporlama portalına erişmek için giriş yapın</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username Input */}
        <div className="relative group">
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${usernameFocused || username ? 'opacity-10' : ''}`}></div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
              className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl bg-gray-50/50 transition-all duration-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 ${
                usernameFocused || username 
                  ? 'border-indigo-500 shadow-md shadow-indigo-100' 
                  : 'border-gray-200 hover:border-gray-300'
              } text-gray-900 placeholder-gray-400`}
              placeholder="Kullanıcı adınızı girin"
              required
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="relative group">
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${passwordFocused || password ? 'opacity-10' : ''}`}></div>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl bg-gray-50/50 transition-all duration-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100 ${
                passwordFocused || password 
                  ? 'border-indigo-500 shadow-md shadow-indigo-100' 
                  : 'border-gray-200 hover:border-gray-300'
              } text-gray-900 placeholder-gray-400`}
              placeholder="Şifrenizi girin"
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <ErrorAlert
              title="Giriş başarısız"
              message={error}
              details="Kullanıcı adınızı ve şifrenizi kontrol ederek tekrar deneyin. Sorun devam ederse destek ile iletişime geçin."
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 transform relative overflow-hidden group ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] shadow-lg'
          }`}
        >
          <span className="relative z-10 flex items-center justify-center">
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Giriş yapılıyor...
              </>
            ) : (
              <>
                <span>Giriş Yap</span>
                <svg className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
          {!loading && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          )}
        </button>

        {/* Forgot Password Link */}
        <div className="text-center pt-2">
          <a 
            href="/reset-password" 
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200 hover:underline group"
          >
            <svg className="w-4 h-4 mr-1.5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Şifrenizi mi unuttunuz?
          </a>
        </div>
      </form>
    </div>
  );
}