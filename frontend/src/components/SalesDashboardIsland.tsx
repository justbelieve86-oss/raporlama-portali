import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
// supabase yerine aynı backend API servislerini kullan
import { getUserId } from '../lib/authHelpers';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError, type FriendlyError } from '../lib/errorUtils';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { QueryProvider } from './providers/QueryProvider';
import { api } from '../lib/axiosClient';
import {
  getBrandKpiMappings,
  getKpiDetails,
  getBrandKpiYearlyTargets,
  getKpiCumulativeSources,
  getKpiFormulas,
  getKpiMonthlyReportsForUser,
} from '../services/api';
import type { BrandKpiMapping, KpiDetail, KpiFormula, KpiCumulativeSource, Target, MonthlyReport } from '../types/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import KpiDetailModal from './KpiDetailModal';
import { getListItems } from '../utils/apiList';
import { filterBrandsByCategory } from '../lib/brandCategories';
import type { BrandCategoryKey } from '../lib/brandCategories';
import { logger } from '../lib/logger';
import { parseNumberInput } from '../lib/formatUtils';

type Brand = { id: string; name: string };
  type Kpi = { 
    id: string; 
    name: string; 
    category?: string; 
    unit?: string; 
    ytd_calc?: 'ortalama' | 'toplam';
    calculation_type?: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
    numerator_kpi_id?: string;
    denominator_kpi_id?: string;
    target?: string;
  };

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

// Sortable Table Row Component
function SortableTableRow({ 
  kpi, 
  index, 
  v1, 
  vPrev,
  vPrevPrev,
  pv1, 
  ytdPrev, 
  ytdCurr, 
  tgt, 
  yoy, 
  vsTarget, 
  formatCell, 
  month1, 
  year,
  isFullscreen,
  onKpiClick
}: {
  kpi: Kpi;
  index: number;
  v1: number | null;
  vPrev: number | null;
  vPrevPrev: number | null;
  pv1: number | null;
  ytdPrev: number;
  ytdCurr: number;
  tgt: number | null;
  yoy: number | null;
  vsTarget: number | null;
  formatCell: (value: number | null) => string;
  month1: number;
  year: number;
  isFullscreen: boolean;
  onKpiClick: (kpi: Kpi) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: kpi.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-gray-100 transition-all duration-200 ${
        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
      } ${
        isDragging 
          ? 'shadow-2xl bg-blue-50 border-blue-200 scale-[1.01] transform' 
          : isOver 
            ? 'bg-blue-50 border-blue-200' 
            : 'hover:bg-gray-50'
      }`}
    >
      <td className={isFullscreen ? "py-4 px-6" : "py-2 sm:py-3 px-3 sm:px-4"}>
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0 flex items-center space-x-2">
            {/* Drag Handle */}
            <div 
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 transition-colors"
              title="Sürükleyerek sıralamayı değiştirin"
            >
              <svg className={`text-gray-400 ${isFullscreen ? 'w-4 h-4' : 'w-3 h-3'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
              </svg>
            </div>
            {/* Index Number */}
            <div className={`bg-blue-100 rounded-lg flex items-center justify-center ${isFullscreen ? 'w-8 h-8' : 'w-6 h-6'}`}>
              <span className={`text-blue-600 font-semibold ${isFullscreen ? 'text-sm' : 'text-xs'}`}>{index + 1}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <button 
              onClick={() => onKpiClick(kpi)}
              className={`font-medium text-blue-600 hover:text-blue-800 truncate transition-colors cursor-pointer text-left w-full ${isFullscreen ? 'text-base' : 'text-sm'}`}
              title="Detaylı grafikleri görüntülemek için tıklayın"
            >
              {kpi.name}
            </button>
            <div className="flex items-center gap-1 mt-0.5">
              {kpi.category && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium bg-violet-100 text-violet-800 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                  {kpi.category}
                </span>
              )}
              {kpi.unit && (
                <span className={`text-gray-500 bg-gray-100 px-2 py-0.5 rounded ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                  {kpi.unit}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className="space-y-1">
          <div className={`font-semibold text-gray-900 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{formatCell(v1)}</div>
          {yoy != null && (
            <div className={`font-medium px-1.5 py-0.5 rounded-full ${isFullscreen ? 'text-sm' : 'text-xs'} ${yoy >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {yoy >= 0 ? '↗' : '↘'} {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
            </div>
          )}
        </div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className={`text-gray-600 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{formatCell(vPrev)}</div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className={`text-gray-600 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{formatCell(vPrevPrev)}</div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className={`text-gray-600 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{formatCell(pv1)}</div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className={`font-medium text-gray-900 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{formatCell(tgt)}</div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className={`font-medium text-gray-700 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{ytdPrev.toLocaleString('tr-TR')}</div>
      </td>
      <td className={`text-center ${isFullscreen ? 'py-4 px-4' : 'py-2 sm:py-3 px-2 sm:px-3'}`}>
        <div className="space-y-1">
          <div className={`font-semibold text-gray-900 ${isFullscreen ? 'text-base' : 'text-sm'}`}>{ytdCurr.toLocaleString('tr-TR')}</div>
          {vsTarget != null && (
            <div className={`font-medium px-1.5 py-0.5 rounded-full ${isFullscreen ? 'text-sm' : 'text-xs'} ${vsTarget >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {vsTarget >= 0 ? '🎯' : '⚠️'} {vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(1)}%
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function SalesDashboardIslandContent(props: { categoryFilter?: string; brandCategory?: BrandCategoryKey } = {}) {
  const { categoryFilter, brandCategory } = props;
  const { user } = useCurrentUser();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [error, setError] = useState<FriendlyError | null>(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12 arası
  
  // Bir önceki ayı hesapla (yıl geçişini de dikkate al)
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 1; y++) arr.push(y);
    return arr.reverse();
  }, [currentYear]);
  const [year, setYear] = useState<number>(previousYear);
  const [month1, setMonth1] = useState<number>(previousMonth);
  const [month2, setMonth2] = useState<number>(Math.max(1, now.getMonth()));

  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [valuesCurr, setValuesCurr] = useState<Record<string, Record<number, string>>>({});
  const [valuesPrev, setValuesPrev] = useState<Record<string, Record<number, string>>>({});
  const [cumulativeSources, setCumulativeSources] = useState<Record<string, string[]>>({});
  const [formulaExpressions, setFormulaExpressions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [orderedKpis, setOrderedKpis] = useState<Kpi[]>([]);
  const [isOrderingLoaded, setIsOrderingLoaded] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const userId = getUserId();
  const categoryKey = useMemo(() => String(categoryFilter || '').trim().toLowerCase(), [categoryFilter]);
  const orderStorageKey = useMemo(() => `kpi-ordering:${userId || 'anon'}:${brandId}:${categoryKey}`,[userId, brandId, categoryKey]);
  
  // Modal state for KPI details
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // KPI click handler
  const handleKpiClick = useCallback((kpi: Kpi) => {
    setSelectedKpi(kpi);
    setIsModalOpen(true);
  }, [brandCategory]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedKpi(null);
  }, []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenElement, setFullscreenElement] = useState<HTMLElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setError(null);
        // Axios istemcisi ile markaları yükle (Authorization otomatik eklenir)
        const cat = brandCategory || 'satis-markalari';
        const { data } = await api.get('/brands', { params: { brandCategory: cat } });
        const listInitial: Brand[] = Array.isArray(data?.data?.items) ? data.data.items : [];
        let list: Brand[] = listInitial;
        if ((cat ?? '').trim() && listInitial.length === 0) {
          // Backend filtreli boş dönerse, filtresiz listeyi alıp istemci tarafında uygula
          const { data: data2 } = await api.get('/brands');
          const list2: Brand[] = Array.isArray(data2?.data?.items) ? data2.data.items : [];
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
        // 401 durumunda oturumu temizleyip login'e yönlendir
        if (e?.response?.status === 401) {
          setBrands([]);
          setError(toUserFriendlyError(new Error('Oturum geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.')));
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user_role');
            } catch {}
            setTimeout(() => { try { window.location.href = '/login?message=Oturum%20süresi%20dolmuş'; } catch {} }, 800);
          }
          return;
        }
        setError(toUserFriendlyError(e));
      }
    };
    loadBrands();
  }, []);

  // Load user's KPI ordering preferences
  async function loadKpiOrdering() {
    if (!brandId || !user) return;
    try {
      const { data } = await api.get(`/kpi-ordering/${brandId}`);
      const rows: Array<{ kpi_id: string; order_index: number }> = getListItems<{ kpi_id: string; order_index: number }>(data);
      if (rows.length > 0) {
        // Create a map of kpi_id to order_index
        const orderMap = new Map();
        rows.forEach((item: { kpi_id: string; order_index: number }) => {
          orderMap.set(item.kpi_id, item.order_index);
        });
        
        // Sort KPIs based on saved ordering
        const orderedKpiList = [...kpis].sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? 999;
          const orderB = orderMap.get(b.id) ?? 999;
          return orderA - orderB;
        });
        
        setOrderedKpis(orderedKpiList);
        try { localStorage.setItem(orderStorageKey, JSON.stringify(orderedKpiList.map(k => k.id))); } catch {}
      } else {
        // No saved ordering, initialize with default order
        setOrderedKpis(kpis);
        await initializeKpiOrdering();
        try { localStorage.setItem(orderStorageKey, JSON.stringify(kpis.map(k => k.id))); } catch {}
      }
      setIsOrderingLoaded(true);
    } catch (error) {
      logger.error('Error loading KPI ordering', error);
      // Fallback to default order
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(orderStorageKey) : null;
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          const idToKpi = new Map(kpis.map(k => [k.id, k] as const));
          const orderedFromStorage = ids.map(id => idToKpi.get(id)).filter(Boolean) as Kpi[];
          const leftover = kpis.filter(k => !ids.includes(k.id));
          setOrderedKpis([...orderedFromStorage, ...leftover]);
        } else {
          setOrderedKpis(kpis);
        }
      } catch {
        setOrderedKpis(kpis);
      }
      setIsOrderingLoaded(true);
    }
  }

  // Initialize default KPI ordering
  async function initializeKpiOrdering() {
    if (!brandId || !user) return;
    try {
      await api.post(`/kpi-ordering/${brandId}/initialize`);
      logger.debug('KPI ordering initialized for brand', { brandId });
      setOrderedKpis(kpis);
    } catch (error) {
      logger.error('Error initializing KPI ordering', error);
      setOrderedKpis(kpis);
    }
  }

  // Save KPI ordering preferences
  async function saveKpiOrdering(newOrderedKpis: Kpi[]) {
    logger.debug('saveKpiOrdering başladı', { brandId, newOrderedKpis: newOrderedKpis.map(k => k.id) });
    if (!brandId || !user) {
      logger.warn('saveKpiOrdering: brandId veya user eksik, işlem iptal edildi');
      return;
    }
    try {
      const orderData = newOrderedKpis.map((kpi, index) => ({
        kpi_id: kpi.id,
        order_index: index
      }));
      const payload = { kpiOrdering: orderData };
      logger.debug('Gönderilecek payload', { payload, endpoint: `/kpi-ordering/${brandId}` });
      await api.put(`/kpi-ordering/${brandId}`, payload);
      logger.debug('KPI ordering başarıyla kaydedildi');
      try { 
        localStorage.setItem(orderStorageKey, JSON.stringify(newOrderedKpis.map(k => k.id)));
        logger.debug('localStorage güncellendi', { orderStorageKey });
      } catch (lsErr) {
        logger.error('localStorage kaydetme hatası', lsErr);
      }
    } catch (error: unknown) {
      logger.error('KPI ordering kaydedilemedi', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: unknown; status?: number; headers?: unknown } };
        logger.error('Hata yanıtı', { data: apiError.response?.data, status: apiError.response?.status, headers: apiError.response?.headers });
      }
      setError(toUserFriendlyError(error as Error));
      // Persist locally so refresh keeps the new order even if backend failed
      try { 
        localStorage.setItem(orderStorageKey, JSON.stringify(newOrderedKpis.map(k => k.id)));
        logger.debug('localStorage (hata durumunda) güncellendi', { orderStorageKey });
      } catch (lsErr) {
        logger.error('localStorage kaydetme hatası (hata durumu)', lsErr);
      }
    }
  }

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = orderedKpis.findIndex((kpi) => kpi.id === active.id);
      const newIndex = orderedKpis.findIndex((kpi) => kpi.id === over?.id);

      const newOrderedKpis = arrayMove(orderedKpis, oldIndex, newIndex);
      setOrderedKpis(newOrderedKpis);

      // Save the new order to backend with loading state
      setIsSavingOrder(true);
      try {
        await saveKpiOrdering(newOrderedKpis);
      } catch (error) {
        logger.error('Failed to save KPI ordering', error);
        // Revert the order on error
        setOrderedKpis(orderedKpis);
      } finally {
        setIsSavingOrder(false);
      }
    }
  }

  const loadDashboard = useCallback(async () => {
    if (!brandId) return;
    try {
      setLoading(true);
      setError(null);
      const userId = await getUserId();
      if (!userId) {
        setError(toUserFriendlyError(new Error('Oturum bulunamadı.')));
        return;
      }

      // Seçili markaya ait KPI id'lerini backend API üzerinden al
      const mappings = await getBrandKpiMappings(brandId);
      const kpiIds = (mappings || []).map((r: BrandKpiMapping) => String(r.kpi_id));

      if (!kpiIds.length) {
        setKpis([]);
        setTargets({});
        setValuesCurr({});
        setValuesPrev({});
        return;
      }

      // KPI detaylarını API'dan getir
      let nextKpis: Kpi[] = (await getKpiDetails(kpiIds)).map((r: KpiDetail) => ({ 
        id: String(r.id), 
        name: String(r.name), 
        category: r.category, 
        unit: r.unit, 
        ytd_calc: r.ytd_calc,
        calculation_type: r.calculation_type || 'direct',
        numerator_kpi_id: r.numerator_kpi_id ? String(r.numerator_kpi_id) : undefined,
        denominator_kpi_id: r.denominator_kpi_id ? String(r.denominator_kpi_id) : undefined,
        target: r.target == null ? undefined : String(r.target),
      }));
      
      // Kategori filtresi - BrandKpiListIsland ile aynı mantık
      if (categoryFilter) {
        // Normalize function for case-insensitive and trim-aware string comparison
        const normalize = (s: string | undefined | null): string => String(s || '').trim().toLowerCase();
        
        // İlk önce tam kategori eşleşmesi dene
        let filtered = nextKpis.filter(kpi => {
          const kpiCategory = String(kpi.category || '').trim();
          return kpiCategory === categoryFilter;
        });
        
        // Eğer tam eşleşme yoksa, normalize edilmiş eşleşme dene
        if (filtered.length === 0) {
          filtered = nextKpis.filter(kpi => {
            const kpiCategory = normalize(kpi.category || '');
            const filterCategory = normalize(categoryFilter);
            return kpiCategory === filterCategory;
          });
        }
        
        // Hala eşleşme yoksa, esnek eşleştirme yap (kategori adında anahtar kelime ara)
        if (filtered.length === 0) {
          const categoryKeywords: Record<string, string[]> = {
            'Satış': ['satış', 'sales'],
            'Satış - Aylık KPI': ['satış', 'sales', 'aylık'],
            'Servis': ['servis', 'service'],
            'Servis - Aylık KPI': ['servis', 'service', 'aylık'],
            'Kiralama': ['kiralama', 'rental'],
            'Kiralama - Aylık KPI': ['kiralama', 'rental', 'aylık'],
            'İkinci El': ['ikinci el', '2. el', 'second hand', 'second-hand'],
            'İkinci El - Aylık KPI': ['ikinci el', '2. el', 'second hand', 'second-hand', 'aylık'],
            'Ekspertiz': ['ekspertiz', 'expertise'],
            'Ekspertiz - Aylık KPI': ['ekspertiz', 'expertise', 'aylık'],
          };
          
          const selectedKeywords = categoryKeywords[categoryFilter] || [normalize(categoryFilter)];
          
          filtered = nextKpis.filter(k => {
            const kCategory = normalize(k.category || '');
            // Seçilen kategori anahtar kelimeleriyle eşleşiyor mu?
            return selectedKeywords.some(keyword => kCategory.includes(keyword));
          });
        }
        
        nextKpis = filtered;
      }
      setKpis(nextKpis);

      const kpiIdsToUse = nextKpis.map(k => k.id);

      // Load formula expressions for formula KPIs and collect referenced KPI ids
      const formulaKpiIds = nextKpis.filter(k => k.calculation_type === 'formula').map(k => k.id);
      let formulaMap: Record<string, string> = {};
      let referencedIds: string[] = [];
      if (formulaKpiIds.length > 0) {
        const fRows = await getKpiFormulas(formulaKpiIds);
        (fRows || []).forEach((r: KpiFormula) => {
          const kId = String(r.kpi_id);
          const expr = String(r.expression || '').trim();
          if (expr) {
            formulaMap[kId] = expr;
            const re = /\{\{([^}]+)\}\}/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(expr)) !== null) {
              const refId = String(m[1]).trim();
              if (refId && !referencedIds.includes(refId)) referencedIds.push(refId);
            }
          }
        });
      }
      setFormulaExpressions(formulaMap);

      const allKpiIdsForValues = Array.from(new Set([...kpiIdsToUse, ...referencedIds]));
      if (!kpiIdsToUse.length) {
        setTargets({});
        setValuesCurr({});
        setValuesPrev({});
        setCumulativeSources({});
        return;
      }

      // Load cumulative sources for cumulative KPIs
      const cumulativeKpiIds = nextKpis.filter(k => k.calculation_type === 'cumulative').map(k => k.id);
      if (cumulativeKpiIds.length > 0) {
        const cumRows = await getKpiCumulativeSources(cumulativeKpiIds);
        const map: Record<string, string[]> = {};
        (cumRows || []).forEach((r: KpiCumulativeSource) => {
          const kId = String(r.kpi_id);
          const sId = String(r.source_kpi_id);
          if (!map[kId]) map[kId] = [];
          map[kId].push(sId);
        });
        setCumulativeSources(map);
      } else {
        setCumulativeSources({});
      }

      // Targets for current year
      const targetRows = await getBrandKpiYearlyTargets(brandId, year, kpiIdsToUse);
      const nextTargets: Record<string, string> = {};
      (targetRows || []).forEach((r: Target) => { nextTargets[String(r.kpi_id)] = r.target == null ? '' : String(r.target); });
      // Override target-type KPIs to use fixed target from kpis table
      nextKpis.forEach(k => {
        if (k.calculation_type === 'target') {
          nextTargets[k.id] = k.target == null ? '' : String(k.target);
        } else if (!(k.id in nextTargets)) {
          nextTargets[k.id] = '';
        }
      });
      setTargets(nextTargets);

      // Monthly values for current year and previous year - optimized single queries
      const currentValues: Record<string, Record<number, string>> = {};
      const prevValues: Record<string, Record<number, string>> = {};
      
      // Initialize empty maps for all KPIs (including referenced formula sources)
      allKpiIdsForValues.forEach(kid => {
        currentValues[kid] = {};
        prevValues[kid] = {};
      });

      // Fetch all current year reports in a single query
      const currReports = await getKpiMonthlyReportsForUser(brandId, year, allKpiIdsForValues);
      
      // Group current year data by KPI
      (currReports || []).forEach((r: MonthlyReport) => {
        const kpiId = String(r.kpi_id);
        const month = Number(r.month);
        const value = String(r.value ?? '');
        if (currentValues[kpiId]) {
          currentValues[kpiId][month] = value;
        }
      });

      // Fetch all previous year reports in a single query
      const prevReports = await getKpiMonthlyReportsForUser(brandId, year - 1, allKpiIdsForValues);
      
      // Group previous year data by KPI
      (prevReports || []).forEach((r: MonthlyReport) => {
        const kpiId = String(r.kpi_id);
        const month = Number(r.month);
        const value = String(r.value ?? '');
        if (prevValues[kpiId]) {
          prevValues[kpiId][month] = value;
        }
      });
      setValuesCurr(currentValues);
      setValuesPrev(prevValues);
    } catch (e: unknown) {
      setError(toUserFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [brandId, year, month1, month2, categoryFilter]);

  // Load KPI ordering after KPIs are loaded
  useEffect(() => {
    if (kpis.length > 0 && !isOrderingLoaded) {
      loadKpiOrdering();
    }
  }, [kpis, isOrderingLoaded, brandId]);

  useEffect(() => {
    if (brandId) {
      setIsOrderingLoaded(false); // Reset ordering state when brand changes
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, year, month1, month2, categoryFilter]);

  // Fullscreen API functions
  const enterFullscreen = async (element: HTMLElement) => {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      setFullscreenElement(element);
      setIsFullscreen(true);
    } catch (error) {
      logger.error('Fullscreen request failed', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      logger.error('Exit fullscreen failed', error);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (!isCurrentlyFullscreen && isFullscreen) {
        setIsFullscreen(false);
        setFullscreenElement(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  function computeYtdForYear(kpi: Kpi, targetYear: number): number {
    // Yüzde KPI'ları için özel hesaplama
    if (kpi.calculation_type === 'percentage' && kpi.numerator_kpi_id && kpi.denominator_kpi_id) {
      return computePercentageYtd(kpi, targetYear);
    }
    // Kümülatif KPI'lar için özel hesaplama
    if (kpi.calculation_type === 'cumulative') {
      return computeCumulativeYtd(kpi, targetYear);
    }
    // Formül KPI'ları için özel hesaplama
    if (kpi.calculation_type === 'formula') {
      return computeFormulaYtd(kpi, targetYear);
    }
    // Hedef KPI'lar için YTD hesaplanmaz
    if (kpi.calculation_type === 'target') {
      return 0;
    }
    
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    const vals = dict[kpi.id] || {};
    const monthsUpTo = targetYear === currentYear ? (now.getMonth() + 1) : 12;
    const arr: number[] = [];
    for (let m = 1; m <= monthsUpTo; m++) {
      const v = vals[m];
      if (v !== undefined && v !== '') {
        const n = parseNumberInput(String(v)) ?? 0;
        if (!Number.isNaN(n)) arr.push(n);
      }
    }
    if (arr.length === 0) return 0;
    if (kpi.ytd_calc === 'toplam') return arr.reduce((a, b) => a + b, 0);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function computePercentageYtd(kpi: Kpi, targetYear: number): number {
    if (!kpi.numerator_kpi_id || !kpi.denominator_kpi_id) return 0;
    
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    const monthsUpTo = targetYear === currentYear ? (now.getMonth() + 1) : 12;
    
    const numeratorVals = dict[kpi.numerator_kpi_id] || {};
    const denominatorVals = dict[kpi.denominator_kpi_id] || {};
    
    let totalNumerator = 0;
    let totalDenominator = 0;
    let validMonths = 0;
    
    for (let m = 1; m <= monthsUpTo; m++) {
      const numVal = numeratorVals[m];
      const denVal = denominatorVals[m];
      
      if (numVal !== undefined && numVal !== '' && denVal !== undefined && denVal !== '') {
        const numN = parseNumberInput(String(numVal)) ?? 0;
        const denN = parseNumberInput(String(denVal)) ?? 0;
        
        if (!Number.isNaN(numN) && !Number.isNaN(denN) && denN !== 0) {
          totalNumerator += numN;
          totalDenominator += denN;
          validMonths++;
        }
      }
    }
    
    if (validMonths === 0 || totalDenominator === 0) return 0;
    const raw = (totalNumerator / totalDenominator);
    const isPercentUnit = String(kpi.unit || '').trim() === '%';
    return isPercentUnit ? (raw * 100) : raw;
  }

  function computeCumulativeYtd(kpi: Kpi, targetYear: number): number {
    const sources = cumulativeSources[kpi.id] || [];
    if (!sources.length) return 0;
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    const monthsUpTo = targetYear === currentYear ? (now.getMonth() + 1) : 12;
    const arr: number[] = [];
    for (let m = 1; m <= monthsUpTo; m++) {
      let sum = 0;
      let hasAny = false;
      for (const sid of sources) {
        const v = dict[sid]?.[m];
        if (v !== undefined && v !== '') {
          const n = Number(String(v).replace(',', '.'));
          if (!Number.isNaN(n)) {
            sum += n;
            hasAny = true;
          }
        }
      }
      if (hasAny) arr.push(sum);
    }
    if (arr.length === 0) return 0;
    if (kpi.ytd_calc === 'toplam') return arr.reduce((a, b) => a + b, 0);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function computePercentageValue(kpi: Kpi, month: number, targetYear: number): string {
    if (!kpi.numerator_kpi_id || !kpi.denominator_kpi_id) return '';
    
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    const numeratorVals = dict[kpi.numerator_kpi_id] || {};
    const denominatorVals = dict[kpi.denominator_kpi_id] || {};
    
    const numVal = numeratorVals[month];
    const denVal = denominatorVals[month];
    
    if (numVal === undefined || numVal === '' || denVal === undefined || denVal === '') {
      return '';
    }
    
    const numN = parseNumberInput(String(numVal)) ?? 0;
    const denN = parseNumberInput(String(denVal)) ?? 0;
    
    if (Number.isNaN(numN) || Number.isNaN(denN) || denN === 0) {
      return '';
    }
    
    const val = (numN / denN);
    const isPercentUnit = String(kpi.unit || '').trim() === '%';
    const scaled = isPercentUnit ? (val * 100) : val;
    return scaled.toFixed(2);
  }

  function computeCumulativeValue(kpi: Kpi, month: number, targetYear: number): string {
    const sources = cumulativeSources[kpi.id] || [];
    if (!sources.length) return '';
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    let sum = 0;
    let hasAny = false;
    for (const sid of sources) {
      const v = dict[sid]?.[month];
      if (v !== undefined && v !== '') {
        const n = Number(String(v).replace(',', '.'));
        if (!Number.isNaN(n)) {
          sum += n;
          hasAny = true;
        }
      }
    }
    return hasAny ? String(sum) : '';
  }

  // --- Formula KPI evaluation helpers ---
  function getMonthlyNumeric(dict: Record<string, Record<number, string>>, kpiId: string, month: number): number | null {
    const raw = dict[kpiId]?.[month];
    if (raw == null || raw === '') return null;
    const n = parseNumberInput(String(raw)) ?? 0;
    return Number.isNaN(n) ? null : n;
  }

  function evaluateArithmeticExpression(expr: string): number | null {
    // Tokenize numbers, operators (+ - * /), parentheses
    const tokens: (string | number)[] = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
      if ('+-*/()'.includes(ch)) { tokens.push(ch); i++; continue; }
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        let j = i + 1;
        while (j < expr.length) {
          const cj = expr[j];
          if ((cj >= '0' && cj <= '9') || cj === '.') j++; else break;
        }
        const numStr = expr.slice(i, j);
        const num = Number(numStr);
        if (!Number.isFinite(num)) return null;
        tokens.push(num);
        i = j;
        continue;
      }
      // Unknown character -> invalid
      return null;
    }

    const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const output: (number | string)[] = [];
    const ops: string[] = [];
    const isOp = (t: unknown): t is '+' | '-' | '*' | '/' => typeof t === 'string' && ['+', '-', '*', '/'].includes(t);
    for (const t of tokens) {
      if (typeof t === 'number') {
        output.push(t);
      } else if (t === '(') {
        ops.push(t);
      } else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') {
          output.push(ops.pop() as string);
        }
        if (!ops.length) return null; // mismatched parens
        ops.pop(); // remove '('
      } else if (isOp(t)) {
        while (ops.length && isOp(ops[ops.length - 1]) && prec[ops[ops.length - 1]] >= prec[t]) {
          output.push(ops.pop() as string);
        }
        ops.push(t);
      } else {
        return null;
      }
    }
    while (ops.length) {
      const op = ops.pop() as string;
      if (op === '(' || op === ')') return null; // mismatched
      output.push(op);
    }

    const stack: number[] = [];
    for (const tt of output) {
      if (typeof tt === 'number') {
        stack.push(tt);
      } else if (isOp(tt)) {
        if (stack.length < 2) return null;
        const b = stack.pop() as number;
        const a = stack.pop() as number;
        let r: number;
        switch (tt) {
          case '+': r = a + b; break;
          case '-': r = a - b; break;
          case '*': r = a * b; break;
          case '/': if (b === 0) return null; r = a / b; break;
          default: return null;
        }
        stack.push(r);
      } else {
        return null;
      }
    }
    if (stack.length !== 1) return null;
    const res = stack[0];
    if (!Number.isFinite(res)) return null;
    return res;
  }

  function computeFormulaValue(kpi: Kpi, month: number, targetYear: number): string {
    const expr = formulaExpressions[kpi.id];
    if (!expr) return '';
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    let missing = false;
    const numericExpr = expr.replace(/\{\{([^}]+)\}\}/g, (_, id: string) => {
      const v = getMonthlyNumeric(dict, String(id), month);
      if (v == null) { missing = true; return '0'; }
      return String(v);
    });
    if (missing) return '';
    const val = evaluateArithmeticExpression(numericExpr);
    return val == null ? '' : String(val);
  }

  function computeFormulaYtd(kpi: Kpi, targetYear: number): number {
    const expr = formulaExpressions[kpi.id];
    if (!expr) return 0;
    const dict = targetYear === year ? valuesCurr : valuesPrev;
    const monthsUpTo = targetYear === currentYear ? (now.getMonth() + 1) : 12;
    const arr: number[] = [];
    for (let m = 1; m <= monthsUpTo; m++) {
      let missing = false;
      const numericExpr = expr.replace(/\{\{([^}]+)\}\}/g, (_, id: string) => {
        const v = getMonthlyNumeric(dict, String(id), m);
        if (v == null) { missing = true; return '0'; }
        return String(v);
      });
      if (missing) continue; // skip months with missing inputs
      const val = evaluateArithmeticExpression(numericExpr);
      if (val != null && Number.isFinite(val)) arr.push(val);
    }
    if (!arr.length) return 0;
    if (kpi.ytd_calc === 'toplam') return arr.reduce((a, b) => a + b, 0);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  const formatCell = useCallback((val?: string) => {
    const n = val == null || val === '' ? null : parseNumberInput(String(val));
    return n == null || Number.isNaN(n) ? '-' : n.toLocaleString('tr-TR');
  }, []);

  /**
   * YoY (Year over Year) hesaplama fonksiyonu
   * Bu fonksiyon TÜM KPI'lar için geçen yılın aynı ayına göre yüzdelik değişimi hesaplar
   * 
   * @param a - Bu yılın değeri (current year value)
   * @param b - Geçen yılın aynı ayının değeri (previous year same month value)
   * @returns Yüzdelik değişim (percentage change) veya null (veri yoksa)
   * 
   * Formül: ((bu_yil - gecen_yil) / gecen_yil) * 100
   * Örnek: Bu yıl 1200, geçen yıl 1000 → ((1200-1000)/1000)*100 = %20 artış
   */
  function trendPct(a?: string, b?: string): number | null {
    const na = a == null || a === '' ? null : parseNumberInput(String(a));
    const nb = b == null || b === '' ? null : parseNumberInput(String(b));
    if (na == null || nb == null || nb === 0) return null;
    return ((na - nb) / nb) * 100;
  }



  return (
    <div className="space-y-2">

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 sm:p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-blue-600 text-xs">⚙️</span>
          <h2 className="text-sm font-medium text-gray-700">Filtreler</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          <div>
            <div className="text-xs sm:text-sm text-slate-500 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">🏷️</span> Marka</div>
            <select
              value={brandId}
              onChange={(e) => {
                const id = e.target.value;
                setBrandId(id);
                try { localStorage.setItem('selectedBrandId', id); } catch {}
              }}
              className="w-full min-w-[200px] h-9 px-2 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              aria-label="Marka"
            >
              {brands.length === 0 && !error && <option>Marka bulunamadı</option>}
              {error && <option>{error.message}</option>}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-slate-500 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">📅</span> Yıl</div>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full min-w-[120px] h-9 px-2 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              aria-label="Yıl"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-slate-500 mb-1 flex items-center gap-1"><span className="text-blue-600 text-xs">📆</span> 1. Ay</div>
            <select
              value={month1}
              onChange={(e) => setMonth1(parseInt(e.target.value, 10))}
              className="w-full min-w-[160px] h-9 px-2 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              aria-label="1. Ay"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadDashboard}
              className="w-full inline-flex items-center justify-center h-9 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              title="Verileri Yenile"
            >
              <span className="text-sm font-medium">⚡ Yenile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-2 py-1.5 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-white/15 rounded">
              <span className="text-sm">📊</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">KPI Performans Tablosu</h1>
              <p className="text-xs text-blue-100">Sürükleyerek sıralamayı özelleştirin</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isSavingOrder && (
              <div className="flex items-center gap-1 text-xs text-blue-100">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Kaydediliyor...
              </div>
            )}
            <button
              onClick={() => {
                if (tableContainerRef.current) {
                  enterFullscreen(tableContainerRef.current);
                }
              }}
              className="p-1.5 bg-white/15 hover:bg-white/25 rounded transition-colors duration-200 group"
              title="Tam Ekran"
            >
              <svg className="w-4 h-4 text-white group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <div className="text-xs bg-white/15 px-3 py-1 rounded-full font-medium">{orderedKpis.length} KPI</div>
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="min-w-[960px] w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-sm font-semibold text-gray-700">KPI</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{MONTHS[month1-1]} {year}</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{MONTHS[month1-2 < 0 ? 11 : month1-2]} {month1-1 <= 0 ? year-1 : year}</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{MONTHS[month1-3 <= 0 ? 12 + (month1-3) : month1-3]} {month1-2 <= 0 ? year-1 : year}</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{MONTHS[month1-1]} {year-1}</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{year} Hedef</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{year-1} YTD</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-sm font-semibold text-gray-700">{year} YTD</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 sm:py-3 px-3 sm:px-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    {[...Array(7)].map((_, cellIndex) => (
                      <td key={cellIndex} className="py-2 sm:py-3 px-2 sm:px-3 text-center">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-12"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorAlert
              title="Veriler yüklenemedi"
              message={error.message}
              details={error.code ? `Kod: ${error.code}` : undefined}
              onRetry={loadDashboard}
            />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div 
              ref={tableContainerRef} 
              className={`overflow-x-auto -mx-3 sm:mx-0 ${isFullscreen ? 'h-screen bg-white p-8 flex flex-col' : ''}`}
            >
              {isFullscreen && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">KPI Performans Tablosu</h1>
                      <p className="text-gray-600">Tam Ekran Görünümü • ESC ile çıkış yapabilirsiniz</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
                      {orderedKpis.length} KPI
                    </div>
                    <button
                      onClick={exitFullscreen}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 group"
                      title="Tam Ekrandan Çık"
                    >
                      <svg className="w-6 h-6 text-gray-700 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <table className={`min-w-[960px] w-full ${isFullscreen ? 'text-base' : 'text-xs sm:text-sm'} ${isFullscreen ? 'flex-1' : ''}`}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className={`text-left font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-6 text-base' : 'py-2 sm:py-3 px-3 sm:px-4 text-sm'}`}>KPI</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{MONTHS[month1-1]} {year}</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{MONTHS[month1-2 < 0 ? 11 : month1-2]} {month1-1 <= 0 ? year-1 : year}</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{MONTHS[month1-3 <= 0 ? 12 + (month1-3) : month1-3]} {month1-2 <= 0 ? year-1 : year}</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{MONTHS[month1-1]} {year-1}</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{year} Hedef</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{year-1} YTD</th>
                    <th className={`text-center font-semibold text-gray-700 ${isFullscreen ? 'py-4 px-4 text-base' : 'py-2 sm:py-3 px-2 sm:px-3 text-sm'}`}>{year} YTD</th>
                  </tr>
                </thead>
                <SortableContext items={orderedKpis.map(kpi => kpi.id)} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {orderedKpis.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-slate-500 py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-gray-100 rounded-full">
                              <span className="text-3xl">📊</span>
                            </div>
                            <div>
                              <p className="text-lg font-medium">Seçili markaya ait aktif KPI bulunmuyor</p>
                              <p className="text-sm text-gray-400">Lütfen farklı bir marka seçin veya KPI ekleyin</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orderedKpis.map((kpi, index) => {
                        // Yüzde KPI'ları için özel hesaplama
                        let v1, vPrev, vPrevPrev, pv1;
                        
                        if (kpi.calculation_type === 'percentage' && kpi.numerator_kpi_id && kpi.denominator_kpi_id) {
                          // Yüzde KPI'ları için hesaplanan değerler
                          v1 = computePercentageValue(kpi, month1, year);
                          
                          const vPrevMonth = month1 - 1 <= 0 ? 12 : month1 - 1;
                          const vPrevYear = month1 - 1 <= 0 ? year - 1 : year;
                          vPrev = computePercentageValue(kpi, vPrevMonth, vPrevYear);
                          
                          const vPrevPrevMonth = month1 - 2 <= 0 ? (month1 - 2 <= -1 ? 12 + (month1 - 2) : 11) : month1 - 2;
                          const vPrevPrevYear = month1 - 2 <= 0 ? year - 1 : year;
                          vPrevPrev = computePercentageValue(kpi, vPrevPrevMonth, vPrevPrevYear);
                          
                          pv1 = computePercentageValue(kpi, month1, year - 1); // Geçen yılın aynı ayının değeri
                        } else if (kpi.calculation_type === 'cumulative') {
                          // Kümülatif KPI'lar için hesaplanan değerler
                          v1 = computeCumulativeValue(kpi, month1, year);

                          const vPrevMonth = month1 - 1 <= 0 ? 12 : month1 - 1;
                          const vPrevYear = month1 - 1 <= 0 ? year - 1 : year;
                          vPrev = computeCumulativeValue(kpi, vPrevMonth, vPrevYear);

                          const vPrevPrevMonth = month1 - 2 <= 0 ? (month1 - 2 <= -1 ? 12 + (month1 - 2) : 11) : month1 - 2;
                          const vPrevPrevYear = month1 - 2 <= 0 ? year - 1 : year;
                          vPrevPrev = computeCumulativeValue(kpi, vPrevPrevMonth, vPrevPrevYear);

                          pv1 = computeCumulativeValue(kpi, month1, year - 1); // Geçen yılın aynı ayının değeri
                        } else if (kpi.calculation_type === 'formula') {
                          // Formül KPI'ları için hesaplanan değerler
                          v1 = computeFormulaValue(kpi, month1, year);

                          const vPrevMonth = month1 - 1 <= 0 ? 12 : month1 - 1;
                          const vPrevYear = month1 - 1 <= 0 ? year - 1 : year;
                          vPrev = computeFormulaValue(kpi, vPrevMonth, vPrevYear);

                          const vPrevPrevMonth = month1 - 2 <= 0 ? (month1 - 2 <= -1 ? 12 + (month1 - 2) : 11) : month1 - 2;
                          const vPrevPrevYear = month1 - 2 <= 0 ? year - 1 : year;
                          vPrevPrev = computeFormulaValue(kpi, vPrevPrevMonth, vPrevPrevYear);

                          pv1 = computeFormulaValue(kpi, month1, year - 1); // Geçen yılın aynı ayının değeri
                        } else if (kpi.calculation_type === 'target') {
                          // Hedef KPI'larda aylık değer gösterilmez
                          v1 = '';
                          vPrev = '';
                          vPrevPrev = '';
                          pv1 = '';
                        } else {
                          // Normal KPI'lar için mevcut hesaplama
                          const currMap = valuesCurr[kpi.id] || {};
                          const prevMap = valuesPrev[kpi.id] || {};
                          v1 = currMap[month1];
                          
                          const vPrevMonth = month1 - 1 <= 0 ? 12 : month1 - 1;
                          const vPrevYear = month1 - 1 <= 0 ? year - 1 : year;
                          const vPrevMap = vPrevYear === year ? currMap : (valuesPrev[kpi.id] || {});
                          vPrev = vPrevMap[vPrevMonth];
                          
                          const vPrevPrevMonth = month1 - 2 <= 0 ? (month1 - 2 <= -1 ? 12 + (month1 - 2) : 11) : month1 - 2;
                          const vPrevPrevYear = month1 - 2 <= 0 ? year - 1 : year;
                          const vPrevPrevMap = vPrevPrevYear === year ? currMap : (valuesPrev[kpi.id] || {});
                          vPrevPrev = vPrevPrevMap[vPrevPrevMonth];
                          
                          pv1 = prevMap[month1]; // Geçen yılın aynı ayının değeri
                        }
                        
                        const ytdPrev = computeYtdForYear(kpi, year - 1);
                        const ytdCurr = computeYtdForYear(kpi, year);
                        const tgt = targets[kpi.id] ?? '';
                        
                        // YoY (Year over Year) hesaplama - TÜM KPI'lar için geçen yılın aynı ayına göre
                        // v1: Bu yılın seçili ayının değeri, pv1: Geçen yılın aynı ayının değeri
                        const yoy = trendPct(v1, pv1);
                        const vsTarget = (() => {
                          const t = tgt === '' ? null : parseNumberInput(String(tgt));
                          const y = ytdCurr;
                          if (t == null || t === 0) return null;
                          return ((y - t) / t) * 100;
                        })();
                        return (
                          <SortableTableRow
                            key={kpi.id}
                            kpi={kpi}
                            index={index}
                            v1={v1}
                            vPrev={vPrev}
                            vPrevPrev={vPrevPrev}
                            pv1={pv1}
                            ytdPrev={ytdPrev}
                            ytdCurr={ytdCurr}
                            tgt={tgt}
                            yoy={yoy}
                            vsTarget={vsTarget}
                            formatCell={formatCell}
                            month1={month1}
                            year={year}
                            isFullscreen={isFullscreen}
                            onKpiClick={handleKpiClick}
                          />
                        );
                      })
                    )}
                  </tbody>
                </SortableContext>
              </table>
              {isFullscreen && selectedKpi && (
                <KpiDetailModal
                  isOpen={isModalOpen}
                  onClose={closeModal}
                  kpi={selectedKpi}
                  currentYear={year}
                  currentMonth={month1}
                  currentYearData={valuesCurr[selectedKpi.id] || {}}
                  previousYearData={valuesPrev[selectedKpi.id] || {}}
                  target={targets[selectedKpi.id] || '0'}
                />
              )}
            </div>
          </DndContext>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-md supports-[backdrop-filter]:bg-white/5 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-full overflow-hidden flex flex-col">
            {/* Fullscreen Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/15 rounded">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <h1 className="font-semibold text-lg">KPI Performans Tablosu - Tam Ekran</h1>
                  <p className="text-sm text-blue-100">Sürükleyerek sıralamayı özelleştirin • ESC ile çıkış</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSavingOrder && (
                  <div className="flex items-center gap-2 text-sm text-blue-100">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </div>
                )}
                <div className="text-sm bg-white/15 px-4 py-2 rounded-full font-medium">{orderedKpis.length} KPI</div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 bg-white/15 hover:bg-white/25 rounded transition-colors duration-200 group"
                  title="Tam Ekrandan Çık"
                >
                  <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Fullscreen Table Content */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">KPI</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-1]} {year}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-2 < 0 ? 11 : month1-2]} {month1-1 <= 0 ? year-1 : year}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-3 <= 0 ? 12 + (month1-3) : month1-3]} {month1-2 <= 0 ? year-1 : year}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-1]} {year-1}</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{year-1} YTD</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{year} YTD</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">{year} Hedef</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          </td>
                          {[...Array(7)].map((_, cellIndex) => (
                            <td key={cellIndex} className="py-3 px-4 text-center">
                              <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-16"></div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">KPI</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-1]} {year}</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-2 < 0 ? 11 : month1-2]} {month1-1 <= 0 ? year-1 : year}</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-3 <= 0 ? 12 + (month1-3) : month1-3]} {month1-2 <= 0 ? year-1 : year}</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{MONTHS[month1-1]} {year-1}</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{year-1} YTD</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{year} YTD</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">{year} Hedef</th>
                        </tr>
                      </thead>
                      <SortableContext items={orderedKpis.map(kpi => kpi.id)} strategy={verticalListSortingStrategy}>
                        <tbody className="divide-y divide-gray-200">
                          {orderedKpis.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center text-slate-500 py-12">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="p-6 bg-gray-100 rounded-full">
                                    <span className="text-4xl">📊</span>
                                  </div>
                                  <div>
                                    <p className="text-xl font-medium">Seçili markaya ait aktif KPI bulunmuyor</p>
                                    <p className="text-gray-400">Lütfen farklı bir marka seçin veya KPI ekleyin</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            orderedKpis.map((kpi, index) => {
                              const currMap = valuesCurr[kpi.id] || {};
                              const prevMap = valuesPrev[kpi.id] || {};
                              const v1 = currMap[month1];
                              const vPrevMonth = month1 - 1 <= 0 ? 12 : month1 - 1;
                              const vPrevYear = month1 - 1 <= 0 ? year - 1 : year;
                              const vPrevMap = vPrevYear === year ? currMap : (valuesPrev[kpi.id] || {});
                              const vPrev = vPrevMap[vPrevMonth];
                              
                              const vPrevPrevMonth = month1 - 2 <= 0 ? (month1 - 2 <= -1 ? 12 + (month1 - 2) : 11) : month1 - 2;
                              const vPrevPrevYear = month1 - 2 <= 0 ? year - 1 : year;
                              const vPrevPrevMap = vPrevPrevYear === year ? currMap : (valuesPrev[kpi.id] || {});
                              const vPrevPrev = vPrevPrevMap[vPrevPrevMonth];
                              
                              const pv1 = prevMap[month1]; // Geçen yılın aynı ayının değeri
                              const ytdPrev = computeYtdForYear(kpi, year - 1);
                              const ytdCurr = computeYtdForYear(kpi, year);
                              const tgt = targets[kpi.id] ?? '';
                              
                              // YoY (Year over Year) hesaplama - TÜM KPI'lar için geçen yılın aynı ayına göre
                              // v1: Bu yılın seçili ayının değeri, pv1: Geçen yılın aynı ayının değeri
                              const yoy = trendPct(v1, pv1);
                              const vsTarget = (() => {
                                const t = tgt === '' ? null : parseNumberInput(String(tgt));
                                const y = ytdCurr;
                                if (kpi.calculation_type === 'target') return null;
                                if (t == null || t === 0) return null;
                                return ((y - t) / t) * 100;
                              })();
                              return (
                                <SortableTableRow
                                  key={kpi.id}
                                  kpi={kpi}
                                  index={index}
                                  v1={v1}
                                  vPrev={vPrev}
                                  vPrevPrev={vPrevPrev}
                                  pv1={pv1}
                                  ytdPrev={ytdPrev}
                                  ytdCurr={ytdCurr}
                                  tgt={tgt}
                                  yoy={yoy}
                                  vsTarget={vsTarget}
                                  formatCell={formatCell}
                                  month1={month1}
                                  year={year}
                                  isFullscreen={isFullscreen}
                                  onKpiClick={handleKpiClick}
                                />
                              );
                            })
                          )}
                        </tbody>
                      </SortableContext>
                    </table>
                  </div>
                </DndContext>
              )}
            </div>
            {selectedKpi && (
              <KpiDetailModal
                isOpen={isModalOpen}
                onClose={closeModal}
                kpi={selectedKpi}
                currentYear={year}
                currentMonth={month1}
                currentYearData={valuesCurr[selectedKpi.id] || {}}
                previousYearData={valuesPrev[selectedKpi.id] || {}}
                target={targets[selectedKpi.id] || '0'}
              />
            )}
          </div>
        </div>
      )}
      
      {/* KPI Detail Modal (non-fullscreen) */}
      {selectedKpi && !isFullscreen && (
        <KpiDetailModal
          isOpen={isModalOpen}
          onClose={closeModal}
          kpi={selectedKpi}
          currentYear={year}
          currentMonth={month1}
          currentYearData={valuesCurr[selectedKpi.id] || {}}
          previousYearData={valuesPrev[selectedKpi.id] || {}}
          target={targets[selectedKpi.id] || '0'}
        />
      )}
    </div>
  );
}

export default function SalesDashboardIsland(props: { categoryFilter?: string; brandCategory?: BrandCategoryKey } = {}) {
  return (
    <QueryProvider>
      <SalesDashboardIslandContent {...props} />
    </QueryProvider>
  );
}