import { useState, useEffect } from 'react';
import type { KpiStatus } from '../types/kpi';

export function useKpiFilters() {
  const [statusFilter, setStatusFilter] = useState<'tümü' | KpiStatus>('tümü');
  const [categoryFilter, setCategoryFilter] = useState<'tümü' | string>('tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load state from URL on initial render
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'aktif' || status === 'pasif') {
      setStatusFilter(status);
    }
    const category = params.get('category');
    if (category) {
      // URLSearchParams zaten gerekli kodlamayı/çözmeyi yapar; ekstra decode gereksiz ve hataya yol açar
      setCategoryFilter(category);
    }
    const query = params.get('q');
    if (query) {
      setSearchTerm(query);
      setDebouncedSearch(query);
    }
  }, []);

  // Update URL as state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'tümü') {
      params.set('status', statusFilter);
    }
    if (categoryFilter !== 'tümü') {
      // Çift kodlamayı engellemek için ham değeri yazıyoruz; URLSearchParams kendisi kodlar
      params.set('category', categoryFilter);
    }
    if (debouncedSearch) {
      params.set('q', debouncedSearch);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [statusFilter, categoryFilter, debouncedSearch]);

  return {
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
  };
}