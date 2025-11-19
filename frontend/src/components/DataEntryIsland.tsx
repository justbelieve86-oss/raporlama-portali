import React, { useEffect, useMemo, useState } from 'react';
import KpiAddFormIsland from './KpiAddFormIsland';
import DevDiagnosticsPanel from './DevDiagnosticsPanel';
import BrandKpiListIsland from './BrandKpiListIsland';
import { getBrands } from '../services/api';
import type { BrandCategoryKey } from '../lib/brandCategories';
import { logger } from '../lib/logger';

type Brand = { id: string; name: string };

type Props = { brandCategory?: BrandCategoryKey; categoryFilter?: string };

export default function DataEntryIsland({ brandCategory, categoryFilter = 'Satış' }: Props) {
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
        const cat = brandCategory || 'satis-markalari';
        const { brands: list } = await getBrands({ brandCategory: cat });
        const arr = (list as any) as Brand[];
        setBrands(arr);
        const current = typeof window !== 'undefined' ? localStorage.getItem('selectedBrandId') : null;
        const initial = current && arr.find(b => String(b.id) === String(current)) ? String(current) : (arr[0]?.id ? String(arr[0].id) : '');
        if (initial) {
          setBrandId(initial);
          try { localStorage.setItem('selectedBrandId', initial); } catch {}
        }
      } catch (e: unknown) {
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
  }, [brandCategory]);

  return (
    <div className="space-y-6">
      {/* Debug diagnostics panel (visible when ?debug=1 or localStorage debug=1) */}
      <DevDiagnosticsPanel />
      {/* Üst kontrol çubuğu */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Sol kontrol grubu */}
        <div className="flex items-center space-x-3">
          <KpiAddFormIsland brandId={brandId} categoryFilter={categoryFilter} onAdded={() => { setReloadToken((x) => x + 1); }} />
          <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700">
            <span>📊</span>
            <span className="text-sm">{brands.length > 0 ? 'KPI Paneli' : '—'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Otomatik Kayıt {autoSave ? 'Açık' : 'Kapalı'}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoSave}
                onChange={() => setAutoSave(v => !v)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Sağ seçim grubu */}
        <div className="flex items-center space-x-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Marka Seçimi</div>
            <select
              value={brandId}
              onChange={(e) => {
                const id = e.target.value;
                setBrandId(id);
                try { localStorage.setItem('selectedBrandId', id); } catch {}
              }}
              className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {brands.length === 0 && !error && <option>Marka bulunamadı</option>}
              {error && <option>{error}</option>}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Yıl Seçimi</div>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="min-w-[120px] px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dinamik KPI listesi */}
      <BrandKpiListIsland brandId={brandId} year={year} reloadToken={reloadToken} autoSave={autoSave} categoryFilter={categoryFilter} />
    </div>
  );
}