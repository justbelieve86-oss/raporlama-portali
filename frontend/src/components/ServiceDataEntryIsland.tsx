import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/axiosClient';
import supabase from '../lib/supabase';
import KpiAddFormIsland from './KpiAddFormIsland';
import BrandKpiListIsland from './BrandKpiListIsland';
import { filterBrandsByCategory } from '../lib/brandCategories';
import { logger } from '../lib/logger';

type Brand = { id: string; name: string };

export default function ServiceDataEntryIsland() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 1; y++) arr.push(y);
    return arr.reverse();
  }, [currentYear]);
  const [year, setYear] = useState<number>(currentYear);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [autoSave, setAutoSave] = useState<boolean>(true);

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setError(null);
        // Axios client Supabase session’dan güncel token’ı ekler
        const cat = 'satis-markalari';
        const { data: jsonRaw } = await api.get('/brands', { params: { brandCategory: cat } });
        const json = jsonRaw || {};
        const listInitial: Brand[] = Array.isArray(json?.data?.items) ? json.data.items : [];
        let list: Brand[] = listInitial;
        if ((cat ?? '').trim() && listInitial.length === 0) {
          const { data: raw2 } = await api.get('/brands');
          const json2 = raw2 || {};
          const list2: Brand[] = Array.isArray(json2?.data?.items) ? json2.data.items : [];
          list = filterBrandsByCategory(list2, cat || undefined) as Brand[];
        } else {
          list = filterBrandsByCategory(listInitial, cat || undefined) as Brand[];
        }
        setBrands(list);
        const current = typeof window !== 'undefined' ? localStorage.getItem('selectedBrandId') : null;
        const initial = current && list.find(b => String(b.id) === String(current)) ? String(current) : (list[0]?.id ? String(list[0].id) : '');
        if (initial) {
          setBrandId(initial);
          try { localStorage.setItem('selectedBrandId', initial); } catch {}
        }
      } catch (e: unknown) {
        // 401 durumunda session/token temizleyip login'e yönlendir
        const error = e as { response?: { data?: { message?: string }; status?: number }; message?: string };
        const msg = String(error?.response?.data?.message || error?.message || '').toLowerCase();
        if (error?.response?.status === 401 || msg.includes('geçersiz token') || msg.includes('eksik yetki')) {
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_role');
            }
          } catch {}
          setBrands([]);
          setError('Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
          setTimeout(() => { try { window.location.href = '/login?message=Oturum%20s%C3%BCresi%20dolmu%C5%9F'; } catch {} }, 800);
          return;
        }
        logger.error('Markalar alınamadı', e);
        setError('Markalar yüklenemedi');
      }
    };
    loadBrands();
  }, []);

  return (
    <div className="space-y-6">
      {/* Üst kontrol çubuğu */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Sol kontrol grubu */}
        <div className="flex items-center space-x-3">
          <KpiAddFormIsland brandId={brandId} categoryFilter="Servis - Aylık KPI" onAdded={() => { setReloadToken((x) => x + 1); }} />
          <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-700">
            <span>📊</span>
            <span className="text-sm">{brands.length > 0 ? 'KPI Paneli' : '—'}</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoSave(v => !v)}
            className="inline-flex items-center space-x-3 px-3 py-2 rounded-lg bg-slate-100 text-slate-700"
            title="Otomatik kaydı aç/kapat"
          >
            <span className="text-sm">Otomatik Kayıt {autoSave ? 'Açık' : 'Kapalı'}</span>
            <span className={`relative inline-flex items-center w-12 h-6 rounded-full ${autoSave ? 'bg-violet-600' : 'bg-slate-400'}`}>
              <span className={`absolute ${autoSave ? 'left-6' : 'left-1'} top-0.5 inline-block w-5 h-5 rounded-full bg-white shadow transition-all`}></span>
            </span>
          </button>
        </div>

        {/* Sağ seçim grubu */}
        <div className="flex items-center space-x-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Marka Seçimi</div>
            <select
              value={brandId}
              onChange={(e) => {
                const id = e.target.value;
                setBrandId(id);
                try { localStorage.setItem('selectedBrandId', id); } catch {}
              }}
              className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              {brands.length === 0 && !error && <option>Marka bulunamadı</option>}
              {error && <option>{error}</option>}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Yıl Seçimi</div>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="min-w-[120px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dinamik KPI listesi */}
      <BrandKpiListIsland brandId={brandId} year={year} reloadToken={reloadToken} autoSave={autoSave} categoryFilter="Servis - Aylık KPI" />
    </div>
  );
}