import React, { useEffect, useMemo, useState } from 'react';
import { BarChartIcon, EditIcon, TrashIcon, EyeIcon } from './ui/icons';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from './ui/table';
import { Modal, ModalFooter } from './ui/modal';
import { Badge } from './ui/badge';
import clsx from 'clsx';
import { logAudit } from '../services/audit';
import { adminUpdateKpiFormula, adminBulkUpdateKpiStatus, adminBulkUpdateKpiCategory, adminBulkDeleteKpis, adminCreateCategory, adminUpdateCategory, adminDeleteCategory, adminCreateUnit, adminDeleteUnit, adminCreateKpi, adminUpdateKpi, adminDeleteKpi, getKpiSources, getKpiFormula } from '../services/api';
import { useKpiData } from '../hooks/useKpiData';
import type { KpiItem, KpiStatus, YtdCalc } from '../types/kpi';
import { toBackendPayload } from '../utils/kpiPayload';

import { useKpiFilters } from '../hooks/useKpiFilters';
import { useKpiSorting } from '../hooks/useKpiSorting';
import { useKpiPagination } from '../hooks/useKpiPagination';
import { logger } from '../lib/logger';

// Lazy load virtual scrolling components to avoid Vite optimization issues
const FixedSizeList = React.lazy(() => 
  import('react-window').then(module => ({ default: (module as any).FixedSizeList }))
);
const AutoSizer = React.lazy(() => 
  import('react-virtualized-auto-sizer').then(module => ({ default: module.default || module }))
);

// Explicit props for virtualized row renderer to satisfy TS
type VirtualRowProps = { index: number; style: React.CSSProperties };

export default function KpiManagement() {
  const { kpis, categories, units, isLoading: isLoadingKpis, error: kpiError, setKpis, setCategories, refetch } = useKpiData();
  const { statusFilter, setStatusFilter, categoryFilter, setCategoryFilter, searchTerm, setSearchTerm, debouncedSearch } = useKpiFilters();
  const { sortBy, sortDir, handleSort } = useKpiSorting();
  const { page, setPage, pageSize, setPageSize } = useKpiPagination();
  
  const [editingCategoryError, setEditingCategoryError] = useState('');
  const [newKpiErrors, setNewKpiErrors] = useState<{ 
    name?: string;
    numeratorKpiId?: string;
    denominatorKpiId?: string;
    cumulativeSourceIds?: string;
    formulaText?: string;
  }>({});
  const [originalEditItem, setOriginalEditItem] = useState<KpiItem | null>(null);
  const [editErrors, setEditErrors] = useState<{ name?: string; numeratorKpiId?: string; denominatorKpiId?: string; cumulativeSourceIds?: string; formulaText?: string }>({});
  const [unsavedTarget, setUnsavedTarget] = useState<'addKpi' | 'editKpi' | null>(null);
  const [isUnsavedOpen, setIsUnsavedOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('Satış');

  const [viewItem, setViewItem] = useState<KpiItem | null>(null);
  const [editItem, setEditItem] = useState<KpiItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<KpiItem | null>(null);
  const [editAverageData, setEditAverageData] = useState<boolean>(false);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  useEffect(() => {
    if (editItem) {
      const isDerived = !!editItem.numeratorKpiId && !!editItem.denominatorKpiId;
      setEditAverageData(editItem.unit !== '%' && isDerived);
    } else {
      setEditAverageData(false);
    }
  }, [editItem]);

  // Kategori düzenleme/silme için durumlar
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
  // Yeni KPI formu için varsayılan değerler (kategori mevcut filtreye veya ilk kategoriye göre ayarlanır)
  const getDefaultNewKpi = (): Omit<KpiItem, 'id' | 'reportCount'> => ({
    name: '',
    // Eğer filtre "tümü" ise (listeleme için özel değer), yeni KPI için ilk gerçek kategori seçilsin
    category: (categoryFilter && categoryFilter !== 'tümü') ? categoryFilter : (categories[0] || 'Satış'),
    unit: 'Puan',
    status: 'aktif',
    ytdCalc: 'ortalama',
    onlyCumulative: false,
    averageData: false,
    monthlyAverage: false,
    hasTargetData: false,
    numeratorKpiId: undefined,
    denominatorKpiId: undefined,
    cumulativeSourceIds: [],
    formulaText: '',
    targetFormulaText: '',
  });
  const [newKpi, setNewKpi] = useState<Omit<KpiItem, 'id' | 'reportCount'>>(getDefaultNewKpi());

  // Birim silme onayı için durum
  const [unitDeleteIndex, setUnitDeleteIndex] = useState<number | null>(null);

  // Birim adı normalizasyonu (Title Case)
  const normalizeUnitName = (s: string) =>
    s
      .trim()
      .split(/\s+/)
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');

  // Kategori adı normalizasyonu (Title Case)
  const normalizeCategoryName = (s: string) =>
    s
      .trim()
      .split(/\s+/)
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');

  const kpiNameExists = (name: string, category: string, excludeId?: string) => {
    const n = name.trim().toLowerCase();
    return kpis.some(k => k.name.trim().toLowerCase() === n && k.category === category && (!excludeId || k.id !== excludeId));
  };

  const validateNewKpi = () => {
    const errors: { name?: string; numeratorKpiId?: string; denominatorKpiId?: string; cumulativeSourceIds?: string; formulaText?: string } = {};
    const name = newKpi.name.trim();
    if (!name) errors.name = 'KPI adı zorunlu.';
    else if (name.length < 3) errors.name = 'KPI adı en az 3 karakter olmalı.';
    else if (name.length > 100) errors.name = 'KPI adı en fazla 100 karakter olabilir.';
    else if (kpiNameExists(name, newKpi.category)) errors.name = 'Bu kategoride aynı adda KPI zaten var.';
    
    // Yüzde KPI mantığı: birim % ise pay/payda zorunlu ve farklı olmalı
    if (newKpi.unit === '%') {
      if (!newKpi.numeratorKpiId) errors.numeratorKpiId = 'Pay KPI seçimi zorunlu.';
      if (!newKpi.denominatorKpiId) errors.denominatorKpiId = 'Payda KPI seçimi zorunlu.';
      if (newKpi.numeratorKpiId && newKpi.denominatorKpiId && newKpi.numeratorKpiId === newKpi.denominatorKpiId) {
        errors.numeratorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
        errors.denominatorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
      }
    }
    // Ortalama Veri mantığı: birim % değilse de pay/payda seçili ve farklı olmalı
    if (newKpi.averageData) {
      if (!newKpi.numeratorKpiId) errors.numeratorKpiId = 'Pay KPI seçimi zorunlu.';
      if (!newKpi.denominatorKpiId) errors.denominatorKpiId = 'Payda KPI seçimi zorunlu.';
      if (newKpi.numeratorKpiId && newKpi.denominatorKpiId && newKpi.numeratorKpiId === newKpi.denominatorKpiId) {
        errors.numeratorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
        errors.denominatorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
      }
    }
    // Aylık Ortalama mantığı: pay/payda seçili ve farklı olmalı
    if (newKpi.monthlyAverage) {
      if (!newKpi.numeratorKpiId) errors.numeratorKpiId = 'Pay KPI seçimi zorunlu.';
      if (!newKpi.denominatorKpiId) errors.denominatorKpiId = 'Payda KPI seçimi zorunlu.';
      if (newKpi.numeratorKpiId && newKpi.denominatorKpiId && newKpi.numeratorKpiId === newKpi.denominatorKpiId) {
        errors.numeratorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
        errors.denominatorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
      }
    }
    // Kümülatif mantığı: kaynaklar seçildiyse en az 2 adet olmalı ve birim % olamaz
    const cumulativeCount = Array.isArray(newKpi.cumulativeSourceIds) ? newKpi.cumulativeSourceIds.length : 0;
    // Tek kaynak seçimine izin verilir; 0 kaynak seçimi de geçerlidir.
    if (cumulativeCount > 0 && newKpi.unit === '%') {
      errors.cumulativeSourceIds = 'Kümülatif KPI için birim % olamaz.';
    }

    // Formül validation: formül varsa referansları doğrula
    {
      const f = (newKpi.formulaText || '').trim();
      if (f) {
        const tokenRegex = /\[([^\]]+)\]/g;
        let match: RegExpExecArray | null;
        const names: string[] = [];
        while ((match = tokenRegex.exec(f)) !== null) {
          names.push(match[1].trim());
        }
        if (!names.length) {
          errors.formulaText = 'Formülde en az bir KPI adı köşeli parantez içinde olmalı.';
        } else {
          const byName = new Map<string, string>();
          kpis.filter(k => k.category === newKpi.category).forEach(k => byName.set(k.name, k.id));
          const invalid = names.filter(n => !byName.has(n));
          if (invalid.length) {
            errors.formulaText = `Geçersiz KPI adları: ${invalid.join(', ')}`;
          }
        }
      }
    }
    
    setNewKpiErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditKpi = () => {
    if (!editItem) return false;
    const errors: { name?: string; numeratorKpiId?: string; denominatorKpiId?: string; cumulativeSourceIds?: string; formulaText?: string } = {};
    const name = editItem.name.trim();
    if (!name) errors.name = 'KPI adı zorunlu.';
    else if (name.length < 3) errors.name = 'KPI adı en az 3 karakter olmalı.';
    else if (name.length > 100) errors.name = 'KPI adı en fazla 100 karakter olabilir.';
    else if (kpiNameExists(name, editItem.category, editItem.id)) errors.name = 'Bu kategoride aynı adda KPI zaten var.';

    // Yüzde KPI mantığı: birim % ise pay/payda zorunlu ve farklı olmalı
    if (editItem.unit === '%') {
      if (!editItem.numeratorKpiId) errors.numeratorKpiId = 'Pay KPI seçimi zorunlu.';
      if (!editItem.denominatorKpiId) errors.denominatorKpiId = 'Payda KPI seçimi zorunlu.';
      if (editItem.numeratorKpiId && editItem.denominatorKpiId && editItem.numeratorKpiId === editItem.denominatorKpiId) {
        errors.numeratorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
        errors.denominatorKpiId = 'Payda KPI\'ları farklı olmalı.';
      }
    }
    // Ortalama Veri (pay/payda) mantığı: birim % değilse de pay/payda seçili ve farklı olmalı
    if (editAverageData) {
      if (!editItem.numeratorKpiId) errors.numeratorKpiId = 'Pay KPI seçimi zorunlu.';
      if (!editItem.denominatorKpiId) errors.denominatorKpiId = 'Payda KPI seçimi zorunlu.';
      if (editItem.numeratorKpiId && editItem.denominatorKpiId && editItem.numeratorKpiId === editItem.denominatorKpiId) {
        errors.numeratorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
        errors.denominatorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
      }
    }
    // Aylık Ortalama mantığı: pay/payda seçili ve farklı olmalı
    if (editItem.monthlyAverage) {
      if (!editItem.numeratorKpiId) errors.numeratorKpiId = 'Pay KPI seçimi zorunlu.';
      if (!editItem.denominatorKpiId) errors.denominatorKpiId = 'Payda KPI seçimi zorunlu.';
      if (editItem.numeratorKpiId && editItem.denominatorKpiId && editItem.numeratorKpiId === editItem.denominatorKpiId) {
        errors.numeratorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
        errors.denominatorKpiId = 'Pay ve payda KPI\'ları farklı olmalı.';
      }
    }

    // Kümülatif mantığı: kaynaklar seçildiyse en az 2 adet olmalı ve birim % olamaz
    const count = Array.isArray(editItem.cumulativeSourceIds) ? editItem.cumulativeSourceIds.length : 0;
    // Tek kaynak seçimine izin verilir; 0 kaynak seçimi de geçerlidir.
    if (count > 0 && editItem.unit === '%') {
      errors.cumulativeSourceIds = 'Kümülatif KPI için birim % olamaz.';
    }

    // Formül validation: formül varsa referansları doğrula
    {
      const f = (editItem.formulaText || '').trim();
      if (f) {
        const tokenRegex = /\[([^\]]+)\]/g;
        let match: RegExpExecArray | null;
        const names: string[] = [];
        while ((match = tokenRegex.exec(f)) !== null) {
          names.push(match[1].trim());
        }
        if (!names.length) {
          errors.formulaText = 'Formülde en az bir KPI adı köşeli parantez içinde olmalı.';
        } else {
          const byName = new Map<string, string>();
          kpis.filter(k => k.category === editItem.category).forEach(k => byName.set(k.name, k.id));
          const invalid = names.filter(n => !byName.has(n));
          if (invalid.length) {
            errors.formulaText = `Geçersiz KPI adları: ${invalid.join(', ')}`;
          }
        }
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const filteredKpis = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return kpis.filter(k => {
      const statusOk = statusFilter === 'tümü' || k.status === statusFilter;
      const categoryOk = categoryFilter === 'tümü' || k.category === categoryFilter;
      const nameOk = q === '' || k.name.toLowerCase().includes(q);
      return statusOk && categoryOk && nameOk;
    });
  }, [kpis, statusFilter, categoryFilter, debouncedSearch]);

  const sortedKpis = useMemo(() => {
    const arr = [...filteredKpis];
    const cmp = (a: KpiItem, b: KpiItem) => {
      let va: string | number | undefined;
      let vb: string | number | undefined;
      switch (sortBy) {
        case 'name':
          va = a.name.toLowerCase(); vb = b.name.toLowerCase();
          break;
        case 'category':
          va = a.category.toLowerCase(); vb = b.category.toLowerCase();
          break;
        case 'status':
          va = a.status; vb = b.status;
          break;
        case 'ytdCalc':
          const map: Record<YtdCalc, number> = { ortalama: 0, toplam: 1 };
          va = map[a.ytdCalc]; vb = map[b.ytdCalc];
          break;
        case 'reportCount':
          va = a.reportCount; vb = b.reportCount;
          break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    };
    arr.sort(cmp);
    return arr;
  }, [filteredKpis, sortBy, sortDir]);

  const totalItems = sortedKpis.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedKpis = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedKpis.slice(start, start + pageSize);
  }, [sortedKpis, page, pageSize]);

  const useVirtual = totalItems >= 500;
  const visibleKpis = useVirtual ? sortedKpis : pagedKpis;

  useEffect(() => {
    // Filtre, arama veya sıralama değişince ilk sayfaya dön
    setPage(1);
  }, [statusFilter, categoryFilter, debouncedSearch, sortBy, sortDir, pageSize]);

  const isVisibleAllSelected = useMemo(() => {
    const ids = visibleKpis.map(k => k.id);
    return ids.length > 0 && ids.every(id => selectedIds.includes(id));
  }, [visibleKpis, selectedIds]);

  const toggleSelectAllOnPage = () => {
    const ids = visibleKpis.map(k => k.id);
    if (isVisibleAllSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const bulkSetStatus = async (status: KpiStatus) => {
    if (selectedIds.length === 0) return;
    try {
      await adminBulkUpdateKpiStatus(selectedIds, status);
      logAudit({ action: 'bulk_status', details: { count: selectedIds.length, status } });
      setSelectedIds([]);
      refetch();
    } catch (err: unknown) {
      logger.error(`Toplu durum güncellenemedi`, err);
    }
  };

  const bulkApplyCategory = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminBulkUpdateKpiCategory(selectedIds, bulkCategory);
      logAudit({ action: 'bulk_category', details: { count: selectedIds.length, category: bulkCategory } });
      setSelectedIds([]);
      refetch();
    } catch (err: unknown) {
      logger.error(`Toplu kategori güncellenemedi`, err);
    }
  };

  const confirmBulkDelete = () => setIsBulkDeleteOpen(true);
  const doBulkDelete = async () => {
    try {
      await adminBulkDeleteKpis(selectedIds);
      logAudit({ action: 'bulk_delete', details: { count: selectedIds.length } });
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      refetch();
    } catch (err: unknown) {
      logger.error(`Toplu silme başarısız`, err);
    }
  };

  const onSort = (key: 'name' | 'category' | 'status' | 'ytdCalc' | 'reportCount') => {
    handleSort(key);
  };

  const clearFilters = () => {
    setStatusFilter('tümü');
    setCategoryFilter('tümü');
    setSearchTerm('');
  };

  const onCreateCategory = async () => {
    const nameRaw = newCategoryName;
    const name = normalizeCategoryName(nameRaw);
    if (!name) { logger.error('Kategori adı zorunlu'); return; }
    if (name.length < 2) { logger.error('Kategori adı en az 2 karakter olmalı'); return; }
    const exists = categories.some(c => c.toLowerCase() === name.toLowerCase());
    if (exists) { logger.error('Bu kategori zaten mevcut'); return; }
    try {
      await adminCreateCategory(name);
      refetch();
      setNewCategoryName('');
      logAudit({ action: 'category_create', details: { name } });
    } catch (err: unknown) {
      logger.error(`Kategori eklenemedi`, err);
    }
  };

  // Birim ekleme/silme
  const onCreateUnit = async () => {
    const normalized = normalizeUnitName(newUnitName);
    if (!normalized) { logger.error('Birim adı zorunlu'); return; }
    if (normalized.length < 1) { logger.error('Birim adı en az 1 karakter olmalı'); return; }
    const exists = units.some(u => u.toLowerCase() === normalized.toLowerCase());
    if (exists) { logger.error('Bu birim zaten mevcut'); return; }
    
    try {
      await adminCreateUnit(normalized);
      refetch();
      setNewUnitName('');
      logAudit({ action: 'unit_create', details: { name: normalized } });
    } catch (err: unknown) {
      logger.error(`Birim eklenemedi`, err);
    }
  };

  const deleteUnitAt = async (idx: number) => {
    const removed = units[idx];
    try {
      await adminDeleteUnit(removed);
      refetch();
      logAudit({ action: 'unit_delete', details: { name: removed } });
    } catch (err: unknown) {
      logger.error('Birim silinemedi', err);
    }
  };

  const startEditCategory = (idx: number) => {
    setEditingCategoryIndex(idx);
    setEditingCategoryName(categories[idx]);
  };

  const cancelEditCategory = () => {
    setEditingCategoryIndex(null);
    setEditingCategoryName('');
  };

  const saveEditCategory = async () => {
    if (editingCategoryIndex === null) return;
    const name = editingCategoryName.trim();
    if (!name) { setEditingCategoryError('Kategori adı zorunlu.'); return; }
    const exists = categories.some((c, i) => c.toLowerCase() === name.toLowerCase() && i !== editingCategoryIndex);
    if (exists) { setEditingCategoryError('Bu kategori zaten mevcut.'); return; }
    const old = categories[editingCategoryIndex];
    try {
      await adminUpdateCategory(old, name);
      
      // Optimistic update: Kategorileri hemen güncelle (UI'da anında görünsün)
      setCategories(prev => prev.map((c, i) => i === editingCategoryIndex ? name : c));
      
      // Eğer düzenlenen kategori filtrede seçiliyse, filtreyi de güncelle
      if (categoryFilter === old) {
        setCategoryFilter(name);
      }
      
      // KPI'ların kategori alanlarını da güncelle (local state'te)
      setKpis(prev => prev.map(k => k.category === old ? { ...k, category: name } : k));
      
      // Backend'den tüm verileri yeniden yükle (kategoriler dahil)
      // Not: Backend'de KPI'ların category alanları da güncellenmiş olmalı
      await refetch();
      
      // Refetch sonrası KPI'ların category alanlarını tekrar kontrol et ve güncelle
      // (Backend'den gelen veriler optimistic update'i override edebilir)
      setKpis(prev => prev.map(k => {
        // Eğer KPI'nın category'si hala eski kategori adıysa, yeni kategori adıyla güncelle
        if (k.category === old) {
          return { ...k, category: name };
        }
        return k;
      }));
      
      cancelEditCategory();
      setEditingCategoryError('');
      logAudit({ action: 'category_update', details: { from: old, to: name } });
    } catch (err: unknown) {
      setEditingCategoryError(`Kategori güncellenemedi: ${err.message ?? String(err)}`);
      // Hata durumunda refetch yap (rollback için)
      refetch();
    }
  };

  const deleteCategoryAt = async (idx: number) => {
    const removed = categories[idx];
    try {
      await adminDeleteCategory(removed);
      if (editingCategoryIndex === idx) {
        cancelEditCategory();
      }
      refetch();
      logAudit({ action: 'category_delete', details: { name: removed } });
    } catch (err: unknown) {
      logger.error('Kategori silinemedi', err);
    }
  };


  const onCreateKpi = async () => {
    if (!validateNewKpi()) return;
    try {
      const payload = toBackendPayload(newKpi);
      await adminCreateKpi(payload);
      refetch();
      setIsAddKpiOpen(false);
      // Formu kapatırken değerleri sıfırla ki tekrar açıldığında boş gelsin
      setNewKpi(getDefaultNewKpi());
      setNewKpiErrors({});
      logAudit({ action: 'kpi_create', details: { name: newKpi.name, category: newKpi.category } });
    } catch (err: unknown) {
      logger.error('KPI oluşturulamadı', err);
      setNewKpiErrors({ name: `KPI oluşturulamadı: ${err.message ?? String(err)}` });
    }
  };

  const onUpdateKpi = async () => {
    if (!editItem) return;
    if (!validateEditKpi()) return;
    try {
      const payload = toBackendPayload(editItem);
      await adminUpdateKpi(editItem.id, payload);
      refetch();
      if (originalEditItem) {
        const changes: Record<string, any> = {};
        if (originalEditItem.name !== editItem!.name) changes.name = { from: originalEditItem.name, to: editItem!.name };
        if (originalEditItem.category !== editItem!.category) changes.category = { from: originalEditItem.category, to: editItem!.category };
        if (originalEditItem.unit !== editItem!.unit) changes.unit = { from: originalEditItem.unit, to: editItem!.unit };
        if (originalEditItem.status !== editItem!.status) changes.status = { from: originalEditItem.status, to: editItem!.status };
        if (originalEditItem.ytdCalc !== editItem!.ytdCalc) changes.ytdCalc = { from: originalEditItem.ytdCalc, to: editItem!.ytdCalc };
        if ((!!originalEditItem.onlyCumulative) !== (!!editItem!.onlyCumulative)) changes.onlyCumulative = { from: !!originalEditItem.onlyCumulative, to: !!editItem!.onlyCumulative };
        if ((!!originalEditItem.hasTargetData) !== (!!editItem!.hasTargetData)) changes.hasTargetData = { from: !!originalEditItem.hasTargetData, to: !!editItem!.hasTargetData };
        if ((!!originalEditItem.monthlyAverage) !== (!!editItem!.monthlyAverage)) changes.monthlyAverage = { from: !!originalEditItem.monthlyAverage, to: !!editItem!.monthlyAverage };
        if ((originalEditItem.numeratorKpiId || '') !== (editItem!.numeratorKpiId || '')) changes.numeratorKpiId = { from: originalEditItem.numeratorKpiId, to: editItem!.numeratorKpiId };
        if ((originalEditItem.denominatorKpiId || '') !== (editItem!.denominatorKpiId || '')) changes.denominatorKpiId = { from: originalEditItem.denominatorKpiId, to: editItem!.denominatorKpiId };
        if (JSON.stringify(originalEditItem.cumulativeSourceIds || []) !== JSON.stringify(editItem!.cumulativeSourceIds || [])) changes.cumulativeSourceIds = { from: originalEditItem.cumulativeSourceIds, to: editItem!.cumulativeSourceIds };
        if ((originalEditItem.formulaText || '') !== (editItem!.formulaText || '')) changes.formulaText = { from: originalEditItem.formulaText, to: editItem!.formulaText };
        if ((originalEditItem.targetFormulaText || '') !== (editItem!.targetFormulaText || '')) changes.targetFormulaText = { from: originalEditItem.targetFormulaText, to: editItem!.targetFormulaText };
        logAudit({ action: 'kpi_update', details: { id: originalEditItem.id, changes } });
      }
      setEditItem(null);
      setOriginalEditItem(null);
      setEditErrors({});
    } catch (err: unknown) {
      logger.error(`KPI güncellenemedi`, err);
    }
  };

  const openEditModal = async (item: KpiItem) => {
    setEditItem({ ...item });
    setOriginalEditItem({ ...item });
    setEditErrors({});
    logAudit({ action: 'kpi_edit_open', details: { id: item.id, name: item.name } });
    // Kümülatif kaynaklar ve formül yükleme mantığı kaldırıldı
  };

  const openViewModal = (item: KpiItem) => {
    setViewItem(item);
    logAudit({ action: 'kpi_view', details: { id: item.id, name: item.name } });
  };

  const attemptCloseAddKpi = () => {
    const dirty =
      newKpi.name.trim() !== '' ||
      newKpi.unit !== 'Puan' ||
      newKpi.status !== 'aktif' ||
      newKpi.ytdCalc !== 'ortalama' ||
      !!newKpi.onlyCumulative ||
      !!newKpi.hasTargetData ||
      !!newKpi.monthlyAverage ||
      (newKpi.targetFormulaText || '').trim() !== '' ||
      (categories[0] && newKpi.category !== (categories[0] || 'Satış'));
    if (dirty) {
      setUnsavedTarget('addKpi');
      setIsUnsavedOpen(true);
      logAudit({ action: 'unsaved_prompt', details: { target: 'addKpi' } });
    } else {
      setIsAddKpiOpen(false);
      setNewKpi(getDefaultNewKpi());
      setNewKpiErrors({});
    }
  };

  const attemptCloseEditKpi = () => {
    if (!editItem || !originalEditItem) { setEditItem(null); setOriginalEditItem(null); return; }
    const changed = (
      editItem.name !== originalEditItem.name ||
      editItem.category !== originalEditItem.category ||
      editItem.unit !== originalEditItem.unit ||
      editItem.status !== originalEditItem.status ||
      editItem.ytdCalc !== originalEditItem.ytdCalc ||
      (!!editItem.onlyCumulative) !== (!!originalEditItem.onlyCumulative) ||
      (!!editItem.hasTargetData) !== (!!originalEditItem.hasTargetData) ||
      (!!editItem.monthlyAverage) !== (!!originalEditItem.monthlyAverage) ||
      (editItem.numeratorKpiId || '') !== (originalEditItem.numeratorKpiId || '') ||
      (editItem.denominatorKpiId || '') !== (originalEditItem.denominatorKpiId || '') ||
      JSON.stringify(editItem.cumulativeSourceIds || []) !== JSON.stringify(originalEditItem.cumulativeSourceIds || []) ||
      (editItem.formulaText || '') !== (originalEditItem.formulaText || '') ||
      (editItem.targetFormulaText || '') !== (originalEditItem.targetFormulaText || '')
    );
    if (changed) {
      setUnsavedTarget('editKpi');
      setIsUnsavedOpen(true);
      logAudit({ action: 'unsaved_prompt', details: { target: 'editKpi', id: originalEditItem.id } });
    } else {
      setEditItem(null);
      setOriginalEditItem(null);
      setEditErrors({});
    }
  };

  const proceedUnsavedClose = () => {
    if (!unsavedTarget) return;
    if (unsavedTarget === 'addKpi') {
      setIsAddKpiOpen(false);
      setNewKpi(getDefaultNewKpi());
      setNewKpiErrors({});
      logAudit({ action: 'unsaved_confirm_close', details: { target: 'addKpi' } });
    } else {
      setEditItem(null);
      setOriginalEditItem(null);
      setEditErrors({});
      logAudit({ action: 'unsaved_confirm_close', details: { target: 'editKpi' } });
    }
    setIsUnsavedOpen(false);
    setUnsavedTarget(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddKpiOpen) { e.preventDefault(); attemptCloseAddKpi(); }
        else if (editItem) { e.preventDefault(); attemptCloseEditKpi(); }
      }
      if (e.key === 'Enter') {
        if (isAddKpiOpen) { e.preventDefault(); onCreateKpi(); }
        else if (editItem) { e.preventDefault(); onUpdateKpi(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAddKpiOpen, editItem, newKpi, categories]);

  const onDeleteKpi = async () => {
    if (!deleteItem) return;
    try {
      await adminDeleteKpi(deleteItem.id);
      refetch();
      logAudit({ action: 'kpi_delete', details: { id: deleteItem!.id, name: deleteItem!.name } });
      setDeleteItem(null);
    } catch (err: unknown) {
      logger.error(`KPI silinemedi`, err);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Yönetimi Kartı */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Kart Başlık */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <BarChartIcon className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">KPI Yönetimi</h2>
          </div>

          <div className="flex items-center gap-2">
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setIsAddCategoryOpen(true)}
        >
          Kategori Ekle
        </Button>
        <Button onClick={() => { setNewKpi(getDefaultNewKpi()); setNewKpiErrors({}); setIsAddKpiOpen(true); }}>
          + Yeni KPI Ekle
        </Button>
          </div>
        </div>

        {/* Filtre ve İçerik */}
        <div className="p-4">
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Kategori Filtresi</label>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="tümü">Tümü</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Arama</label>
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setSearchTerm(''); }}
                  placeholder="KPI adı ara"
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Durum Filtresi</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="tümü">Tümü</option>
                    <option value="aktif">Aktif</option>
                    <option value="pasif">Pasif</option>
                  </select>
                </div>
                <Button variant="secondary" onClick={clearFilters}>Filtreleri temizle</Button>
              </div>
            </div>
          </div>

          {/* Toplu işlem çubuğu */}
          {selectedIds.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-700">Seçilenler: {selectedIds.length}</div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => bulkSetStatus('aktif')}>Aktif Yap</Button>
                <Button variant="secondary" onClick={() => bulkSetStatus('pasif')}>Pasif Yap</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={confirmBulkDelete}>Sil</Button>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkCategory}
                    onChange={e => setBulkCategory(e.target.value)}
                    className="h-9 rounded-md border border-input bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Button onClick={bulkApplyCategory}>Kategori Değiştir</Button>
                </div>
              </div>
            </div>
          )}

          {/* KPI Tablosu */}
          {isLoadingKpis ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : kpiError ? (
            <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3">
              <div className="text-sm text-red-700">{kpiError}</div>
              <Button variant="secondary" onClick={refetch}>Tekrar dene</Button>
            </div>
          ) : useVirtual ? (
            <div className="relative">
              <div className="sticky top-0 z-10 bg-gray-50 border-b grid grid-cols-[40px,1.6fr,1fr,1fr,1fr,1fr,0.9fr] px-2 py-2">
                <div>
                  <input type="checkbox" checked={isVisibleAllSelected} onChange={toggleSelectAllOnPage} />
                </div>
                <div onClick={() => onSort('name')} className={clsx('cursor-pointer select-none', sortBy === 'name' && 'text-gray-900')}>KPI Adı {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
                <div onClick={() => onSort('category')} className={clsx('cursor-pointer select-none', sortBy === 'category' && 'text-gray-900')}>Kategori {sortBy === 'category' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
                <div>Birim</div>
                <div onClick={() => onSort('status')} className={clsx('cursor-pointer select-none', sortBy === 'status' && 'text-gray-900')}>Durum {sortBy === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
                <div onClick={() => onSort('ytdCalc')} className={clsx('cursor-pointer select-none', sortBy === 'ytdCalc' && 'text-gray-900')}>YTD Hesaplama {sortBy === 'ytdCalc' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</div>
                
                <div className="text-right">İşlemler</div>
              </div>
              <div className="h-[60vh]">
                <React.Suspense fallback={<div className="flex items-center justify-center h-full">Yükleniyor...</div>}>
                  <AutoSizer>
                    {({ width, height }) => (
                      <FixedSizeList 
                        height={height} 
                        width={width} 
                        itemCount={sortedKpis.length} 
                        itemSize={48}
                        children={({ index, style }: VirtualRowProps) => {
                          const item = sortedKpis[index];
                          return (
                            <div style={style} className="grid grid-cols-[40px,1.6fr,1fr,1fr,1fr,1fr,0.9fr] items-center px-2 border-b">
                              <div>
                                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} />
                              </div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div>
                                <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1">{item.category}</span>
                              </div>
                              <div>
                                {String(item.unit).toLowerCase() === 'tl' ? (
                                  <span className="inline-flex items-center gap-1 text-gray-800">
                                    <span aria-hidden>₺</span>
                                    <span>TL</span>
                                  </span>
                                ) : (
                                  item.unit
                                )}
                              </div>
                              <div>
                                <span
                                  className={clsx(
                                    'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                                    item.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                  )}
                                >
                                  {item.status === 'aktif' ? 'AKTİF' : 'PASİF'}
                                </span>
                              </div>
                              <div>{item.ytdCalc === 'ortalama' ? 'Ortalama' : 'Toplam'}{item.monthlyAverage ? ' (Aylık Ort.)' : ''}</div>
                              
                              <div className="text-right">
                                <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" onClick={() => openViewModal(item)} title="Görüntüle">
                        <EyeIcon className="w-5 h-5 text-blue-600" />
                      </Button>
                                  <Button variant="ghost" onClick={() => openEditModal(item)} title="Düzenle">
                                    <EditIcon className="w-5 h-5 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" onClick={() => setDeleteItem(item)} title="Sil">
                                    <TrashIcon className="w-5 h-5 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                    )}
                  </AutoSizer>
                </React.Suspense>
              </div>
            </div>
          ) : (
            <div className="relative max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 sticky top-0 z-10">
                    <TableHead className="w-10">
                      <input type="checkbox" checked={isVisibleAllSelected} onChange={toggleSelectAllOnPage} />
                    </TableHead>
                    <TableHead onClick={() => onSort('name')} className={clsx('cursor-pointer select-none', sortBy === 'name' && 'text-gray-900')}>KPI Adı {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead onClick={() => onSort('category')} className={clsx('cursor-pointer select-none', sortBy === 'category' && 'text-gray-900')}>Kategori {sortBy === 'category' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead>Birim</TableHead>
                    <TableHead onClick={() => onSort('status')} className={clsx('cursor-pointer select-none', sortBy === 'status' && 'text-gray-900')}>Durum {sortBy === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    <TableHead onClick={() => onSort('ytdCalc')} className={clsx('cursor-pointer select-none', sortBy === 'ytdCalc' && 'text-gray-900')}>YTD Hesaplama {sortBy === 'ytdCalc' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                    
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleKpis.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="w-10">
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1">{item.category}</span>
                      </TableCell>
                      <TableCell>
                        {String(item.unit).toLowerCase() === 'tl' ? (
                          <span className="inline-flex items-center gap-1 text-gray-800">
                            <span aria-hidden>₺</span>
                            <span>TL</span>
                          </span>
                        ) : (
                          item.unit
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                            item.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          )}
                        >
                          {item.status === 'aktif' ? 'AKTİF' : 'PASİF'}
                        </span>
                      </TableCell>
                      <TableCell>{item.ytdCalc === 'ortalama' ? 'Ortalama' : 'Toplam'}{item.monthlyAverage ? ' (Aylık Ort.)' : ''}</TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" onClick={() => setViewItem(item)} title="Görüntüle">
                            <EyeIcon className="w-5 h-5 text-blue-600" />
                          </Button>
                          <Button variant="ghost" onClick={() => openEditModal(item)} title="Düzenle">
                            <EditIcon className="w-5 h-5 text-blue-600" />
                          </Button>
                          <Button variant="ghost" onClick={() => setDeleteItem(item)} title="Sil">
                            <TrashIcon className="w-5 h-5 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                  {filteredKpis.length === 0 && (
                    <TableCaption>Seçilen filtreye uygun KPI bulunamadı.</TableCaption>
                  )}
              </Table>
            </div>
          )}

          {/* Sayfalama */}
          {!useVirtual && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Sayfa boyutu:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(parseInt(e.target.value, 10))}
                className="h-9 rounded-md border border-input bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-700">
              Toplam {totalItems} kayıt — Sayfa {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Önceki</Button>
              <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Sonraki</Button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Ekran Resmi butonu (örn. ekran görüntüsü aksiyonu için placeholder) */}
      <Button
        variant="secondary"
        className="fixed bottom-6 left-6"
        onClick={() => logAudit({ action: 'screenshot', details: { page: 'KPI Yönetimi' } })}
      >
        Ekran Resmi
      </Button>

      {/* Modallar */}
      {/* Kategori Ekle */}
      <Modal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} title="Kategori Yönetimi">
        <div className="space-y-6">
          {/* Yeni Kategori Ekleme */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <label className="text-sm font-semibold text-gray-800 block mb-2">Yeni Kategori Ekle</label>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Örn. Satış, Servis, Kiralama..."
                className="flex-1 h-10 rounded-lg border border-blue-200 bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-400 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    onCreateCategory();
                  }
                }}
              />
              <Button 
                onClick={onCreateCategory}
                className="h-10 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                Ekle
              </Button>
            </div>
            {kpiError && <p className="mt-2 text-xs text-red-600 font-medium">{kpiError}</p>}
          </div>

          {/* Mevcut Kategoriler */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-800">Mevcut Kategoriler</label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {categories.length} kategori
              </span>
            </div>
            {categories.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {categories.map((c, idx) => (
                  <div
                    key={`${c}-${idx}`}
                    className={clsx(
                      "group relative bg-white rounded-xl border-2 transition-all duration-200",
                      editingCategoryIndex === idx
                        ? "border-blue-400 shadow-lg shadow-blue-100"
                        : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                    )}
                  >
                    {editingCategoryIndex === idx ? (
                      <div className="p-4 space-y-3">
                        <input
                          value={editingCategoryName}
                          onChange={e => setEditingCategoryName(e.target.value)}
                          className="w-full h-10 rounded-lg border-2 border-blue-400 bg-blue-50 px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingCategoryName.trim()) {
                              saveEditCategory();
                            } else if (e.key === 'Escape') {
                              cancelEditCategory();
                            }
                          }}
                          autoFocus
                        />
                        {editingCategoryError && (
                          <p className="text-xs text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-md">
                            {editingCategoryError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={saveEditCategory}
                            className="flex-1 h-9 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-sm hover:shadow transition-all"
                          >
                            Kaydet
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={cancelEditCategory}
                            className="flex-1 h-9 border-2 border-gray-300 hover:border-gray-400 font-medium transition-all"
                          >
                            İptal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {c.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 truncate">
                              {c}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {kpis.filter(k => k.category === c).length} KPI
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            onClick={() => startEditCategory(idx)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 group/edit"
                            title="Düzenle"
                          >
                            <EditIcon className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => deleteCategoryAt(idx)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 group/delete"
                            title="Sil"
                          >
                            <TrashIcon className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-2">
                  <BarChartIcon className="w-12 h-12 mx-auto opacity-50" />
                </div>
                <p className="text-sm font-medium text-gray-500">Henüz kategori bulunmuyor</p>
                <p className="text-xs text-gray-400 mt-1">Yukarıdaki formdan yeni kategori ekleyebilirsiniz</p>
              </div>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsAddCategoryOpen(false)}
            className="px-6 border-2 border-gray-300 hover:border-gray-400 font-medium transition-all"
          >
            Kapat
          </Button>
        </ModalFooter>
      </Modal>

      {/* Yeni KPI Ekle */}
      <Modal isOpen={isAddKpiOpen} onClose={attemptCloseAddKpi} title="Yeni KPI Ekle">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">KPI Adı</label>
            <input
              value={newKpi.name}
              onChange={e => setNewKpi({ ...newKpi, name: e.target.value })}
              placeholder="Örn. Gizli Müşteri"
              className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {newKpiErrors.name && <p className="mt-1 text-xs text-red-600">{newKpiErrors.name}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Kategori</label>
              <select
                value={newKpi.category}
                onChange={e => setNewKpi({ ...newKpi, category: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Birim</label>
              <div className="flex items-center gap-2">
                <select
                  value={newKpi.unit}
                  onChange={e => {
                    const unit = e.target.value;
                    setNewKpi({ 
                      ...newKpi, 
                      unit,
                    });
                  }}
                  className="flex-1 h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <Button variant="secondary" onClick={() => setIsUnitModalOpen(true)}>Birim Ekle</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Durum</label>
              <select
                value={newKpi.status}
                onChange={e => setNewKpi({ ...newKpi, status: e.target.value as KpiStatus })}
                className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">YTD Hesaplama <span className="ml-2 text-xs text-gray-500" title="Ortalama: aylık değerlerin ortalaması; Toplam: aylık değerlerin toplamı.">?</span></label>
              <select
                value={newKpi.ytdCalc}
                onChange={e => setNewKpi({ ...newKpi, ytdCalc: e.target.value as YtdCalc })}
                className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ortalama">Ortalama</option>
                <option value="toplam">Toplam</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Aylık Ortalama</label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={!!newKpi.monthlyAverage}
                  onChange={e => {
                    const next = e.target.checked;
                    setNewKpi({
                      ...newKpi,
                      monthlyAverage: next,
                      // Aylık Ortalama kapatıldığında ve birim % değilse pay/payda'yı temizle
                      numeratorKpiId: (!next && newKpi.unit !== '%' && !newKpi.averageData) ? undefined : newKpi.numeratorKpiId,
                      denominatorKpiId: (!next && newKpi.unit !== '%' && !newKpi.averageData) ? undefined : newKpi.denominatorKpiId,
                    });
                  }}
                />
                <span className="text-xs text-gray-600">Pay/Payda ile aylık ortalama hesaplanır</span>
              </label>
            </div>
            <div>
              {/* Hesaplama Türü alanı geçici olarak kaldırıldı */}
            </div>
            <div>
              {/* Projeksiyon alanı geçici olarak kaldırıldı */}
            </div>
            {/* GÜNLÜK VERİ GİRİŞİ AYARLARI */}
            <div className="md:col-span-3">
              <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-900 mb-2">GÜNLÜK VERİ GİRİŞİ AYARLARI</div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={!!newKpi.onlyCumulative}
                    onChange={e => setNewKpi({ ...newKpi, onlyCumulative: e.target.checked })}
                  />
                  <span>Sadece Kümülatif Veri</span>
                </label>
                <p className="mt-1 text-xs text-gray-600">Seçildiğinde günlük KPI’larda günlük veri girişi yapılmaz; yalnızca aylık kümülatif değer kaydedilir.</p>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={!!newKpi.hasTargetData}
                      onChange={e => setNewKpi({ ...newKpi, hasTargetData: e.target.checked })}
                    />
                    <span>Hedef Veri</span>
                  </label>
                  {newKpi.hasTargetData && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Hedef Formülü</label>
                      <textarea
                        value={newKpi.targetFormulaText || ''}
                        onChange={e => setNewKpi({ ...newKpi, targetFormulaText: e.target.value })}
                        placeholder="Gerçeklenen hedefin hesaplanacağı KPI formülünü giriniz."
                        className="w-full min-h-[72px] rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="mt-1 text-xs text-gray-600">Hedef veri seçiliyse, hedefin gerçekleşmesini hesaplamak için hangi KPI’lardan veri alındığını formülle belirtiniz.</p>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={!!newKpi.averageData}
                      onChange={e => {
                        const next = e.target.checked;
                        // When disabling average, clear numerator/denominator if unit is not '%'
                        setNewKpi({
                          ...newKpi,
                          averageData: next,
                          numeratorKpiId: (!next && newKpi.unit !== '%') ? undefined : newKpi.numeratorKpiId,
                          denominatorKpiId: (!next && newKpi.unit !== '%') ? undefined : newKpi.denominatorKpiId,
                        });
                      }}
                    />
                    <span>Ortalama Veri (Pay/Payda ile türetilir)</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Seçildiğinde bu KPI günlük verilerden pay/payda oranı ile otomatik hesaplanır. Birim % değilse 100 ile çarpılmaz.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Yüzde, Ortalama Veri ve Aylık Ortalama için Pay/Payda alanları */}
          {(newKpi.unit === '%' || newKpi.averageData || newKpi.monthlyAverage) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Pay KPI</label>
                <select
                  value={newKpi.numeratorKpiId || ''}
                  onChange={e => setNewKpi({ ...newKpi, numeratorKpiId: e.target.value || undefined })}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Seçiniz</option>
                  {kpis.filter(k => k.category === newKpi.category).map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                {newKpiErrors.numeratorKpiId && <p className="mt-1 text-xs text-red-600">{newKpiErrors.numeratorKpiId}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Payda KPI</label>
                <select
                  value={newKpi.denominatorKpiId || ''}
                  onChange={e => setNewKpi({ ...newKpi, denominatorKpiId: e.target.value || undefined })}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Seçiniz</option>
                  {kpis.filter(k => k.category === newKpi.category).map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                {newKpiErrors.denominatorKpiId && <p className="mt-1 text-xs text-red-600">{newKpiErrors.denominatorKpiId}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Kümülatif Kaynaklar</label>
            <select
              multiple
              value={(newKpi.cumulativeSourceIds || []) as any}
              onChange={e => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                let nextTargetFormulaText = newKpi.targetFormulaText || '';
                if (newKpi.hasTargetData) {
                  const namesById = new Map<string, string>();
                  kpis.forEach(k => namesById.set(k.id, k.name));
                  const selectedNames = opts
                    .map(id => namesById.get(id))
                    .filter(Boolean) as string[];
                  nextTargetFormulaText = selectedNames.map(n => `[${n}]`).join(' + ');
                }
                setNewKpi({ ...newKpi, cumulativeSourceIds: opts, targetFormulaText: nextTargetFormulaText });
              }}
              disabled={newKpi.unit === '%' || !!newKpi.averageData}
              className="w-full min-h-24 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {kpis.filter(k => k.category === newKpi.category).map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            {(newKpi.unit === '%' || newKpi.averageData) && <p className="mt-1 text-xs text-gray-500">Yüzde/Ortalama KPI’larda kümülatif kaynak seçimi desteklenmez.</p>}
            {newKpiErrors.cumulativeSourceIds && <p className="mt-1 text-xs text-red-600">{newKpiErrors.cumulativeSourceIds}</p>}
          </div>

          {/* Formül (İsteğe bağlı) alanı kaldırıldı */}

          {/* Hesaplama tipi/Projeksiyon/Formula alanları kaldırıldı */}
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={attemptCloseAddKpi}>İptal</Button>
          <Button onClick={onCreateKpi}>Ekle</Button>
        </ModalFooter>
      </Modal>

      {/* Görüntüle */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="KPI Detay">
        {viewItem && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">Ad:</span> {viewItem.name}</div>
            <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">Kategori:</span> {viewItem.category}</div>
            <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">Birim:</span> {viewItem.unit}</div>
            <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">Durum:</span> {viewItem.status === 'aktif' ? 'Aktif' : 'Pasif'}</div>
            <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">Rapor Sayısı:</span> {viewItem.reportCount}</div>
            <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">YTD Hesaplama:</span> {viewItem.ytdCalc === 'ortalama' ? 'Ortalama' : 'Toplam'}{viewItem.monthlyAverage ? ' (Aylık Ortalama)' : ''}</div>
            {viewItem.target != null && (
              <div className="text-sm text-gray-600"><span className="font-medium text-gray-900">Hedef Değeri:</span> {viewItem.target ?? 'Belirtilmemiş'}</div>
            )}
            {viewItem.unit === '%' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-2">Yüzde Hesaplama</div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">Pay KPI:</span> {
                    viewItem.numeratorKpiId 
                      ? kpis.find(k => k.id === viewItem.numeratorKpiId)?.name || 'Bilinmeyen KPI'
                      : 'Seçilmemiş'
                  }
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">Payda KPI:</span> {
                    viewItem.denominatorKpiId 
                      ? kpis.find(k => k.id === viewItem.denominatorKpiId)?.name || 'Bilinmeyen KPI'
                      : 'Seçilmemiş'
                  }
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Hesaplama: ({viewItem.numeratorKpiId ? kpis.find(k => k.id === viewItem.numeratorKpiId)?.name : 'Pay'} / {viewItem.denominatorKpiId ? kpis.find(k => k.id === viewItem.denominatorKpiId)?.name : 'Payda'}) × 100
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button onClick={() => setViewItem(null)}>Kapat</Button>
        </ModalFooter>
      </Modal>

      {/* Düzenle */}
      <Modal isOpen={!!editItem} onClose={attemptCloseEditKpi} title="KPI Düzenle">
        {editItem && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">KPI Adı</label>
              <input
                value={editItem.name}
                onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {editErrors.name && <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Kategori</label>
                <select
                  value={editItem.category}
                  onChange={e => setEditItem({ ...editItem, category: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Birim</label>
                <select
                  value={editItem.unit}
                  onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {units.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Durum</label>
                <select
                  value={editItem.status}
                  onChange={e => setEditItem({ ...editItem, status: e.target.value as KpiStatus })}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">YTD Hesaplama <span className="ml-2 text-xs text-gray-500" title="Ortalama: aylık değerlerin ortalaması; Toplam: aylık değerlerin toplamı.">?</span></label>
                <select
                  value={editItem.ytdCalc}
                  onChange={e => setEditItem({ ...editItem, ytdCalc: e.target.value as YtdCalc })}
                  className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ortalama">Ortalama</option>
                  <option value="toplam">Toplam</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Aylık Ortalama</label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={!!editItem.monthlyAverage}
                    onChange={e => {
                      const next = e.target.checked;
                      setEditItem({
                        ...editItem,
                        monthlyAverage: next,
                        // Aylık Ortalama kapatıldığında ve birim % değilse pay/payda'yı temizle
                        numeratorKpiId: (!next && editItem.unit !== '%' && !editAverageData) ? undefined : editItem.numeratorKpiId,
                        denominatorKpiId: (!next && editItem.unit !== '%' && !editAverageData) ? undefined : editItem.denominatorKpiId,
                      });
                    }}
                  />
                  <span className="text-xs text-gray-600">Pay/Payda ile aylık ortalama hesaplanır</span>
                </label>
              </div>
              <div>
                {/* Hesaplama Tipi alanı geçici olarak kaldırıldı */}
              </div>
            {/* GÜNLÜK VERİ GİRİŞİ AYARLARI */}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-900 mb-2">GÜNLÜK VERİ GİRİŞİ AYARLARI</div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={!!editItem.onlyCumulative}
                    onChange={e => setEditItem({ ...editItem, onlyCumulative: e.target.checked })}
                  />
                  <span>Sadece Kümülatif Veri</span>
                </label>
                <p className="mt-1 text-xs text-gray-600">Seçildiğinde günlük KPI’larda günlük veri girişi yapılmaz; yalnızca aylık kümülatif değer kaydedilir.</p>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={!!editItem.hasTargetData}
                      onChange={e => setEditItem({ ...editItem, hasTargetData: e.target.checked })}
                    />
                    <span>Hedef Veri</span>
                  </label>
                  {editItem.hasTargetData && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Hedef Formülü</label>
                      <textarea
                        value={editItem.targetFormulaText || ''}
                        onChange={e => setEditItem({ ...editItem, targetFormulaText: e.target.value })}
                        placeholder="Gerçeklenen hedefin hesaplanacağı KPI formülünü giriniz."
                        className="w-full min-h-[72px] rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="mt-1 text-xs text-gray-600">Hedef veri seçiliyse, hedefin gerçekleşmesini hesaplamak için hangi KPI’lardan veri alındığını formülle belirtiniz.</p>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={!!editAverageData}
                      onChange={e => {
                        const next = e.target.checked;
                        setEditAverageData(next);
                        if (!next && editItem.unit !== '%') {
                          setEditItem(prev => prev ? { ...prev, numeratorKpiId: undefined, denominatorKpiId: undefined } : prev);
                        }
                      }}
                    />
                    <span>Ortalama Veri (Pay/Payda ile türetilir)</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-600">Seçildiğinde bu KPI günlük verilerden pay/payda oranı ile otomatik hesaplanır. Birim % değilse 100 ile çarpılmaz.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Projeksiyon alanı geçici olarak kaldırıldı */}
          {/* Hesaplama tipi/Formula/Kümülatif alanları kaldırıldı */}
          {/* Yüzde, Kümülatif ve Formül alanları */}
          <div className="space-y-4 mt-2">
            {(editItem.unit === '%' || editAverageData || editItem.monthlyAverage) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Pay KPI</label>
                  <select
                    value={editItem.numeratorKpiId || ''}
                    onChange={e => setEditItem({ ...editItem, numeratorKpiId: e.target.value || undefined })}
                    className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Seçiniz</option>
                    {kpis.filter(k => k.category === editItem.category).map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                  {editErrors.numeratorKpiId && <p className="mt-1 text-xs text-red-600">{editErrors.numeratorKpiId}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Payda KPI</label>
                  <select
                    value={editItem.denominatorKpiId || ''}
                    onChange={e => setEditItem({ ...editItem, denominatorKpiId: e.target.value || undefined })}
                    className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Seçiniz</option>
                    {kpis.filter(k => k.category === editItem.category).map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                  {editErrors.denominatorKpiId && <p className="mt-1 text-xs text-red-600">{editErrors.denominatorKpiId}</p>}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Kümülatif Kaynaklar</label>
              <select
                multiple
                value={(editItem.cumulativeSourceIds || []) as any}
                onChange={e => {
                  const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                  let nextTargetFormulaText = editItem.targetFormulaText || '';
                  if (editItem.hasTargetData) {
                    const namesById = new Map<string, string>();
                    kpis.forEach(k => namesById.set(k.id, k.name));
                    const selectedNames = opts
                      .map(id => namesById.get(id))
                      .filter(Boolean) as string[];
                    nextTargetFormulaText = selectedNames.map(n => `[${n}]`).join(' + ');
                  }
                  setEditItem({ ...editItem, cumulativeSourceIds: opts, targetFormulaText: nextTargetFormulaText });
                }}
                disabled={editItem.unit === '%' || !!editAverageData}
                className="w-full min-h-24 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {kpis.filter(k => k.category === editItem.category).map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
              {(editItem.unit === '%' || editAverageData) && <p className="mt-1 text-xs text-gray-500">Yüzde/Ortalama KPI’larda kümülatif kaynak seçimi desteklenmez.</p>}
              {editErrors.cumulativeSourceIds && <p className="mt-1 text-xs text-red-600">{editErrors.cumulativeSourceIds}</p>}
            </div>

            {/* Formül (İsteğe bağlı) alanı kaldırıldı */}
          </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={attemptCloseEditKpi}>İptal</Button>
          <Button onClick={onUpdateKpi}>Kaydet</Button>
        </ModalFooter>
      </Modal>

      {/* Birim Yönetimi */}
      <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title="Birim Ekle/Sil">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Yeni Birim</label>
            <input
              value={newUnitName}
              onChange={e => setNewUnitName(e.target.value)}
              placeholder="Örn. Puan"
              className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {kpiError && <p className="mt-1 text-xs text-red-600">{kpiError}</p>}
            <div className="mt-2">
              <Button onClick={onCreateUnit}>Ekle</Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Mevcut Birimler</label>
            {units.length > 0 ? (
              <div className="space-y-2">
                {units.map((u, idx) => (
                  <div key={`${u}-${idx}`} className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{u}</Badge>
                    <Button variant="ghost" onClick={() => setUnitDeleteIndex(idx)} title="Sil">
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Henüz birim bulunmuyor.</p>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button onClick={() => setIsUnitModalOpen(false)}>Kapat</Button>
        </ModalFooter>
      </Modal>

      {/* Birim Sil Onayı */}
      <Modal isOpen={unitDeleteIndex !== null} onClose={() => setUnitDeleteIndex(null)} title="Birim Sil">
        {unitDeleteIndex !== null && (
          <p className="text-sm text-gray-700">“{units[unitDeleteIndex]}” birimini silmek istediğinize emin misiniz?</p>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setUnitDeleteIndex(null)}>Vazgeç</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => unitDeleteIndex !== null && deleteUnitAt(unitDeleteIndex)}>Sil</Button>
        </ModalFooter>
      </Modal>

      {/* Sil Onayı */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="KPI Sil">
        {deleteItem && (
          <p className="text-sm text-gray-700">“{deleteItem.name}” adlı KPI kalıcı olarak silinsin mi?</p>
        )}
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteItem(null)}>Vazgeç</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={onDeleteKpi}>Sil</Button>
        </ModalFooter>
      </Modal>

      {/* Toplu Sil Onayı */}
      <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Toplu Sil">
        <p className="text-sm text-gray-700">Seçili {selectedIds.length} KPI kalıcı olarak silinsin mi?</p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsBulkDeleteOpen(false)}>Vazgeç</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={doBulkDelete}>Sil</Button>
        </ModalFooter>
      </Modal>

      {/* Kaydedilmemiş Değişiklik Uyarısı */}
      <Modal isOpen={isUnsavedOpen} onClose={() => setIsUnsavedOpen(false)} title="Kaydedilmemiş Değişiklikler">
        <p className="text-sm text-gray-700">Kaydetmeden kapatmak üzeresiniz. Devam edilsin mi?</p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsUnsavedOpen(false)}>Vazgeç</Button>
          <Button onClick={proceedUnsavedClose}>Kapat</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}