import React, { useEffect, useState } from 'react';
import { api } from '../lib/axiosClient';
import { toUserFriendlyError } from '../lib/errorUtils';
import { filterBrandsByCategory } from '../lib/brandCategories';
import { getListItems } from '../utils/apiList';
import { logger } from '../lib/logger';

type Brand = { id: string; name: string };

export default function BrandSelectIsland() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const cat = 'satis-markalari';
        const res = await api.get('/brands', { params: { brandCategory: cat } });
        const items = getListItems<any>(res.data);
        let working = items;
        if ((cat ?? '').trim() && items.length === 0) {
          // Backend filtreli boş dönerse, filtresiz listeyi alıp istemci tarafında uygula
          const res2 = await api.get('/brands');
          type BrandItem = { id: string; name: string };
          const items2 = getListItems<BrandItem>(res2.data);
          working = filterBrandsByCategory(items2, cat || undefined);
        } else {
          working = filterBrandsByCategory(items, cat || undefined);
        }
        const normalized: Brand[] = (Array.isArray(working) ? working : []).map((b: { id?: string; name?: string }) => ({ id: String(b?.id ?? ''), name: String(b?.name ?? '') }));
        setBrands(normalized);
      } catch (e: unknown) {
        const friendly = toUserFriendlyError(e);
        setError(friendly.message || 'Markalar yüklenemedi');
        logger.error('Markalar alınamadı', e);
      }
    };
    load();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = String(e.target.value);
    try {
      localStorage.setItem('selectedBrandId', id);
    } catch {}
    window.dispatchEvent(new CustomEvent('brand:selected', { detail: { brandId: id } }));
  };

  useEffect(() => {
    // Initialize a default selection and broadcast it
    if (Array.isArray(brands) && brands.length > 0) {
      const current = typeof window !== 'undefined' ? localStorage.getItem('selectedBrandId') : null;
      // Fix ID format inconsistency by ensuring consistent string comparison
      const exists = current && brands.some(b => String(b.id) === String(current));
      const initial = exists ? String(current) : String(brands[0].id);
      try { localStorage.setItem('selectedBrandId', initial); } catch {}
      window.dispatchEvent(new CustomEvent('brand:selected', { detail: { brandId: initial } }));
    }
  }, [brands]);

  return (
    <select id="brandSelect" onChange={onChange} className="min-w-[200px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white shadow-sm">
      {brands === null && <option>Yükleniyor...</option>}
      {error && <option>{error}</option>}
      {Array.isArray(brands) && brands.length === 0 && !error && <option>Marka bulunamadı</option>}
      {Array.isArray(brands) && brands.length > 0 && brands.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}