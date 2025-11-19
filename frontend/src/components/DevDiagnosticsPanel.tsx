import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase';
import { ensureSupabaseSession, getUserId } from '../lib/authHelpers';
import { api } from '../lib/axiosClient';
import { getListItems } from '../utils/apiList';

type HealthStatus = {
  healthOk: boolean;
  brandsOk: boolean;
  brandsCount: number;
  lastError?: string | null;
};

export default function DevDiagnosticsPanel() {
  const [visible, setVisible] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [authSource, setAuthSource] = useState<'localStorage' | 'supabase' | 'none'>('none');
  const [health, setHealth] = useState<HealthStatus>({ healthOk: false, brandsOk: false, brandsCount: 0 });

  const supabaseUrl = useMemo(() => {
    try {
      // Try to read via Vite/Astro env first, otherwise fallback to process.env
      const v = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.PUBLIC_SUPABASE_URL) ||
                (typeof process !== 'undefined' && (process.env as any)?.PUBLIC_SUPABASE_URL) || '';
      return String(v || '');
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get('debug') === '1';
      const fromLocal = (typeof window !== 'undefined' && localStorage.getItem('debug') === '1');
      setVisible(!!(fromQuery || fromLocal));
    } catch {
      setVisible(false);
    }
  }, []);

  async function refreshStatus() {
    try {
      setChecking(true);
      // Tokens
      const at = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
      const rt = (typeof window !== 'undefined') ? localStorage.getItem('refresh_token') : null;
      setAccessToken(at || null);
      setRefreshToken(rt || null);

      // Ensure session and read session
      await ensureSupabaseSession();
      const { data } = await supabase.auth.getSession();
      const session = data?.session || null;
      const u = session?.user || null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);

      // Determine auth source like axios interceptor does
      let source: 'localStorage' | 'supabase' | 'none' = 'none';
      if (at) source = 'localStorage';
      else if (session?.access_token) source = 'supabase';
      setAuthSource(source);

      // Backend health
      let healthOk = false; let brandsOk = false; let brandsCount = 0; let lastError: string | null = null;
      try {
        const hr = await api.get('/health');
        if (hr.status >= 200 && hr.status < 300) healthOk = true;
      } catch (e: unknown) {
        const error = e as { message?: string };
        lastError = String(error?.message || e);
      }
      try {
        const br = await api.get('/brands');
        type BrandItem = { id: string; name: string };
        const list: BrandItem[] = getListItems<BrandItem>(br.data);
        brandsCount = list.length;
        brandsOk = true;
      } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } }; message?: string };
        lastError = String(error?.response?.data?.message || error?.message || e);
      }
      setHealth({ healthOk, brandsOk, brandsCount, lastError });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!visible || window.location.pathname === '/login') return;
    refreshStatus();
  }, [visible]);

  if (!visible) return null;

  const short = (s: string | null) => (s ? `${s.slice(0, 8)}…` : '—');

  return (
    <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-orange-700">🛠 Tanılama Paneli (Debug)</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded-lg border border-orange-300 bg-white"
            onClick={() => { try { localStorage.setItem('debug', '0'); } catch {}; setVisible(false); }}
          >Gizle</button>
          <button
            type="button"
            className="px-2 py-1 rounded-lg border border-orange-300 bg-white"
            onClick={() => refreshStatus()}
            disabled={checking}
          >{checking ? 'Kontrol ediliyor…' : 'Yenile'}</button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-orange-200 bg-white p-3">
          <div className="font-medium text-orange-700 mb-1">Oturum</div>
          <div>Supabase URL: <span className="font-mono">{supabaseUrl || '—'}</span></div>
          <div>Kullanıcı ID: <span className="font-mono">{userId || '—'}</span></div>
          <div>E-posta: <span className="font-mono">{userEmail || '—'}</span></div>
          <div>Auth Kaynağı: <span className="font-mono">{authSource}</span></div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded-lg border border-slate-200"
              onClick={async () => { await ensureSupabaseSession(); await refreshStatus(); }}
            >Session Kur</button>
            <button
              type="button"
              className="px-2 py-1 rounded-lg border border-slate-200"
              onClick={() => { try { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); } catch {}; refreshStatus(); }}
            >Token Temizle</button>
            <button
              type="button"
              className="px-2 py-1 rounded-lg border border-slate-200"
              onClick={() => { try { window.location.href = '/login'; } catch {} }}
            >Login’e Git</button>
          </div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-white p-3">
          <div className="font-medium text-orange-700 mb-1">Token’lar</div>
          <div>Access: <span className="font-mono">{short(accessToken)}</span></div>
          <div>Refresh: <span className="font-mono">{short(refreshToken)}</span></div>
        </div>
        <div className="rounded-lg border border-orange-200 bg-white p-3">
          <div className="font-medium text-orange-700 mb-1">Backend</div>
          <div>Health: <span className="font-mono">{health.healthOk ? 'OK' : 'FAIL'}</span></div>
          <div>Markalar: <span className="font-mono">{health.brandsOk ? `${health.brandsCount} adet` : 'FAIL'}</span></div>
          {health.lastError && (
            <div className="mt-1 text-xs text-red-600">Son hata: {health.lastError}</div>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-600">Debug panelini kalıcı açmak için URL’ye <span className="font-mono">?debug=1</span> ekleyin veya localStorage’da <span className="font-mono">debug=1</span> ayarlayın.</div>
    </div>
  );
}