import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBrands, getBrandKpiMappings, getKpiCumulativeSources, getKpiFormulas, getKpiMonthlyReportsForUser, getBrandKpiTargets, getKpiDetails } from '../services/api';
import type { Brand } from '../services/api';
import type { BrandKpiMapping, KpiDetail, KpiFormula, KpiCumulativeSource, Target, MonthlyReport } from '../types/api';
import { api } from '../lib/axiosClient';
import { getListItems } from '../utils/apiList';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { DashboardIcon, ActivityIcon, BarChartIcon } from './ui/icons';
import { QueryProvider } from './providers/QueryProvider';
import { logger } from '../lib/logger';

type Kpi = {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  calculation_type?: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
  target?: number | null;
  only_cumulative?: boolean;
  numerator_kpi_id?: string;
  denominator_kpi_id?: string;
  ytd_calc?: 'toplam' | 'ortalama'; // YTD hesaplama tipi
};

type MonthlyBrandData = {
  kpis: Kpi[];
  values: Record<string, Record<number, number>>; // kpiId -> month -> value
  cumulativeOverrides: Record<string, number>; // only_cumulative monthly overrides
  targets: Record<string, number>; // monthly targets per KPI
  cumulativeSources: Record<string, string[]>; // cumulative KPI sources
  formulaExpressions: Record<string, string>; // formula expressions per KPI
  unitById: Record<string, string>;
  ytdValues: Record<string, number>; // kpiId -> YTD cumulative value
};

const normalize = (s: string | undefined | null): string => String(s || '').trim().toLowerCase();

function getUnitMeta(unit?: string) {
  const u = String(unit || '').trim();
  const isPercent = u === '%' || normalize(u) === 'yüzde';
  const isTl = u === 'TL' || normalize(u) === 'tl' || normalize(u) === '₺';
  const isAdet = normalize(u) === 'adet';
  const unitLabel = u ? u : undefined;
  return { isPercent, isTl, isAdet, unitLabel } as const;
}

function formatNumber(n: number, unit?: string): string {
  const u = String(unit || '').trim().toLowerCase();
  const isPercent = u === '%' || u === 'yüzde';
  const isAdet = u === 'adet';
  
  // TL ve ADET birimlerinde tam sayıya yuvarla
  if (isAdet) {
    return Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(Number(n || 0)));
  }
  // % biriminde 2 ondalık hane
  if (isPercent) {
    return Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
  }
  // Diğer birimler için varsayılan format
  return Intl.NumberFormat('tr-TR').format(Number(n || 0));
}

function formatCurrency(n: number): string {
  // TL biriminde tam sayıya yuvarla
  return Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(Number(n || 0)));
}

function pillClass(variant: 'gray' | 'violet' | 'blue' | 'green' | 'amber' | 'red' = 'gray') {
  const base = 'px-2 py-0.5 rounded-full border text-[10px]';
  if (variant === 'gray') return base + ' border-gray-400 text-gray-800 bg-gray-50';
  if (variant === 'violet') return base + ' border-violet-400 text-violet-800 bg-violet-50';
  if (variant === 'blue') return base + ' border-blue-400 text-blue-800 bg-blue-50';
  if (variant === 'green') return base + ' border-green-500 text-green-800 bg-green-50';
  if (variant === 'amber') return base + ' border-amber-500 text-amber-900 bg-amber-50';
  if (variant === 'red') return base + ' border-red-500 text-red-800 bg-red-50';
  return base + ' border-gray-400 text-gray-800 bg-gray-50';
}

// Tek satır bileşeni: DnD entegrasyonu ve hücrelerin çizimi
function OverviewRow({ 
  k, 
  idx, 
  brands, 
  brandData, 
  computedByBrand, 
  useManualOrdering, 
  canDrag,
  selectedMonth 
}: { 
  k: Kpi; 
  idx: number; 
  brands: Brand[]; 
  brandData: Record<string, MonthlyBrandData>; 
  computedByBrand: Record<string, Record<string, { monthly: number | null; ytd: number; targetVal: number | null; unit?: string; isPercent: boolean; isTl: boolean; calcType?: Kpi['calculation_type']; onlyCum: boolean; ytdCalc?: 'toplam' | 'ortalama' }>>; 
  useManualOrdering: boolean; 
  canDrag: boolean;
  selectedMonth: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: k.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const getComputedLocal = (brandId: string, bd: MonthlyBrandData, kId: string) => {
    const kk = bd.kpis.find(x => String(x.id) === String(kId));
    if (!kk) return { monthly: null, ytd: 0, targetVal: null, unit: undefined, isPercent: false, isTl: false, calcType: undefined, ytdCalc: undefined };
    const cached = computedByBrand[brandId]?.[kId];
    const unit = (cached?.unit ?? bd.unitById[kk.id] ?? kk.unit) as any;
    const meta = getUnitMeta(unit);
    return { 
      monthly: cached?.monthly ?? null, 
      ytd: cached?.ytd ?? 0, 
      targetVal: cached?.targetVal ?? null, 
      unit, 
      isPercent: meta.isPercent, 
      isTl: meta.isTl,
      calcType: cached?.calcType ?? kk.calculation_type,
      ytdCalc: cached?.ytdCalc ?? kk.ytd_calc
    };
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`text-sm transition-colors ${isDragging ? 'bg-blue-100 shadow-md' : isOver ? 'bg-blue-50' : 'hover:bg-gray-50 even:bg-white odd:bg-gray-50/30'}`}
      {...(useManualOrdering && canDrag ? attributes : {})}
      {...(useManualOrdering && canDrag ? listeners : {})}
    >
      <td className="py-3 px-4 border align-middle sticky left-0 bg-white z-10 min-w-[250px] max-w-[350px]">
        <div className="flex items-center gap-2">
          {useManualOrdering && canDrag && (
            <button
              aria-label="Satır sırasını sürükle-bırakla değiştir"
              title="Sürükle-Bırak"
              className="mr-1 p-1.5 rounded hover:bg-gray-100 text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex-shrink-0"
              aria-grabbed={isDragging}
              {...attributes}
              {...listeners}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
            </button>
          )}
          <span 
            className="font-semibold text-gray-900 text-sm break-words whitespace-normal leading-relaxed" 
            title={k.name}
            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
          >
            {idx + 1}. {k.name}
          </span>
        </div>
      </td>
      {brands.map(b => {
        const brandId = String(b.id);
        const bd = brandData[brandId];
        const computedForBrand = computedByBrand[brandId];
        if (!bd || !computedForBrand) {
          return (
            <React.Fragment key={`cell-${b.id}-${k.id}`}>
              <td className="py-3 px-3 border text-right text-sm text-gray-400 bg-gray-50/50">-</td>
              <td className="py-3 px-3 border text-right text-sm text-gray-400 bg-gray-50/50">-</td>
              <td className="py-3 px-3 border text-right text-sm text-gray-400 bg-gray-50/50">-</td>
              <td className="py-3 px-3 border text-right text-sm text-gray-400 bg-gray-50/50">-</td>
            </React.Fragment>
          );
        }
        const { monthly, ytd, targetVal, isPercent, isTl, calcType, unit } = getComputedLocal(brandId, bd, k.id);

        // "Dakika" birimindeki KPI'lar için gerçekleşen % hesaplanmaz
        const unitNorm = normalize(unit || '');
        const isMinuteUnit = unitNorm === 'dakika' || unitNorm.includes('dakika');

        // Gerçekleşen % hesaplama: YTD gerçekleşen / YTD hedef
        // "Dakika" birimindeki KPI'lar için hesaplanmaz
        let progressPct: number | null = null;
        if (!isMinuteUnit && calcType !== 'target' && targetVal && targetVal > 0 && ytd != null && ytd !== undefined) {
          progressPct = Math.max(0, Math.round((ytd / Number(targetVal)) * 100));
        }
        return (
          <React.Fragment key={`cell-${b.id}-${k.id}`}>
            <td className="py-3 px-3 border text-right tabular-nums bg-white w-[90px]">
              {monthly == null ? (
                <span className="text-sm text-gray-400">-</span>
              ) : (
                <span className={`text-sm font-medium ${monthly > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                  {isTl ? (monthly ? `₺${formatCurrency(monthly)}` : '—') : (monthly ? `${formatNumber(monthly, unit)}${isPercent ? '%' : ''}` : '—')}
                </span>
              )}
            </td>
            <td className="py-3 px-3 border text-right tabular-nums bg-white w-[100px]">
              <span className={`text-sm font-semibold ${ytd > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                {isTl ? (ytd ? `₺${formatCurrency(ytd)}` : '—') : (ytd ? `${formatNumber(ytd, unit)}${isPercent ? '%' : ''}` : '—')}
              </span>
            </td>
            <td className="py-3 px-3 border text-right tabular-nums bg-white w-[90px]">
              {targetVal == null ? (
                <span className="text-sm text-gray-400">-</span>
              ) : (
                <span className="text-sm font-medium text-gray-700">
                  {isTl ? (targetVal ? `₺${formatCurrency(targetVal)}` : '—') : (targetVal ? `${formatNumber(targetVal, unit)}${isPercent ? '%' : ''}` : '—')}
                </span>
              )}
            </td>
            <td className="py-3 px-3 border text-right bg-white w-[140px]">
              {(() => {
                const pctClass = (
                  progressPct == null
                    ? pillClass('gray')
                    : progressPct >= 100
                      ? pillClass('green')
                      : progressPct >= 80
                        ? pillClass('amber')
                        : pillClass('red')
                );
                const pct = Math.min(100, Math.max(0, progressPct || 0));
                return (
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 text-sm font-semibold rounded-md ${pctClass} text-right tabular-nums min-w-[60px]`}>
                      {progressPct != null ? `${progressPct}%` : '-'}
                    </span>
                    <div className="w-32 h-2.5 rounded-full bg-gray-200 overflow-hidden shadow-inner" aria-hidden="true">
                      <div 
                        className={`h-full transition-all duration-300 ${progressPct == null ? 'bg-gray-400' : progressPct >= 100 ? 'bg-gradient-to-r from-green-500 to-green-600' : progressPct >= 80 ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })()}
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
}

function Header({ 
  selectedCategory, 
  onChangeCategory, 
  useManualOrdering, 
  onToggleManualOrdering, 
  isSavingOrder, 
  canEditOrdering, 
  year, 
  month, 
  onChangeDate 
}: { 
  selectedCategory: string; 
  onChangeCategory: (v: string) => void; 
  useManualOrdering: boolean; 
  onToggleManualOrdering: (v: boolean) => void; 
  isSavingOrder?: boolean; 
  canEditOrdering: boolean; 
  year: number; 
  month: number; 
  onChangeDate: (y: number, m: number) => void;
}) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    onChangeDate(newYear, month);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    onChangeDate(year, newMonth);
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4">
      {/* Sol taraf: Yıl ve ay seçici */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label htmlFor="date-year" className="text-sm text-gray-700 whitespace-nowrap">📅 Yıl:</label>
          <select
            id="date-year"
            value={year}
            onChange={handleYearChange}
            className="border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ paddingRight: '2.5rem' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            id="date-month"
            value={month}
            onChange={handleMonthChange}
            className="border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ paddingRight: '2.5rem' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sağ taraf: Kategori */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm">
        <label htmlFor="category" className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <span className="text-base">📊</span>
          <span>Kategori</span>
        </label>
        <select 
          id="category" 
          className="border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
          style={{ paddingRight: '2.5rem' }}
          value={selectedCategory} 
          onChange={(e) => onChangeCategory(e.target.value)}
        >
          <option value="Satış - Aylık KPI">Satış - Aylık KPI</option>
          <option value="Servis - Aylık KPI">Servis - Aylık KPI</option>
          <option value="Kiralama - Aylık KPI">Kiralama - Aylık KPI</option>
          <option value="İkinci El - Aylık KPI">İkinci El - Aylık KPI</option>
          <option value="Ekspertiz - Aylık KPI">Ekspertiz - Aylık KPI</option>
        </select>
      </div>
    </div>
  );
}

function MonthlyKpiOverviewIslandContent() {
  const [selectedCategory, setSelectedCategory] = useState<'Satış - Aylık KPI' | 'Servis - Aylık KPI' | 'Kiralama - Aylık KPI' | 'İkinci El - Aylık KPI' | 'Ekspertiz - Aylık KPI'>('Satış - Aylık KPI');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandData, setBrandData] = useState<Record<string, MonthlyBrandData>>({});
  const [computedByBrand, setComputedByBrand] = useState<Record<string, Record<string, { monthly: number | null; ytd: number; targetVal: number | null; unit?: string; isPercent: boolean; isTl: boolean; calcType?: Kpi['calculation_type']; onlyCum: boolean; ytdCalc?: 'toplam' | 'ortalama' }>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useManualOrdering, setUseManualOrdering] = useState<boolean>(true);
  const [orderedKpiIds, setOrderedKpiIds] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [isOrderingLoaded, setIsOrderingLoaded] = useState<boolean>(false);
  const referenceBrandId = useMemo(() => brands.length > 0 ? String(brands[0].id) : null, [brands]);

  const { user } = useCurrentUser();
  // Her kullanıcı kendi KPI sıralamasını yapabilir
  const canEditOrdering = true;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Yıl ve ay state'i - varsayılan olarak takvim tarihinden bir önceki ay
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12 arası
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1; // 1-12 arası
  const previousYear = currentMonth === 1 ? now.getFullYear() - 1 : now.getFullYear();
  const [year, setYear] = useState<number>(previousYear);
  const [month, setMonth] = useState<number>(previousMonth);

  // Windowed rendering için state
  const [windowedRowsCount, setWindowedRowsCount] = useState<number>(60);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Tarih değişikliği handler'ı
  const handleDateChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    // Tarih değiştiğinde verileri temizle (yeniden yüklenecek)
    setBrandData({});
    setComputedByBrand({});
  }, []);

  // Manuel sıralama anahtarını oluşturan yardımcı
  const manualOrderStorageKey = useMemo(() => {
    return `kpi-ordering:monthly-overview:${selectedCategory}`;
  }, [selectedCategory]);

  // Kategori değiştiğinde manuel sıralama yükle
  // NOT: localStorage'dan yükleme kaldırıldı - her zaman backend'den yükle
  // useEffect(() => {
  //   try {
  //     const raw = localStorage.getItem(manualOrderStorageKey);
  //     const arr: string[] = raw ? JSON.parse(raw) : [];
  //     setOrderedKpiIds(Array.isArray(arr) ? arr : []);
  //   } catch {
  //     setOrderedKpiIds([]);
  //   }
  // }, [manualOrderStorageKey]);

  // Kategori mapping kaldırıldı - artık veri girişi sayfasıyla aynı mantık kullanılıyor

  const brandCategoryKey = useMemo(() => {
    if (selectedCategory === 'Satış - Aylık KPI') return 'satis-markalari';
    if (selectedCategory === 'Servis - Aylık KPI') return 'satis-markalari';
    if (selectedCategory === 'Kiralama - Aylık KPI') return 'kiralama-markalari';
    if (selectedCategory === 'Ekspertiz - Aylık KPI') return 'ekspertiz-markalari';
    return 'ikinci-el-markalari';
  }, [selectedCategory]);

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { brands: items } = await getBrands({ brandCategory: brandCategoryKey });
      const sorted = (items || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
      setBrands(sorted);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'Markalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [brandCategoryKey]);

  useEffect(() => { loadBrands(); }, [loadBrands]);

  // Kategori değiştiğinde önce mevcut marka verilerini temizle
  useEffect(() => { setBrandData({}); setComputedByBrand({}); }, [selectedCategory]);

  const loadBrandData = useCallback(async (brandId: string) => {
    try {
      logger.debug(`Marka ${brandId} için veri yükleniyor`, { brandId, category: selectedCategory });
      
      // Veri girişi sayfasıyla aynı mantık: getBrandKpiMappings + getKpiDetails
      const mappings = await getBrandKpiMappings(brandId);
      const kpiIds = (mappings || []).map((m: { kpi_id: string }) => String(m.kpi_id));
      
      logger.debug(`Marka ${brandId} için KPI mapping bulundu`, { brandId, count: kpiIds.length });
      
      if (kpiIds.length === 0) {
        logger.warn(`Marka ${brandId} için KPI mapping bulunamadı`, { brandId });
        setBrandData(prev => ({
          ...prev,
          [brandId]: {
            kpis: [],
            values: {},
            cumulativeOverrides: {},
            targets: {},
            cumulativeSources: {},
            formulaExpressions: {},
            unitById: {},
            ytdValues: {},
          },
        }));
        return;
      }

      // KPI detaylarını al (veri girişi sayfasıyla aynı)
      const kpiDetails = await getKpiDetails(kpiIds);
      let list: Kpi[] = (kpiDetails || []).map((r: KpiDetail) => ({
        id: String(r.id),
        name: String(r.name),
        category: r.category,
        unit: r.unit,
        calculation_type: r.calculation_type || 'direct',
        target: r.target == null ? null : Number(r.target),
        only_cumulative: !!r.only_cumulative,
        numerator_kpi_id: r.numerator_kpi_id ? String(r.numerator_kpi_id) : undefined,
        denominator_kpi_id: r.denominator_kpi_id ? String(r.denominator_kpi_id) : undefined,
        ytd_calc: r.ytd_calc === 'toplam' ? 'toplam' : 'ortalama', // YTD hesaplama tipi
      }));

      // Kategori filtresi - KPI yönetimindeki tam kategori isimleriyle eşleşme
      // Örnek: "Satış - Aylık KPI", "Servis - Aylık KPI", "Kiralama - Aylık KPI", vb.
      const categoryFilter = selectedCategory; // 'Satış - Aylık KPI', 'Servis - Aylık KPI', vb.
      
      // Debug: Tüm KPI kategorilerini logla
      const allCategories = new Set(list.map(k => k.category).filter(Boolean));
      if (allCategories.size > 0) {
        logger.debug(`Marka ${brandId} için KPI kategorileri`, { brandId, categories: Array.from(allCategories), filter: categoryFilter });
      }
      
      // Kategori filtreleme - BrandKpiListIsland ile aynı mantık
      if (categoryFilter) {
        // İlk önce tam kategori eşleşmesi dene
        let filtered = list.filter(kpi => {
          const kpiCategory = String(kpi.category || '').trim();
          return kpiCategory === categoryFilter;
        });
        
        logger.debug(`Tam eşleşme sonucu`, { count: filtered.length, filter: categoryFilter });
        
        // Eğer tam eşleşme yoksa, normalize edilmiş eşleşme dene
        if (filtered.length === 0) {
          filtered = list.filter(kpi => {
            const kpiCategory = normalize(String(kpi.category || ''));
            const filterCategory = normalize(categoryFilter);
            return kpiCategory === filterCategory;
          });
          logger.debug(`Normalize eşleşme sonucu`, { count: filtered.length });
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
          
          filtered = list.filter(k => {
            const kCategory = normalize(k.category || '');
            // Seçilen kategori anahtar kelimeleriyle eşleşiyor mu?
            return selectedKeywords.some(keyword => kCategory.includes(keyword));
          });
          logger.debug(`Esnek eşleşme sonucu`, { count: filtered.length });
        }
        
        list = filtered;
        logger.debug(`Filtrelenmiş KPI sayısı`, { filtered: list.length, total: (kpiDetails || []).length });
      }

      const filteredKpiIds = list.map(k => k.id);
      const unitById: Record<string, string> = {};
      list.forEach(k => { const u = String(k.unit || '').trim(); if (u) unitById[k.id] = u; });

      // KPI yoksa devam etme
      if (filteredKpiIds.length === 0) {
        logger.warn(`Marka ${brandId} için "${categoryFilter}" kategorisinde KPI bulunamadı`, { brandId, categoryFilter });
        setBrandData(prev => ({
          ...prev,
          [brandId]: {
            kpis: [],
            values: {},
            cumulativeOverrides: {},
            targets: {},
            cumulativeSources: {},
            formulaExpressions: {},
            unitById: {},
            ytdValues: {},
          },
        }));
        return;
      }
      
      logger.debug(`Marka ${brandId} için KPI filtrelendi`, { brandId, count: filteredKpiIds.length });

      // Percentage KPI'lar için numerator ve denominator KPI ID'lerini topla
      const allKpiIdsForLoading = new Set<string>(filteredKpiIds);
      list.forEach(k => {
        if (k.calculation_type === 'percentage' && k.numerator_kpi_id && k.denominator_kpi_id) {
          allKpiIdsForLoading.add(k.numerator_kpi_id);
          allKpiIdsForLoading.add(k.denominator_kpi_id);
        }
      });

      // Aylık raporları yükle (percentage KPI'lar için numerator/denominator dahil)
      const monthlyReports = await getKpiMonthlyReportsForUser(brandId, year, Array.from(allKpiIdsForLoading));
      const values: Record<string, Record<number, number>> = {};
      // Tüm KPI'lar için (filtrelenmiş + numerator/denominator) values objesi oluştur
      Array.from(allKpiIdsForLoading).forEach(kpiId => {
        values[kpiId] = {};
      });
      (monthlyReports || []).forEach((r: MonthlyReport) => {
        const kpiId = String(r.kpi_id);
        const monthNum = Number(r.month);
        const value = Number(r.value ?? 0);
        if (values[kpiId]) {
          values[kpiId][monthNum] = value;
        }
      });

      // YTD hesaplamaları (yıl başından seçilen aya kadar)
      // ytd_calc field'ına göre toplam veya ortalama hesapla
      // Percentage KPI'lar için özel hesaplama: Toplam pay / Toplam payda
      const ytdValues: Record<string, number> = {};
      list.forEach(k => {
        // Percentage KPI'lar için özel hesaplama
        if (k.calculation_type === 'percentage' && k.numerator_kpi_id && k.denominator_kpi_id) {
          const numeratorVals = values[k.numerator_kpi_id] || {};
          const denominatorVals = values[k.denominator_kpi_id] || {};
          
          let totalNumerator = 0;
          let totalDenominator = 0;
          let validMonths = 0;
          
          for (let m = 1; m <= month; m++) {
            const numVal = numeratorVals[m];
            const denVal = denominatorVals[m];
            
            if (numVal != null && numVal !== undefined && denVal != null && denVal !== undefined && denVal !== 0) {
              totalNumerator += numVal;
              totalDenominator += denVal;
              validMonths++;
            }
          }
          
          if (validMonths === 0 || totalDenominator === 0) {
            ytdValues[k.id] = 0;
          } else {
            const raw = totalNumerator / totalDenominator;
            const isPercentUnit = String(k.unit || '').trim() === '%';
            ytdValues[k.id] = isPercentUnit ? (raw * 100) : raw;
          }
        } else {
          // Diğer KPI'lar için normal hesaplama
          const monthValues: number[] = [];
          for (let m = 1; m <= month; m++) {
            const val = values[k.id]?.[m];
            // null veya undefined değilse ekle (0 değeri de geçerli)
            if (val != null && val !== undefined) {
              monthValues.push(val);
            }
          }
          
          if (monthValues.length === 0) {
            ytdValues[k.id] = 0;
          } else {
            // Birim tipine göre YTD hesaplama tipini otomatik belirle
            // Sayılabilir birimler (Adet, Puan, TL) için 'toplam'
            // Oransal birimler (%, Oran) için 'ortalama'
            const unitNorm = normalize(k.unit || '');
            const isSummableUnit = (
              unitNorm === 'adet' || 
              unitNorm === 'puan' || 
              unitNorm === 'tl' || 
              unitNorm === '₺' ||
              unitNorm.includes('adet') || 
              unitNorm.includes('puan') ||
              unitNorm.includes('tl')
            );
            const effectiveYtdCalc = k.ytd_calc || (isSummableUnit ? 'toplam' : 'ortalama');
            
            if (effectiveYtdCalc === 'toplam') {
              // Toplam: Tüm ayların toplamı
              ytdValues[k.id] = monthValues.reduce((a, b) => a + b, 0);
            } else {
              // Ortalama: Tüm ayların ortalaması (varsayılan)
              ytdValues[k.id] = monthValues.reduce((a, b) => a + b, 0) / monthValues.length;
            }
          }
        }
      });

      // Hedefleri yükle
      const targets = await getBrandKpiTargets(brandId, year, month, filteredKpiIds);
      const targetMap: Record<string, number> = {};
      (targets || []).forEach((t: Target) => {
        if (t.target != null) targetMap[String(t.kpi_id)] = Number(t.target);
      });

      // Kümülatif kaynaklar ve formüller (sadece KPI varsa)
      const [cumulativeSources, formulas] = await Promise.all([
        filteredKpiIds.length > 0 ? getKpiCumulativeSources(filteredKpiIds) : Promise.resolve([]),
        filteredKpiIds.length > 0 ? getKpiFormulas(filteredKpiIds) : Promise.resolve([]),
      ]);

      const cumulativeSourcesMap: Record<string, string[]> = {};
      (cumulativeSources || []).forEach((cs: KpiCumulativeSource) => {
        const kpiId = String(cs.kpi_id);
        if (!cumulativeSourcesMap[kpiId]) cumulativeSourcesMap[kpiId] = [];
        if (cs.source_kpi_id) cumulativeSourcesMap[kpiId].push(String(cs.source_kpi_id));
      });

      const formulaExpressionsMap: Record<string, string> = {};
      (formulas || []).forEach((f: KpiFormula) => {
        if (f.expression) formulaExpressionsMap[String(f.kpi_id)] = String(f.expression);
      });

      setBrandData(prev => ({
        ...prev,
        [brandId]: {
          kpis: list,
          values,
          cumulativeOverrides: prev[brandId]?.cumulativeOverrides || {},
          targets: targetMap,
          cumulativeSources: cumulativeSourcesMap,
          formulaExpressions: formulaExpressionsMap,
          unitById,
          ytdValues,
        },
      }));
    } catch (e: unknown) {
      logger.error(`Marka ${brandId} için veri yükleme hatası`, e);
      const error = e as { message?: string };
      setError(`Marka verileri yüklenirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
      // Hata durumunda da boş data set et ki loading state'i false olsun
      setBrandData(prev => ({
        ...prev,
        [brandId]: {
          kpis: [],
          values: {},
          cumulativeOverrides: {},
          targets: {},
          cumulativeSources: {},
          formulaExpressions: {},
          unitById: {},
          ytdValues: {},
        },
      }));
    }
  }, [selectedCategory, year, month]);

  // Tüm markalar için veri yükle
  useEffect(() => {
    if (brands.length === 0) return;
    
    logger.debug(`Marka veri yükleme başlatılıyor`, { brandCount: brands.length, category: selectedCategory, year, month });
    
    brands.forEach(b => {
      const brandId = String(b.id);
      // Kategori değiştiğinde brandData temizlendiği için her zaman yükle
      // Ayrıca yıl/ay değiştiğinde de yeniden yükle
      loadBrandData(brandId);
    });
  }, [brands, selectedCategory, year, month, loadBrandData]);

  // Hesaplanmış değerleri cache'le
  const computeBrandValues = useCallback((bd: MonthlyBrandData): Record<string, { monthly: number | null; ytd: number; targetVal: number | null; unit?: string; isPercent: boolean; isTl: boolean; calcType?: Kpi['calculation_type']; onlyCum: boolean; ytdCalc?: 'toplam' | 'ortalama' }> => {
    const out: Record<string, { monthly: number | null; ytd: number; targetVal: number | null; unit?: string; isPercent: boolean; isTl: boolean; calcType?: Kpi['calculation_type']; onlyCum: boolean; ytdCalc?: 'toplam' | 'ortalama' }> = {};
    bd.kpis.forEach(k => {
      const unit = bd.unitById[k.id] || k.unit;
      const meta = getUnitMeta(unit);
      
      // Monthly değer hesaplama
      let monthlyValue: number | null = null;
      if (k.calculation_type === 'percentage' && k.numerator_kpi_id && k.denominator_kpi_id) {
        // Percentage KPI'lar için: Pay / Payda
        const numVal = bd.values[k.numerator_kpi_id]?.[month];
        const denVal = bd.values[k.denominator_kpi_id]?.[month];
        if (numVal != null && numVal !== undefined && denVal != null && denVal !== undefined && denVal !== 0) {
          const raw = numVal / denVal;
          monthlyValue = meta.isPercent ? (raw * 100) : raw;
        }
      } else {
        monthlyValue = bd.values[k.id]?.[month] ?? null;
      }
      
      // YTD hesaplama: ytd_calc field'ına göre toplam veya ortalama
      // loadBrandData'da zaten hesaplanmış, burada sadece cache'den al
      const ytdValue = bd.ytdValues[k.id] ?? 0;
      
      const targetVal = bd.targets[k.id] ?? null;
      out[k.id] = {
        monthly: monthlyValue,
        ytd: ytdValue,
        targetVal,
        unit,
        isPercent: meta.isPercent,
        isTl: meta.isTl,
        calcType: k.calculation_type,
        onlyCum: !!k.only_cumulative,
        ytdCalc: k.ytd_calc,
      };
    });
    return out;
  }, [month]);

  useEffect(() => {
    brands.forEach(b => {
      const id = String(b.id);
      const bd = brandData[id];
      if (!bd) return;
      setTimeout(() => {
        const res = computeBrandValues(bd);
        setComputedByBrand(prev => ({ ...prev, [id]: res }));
      }, 0);
    });
  }, [brands, brandData, computeBrandValues]);

  // Manuel sıralama yükleme (basitleştirilmiş)
  const loadOrderingForManualMode = useCallback(async () => {
    if (!useManualOrdering) return;
    if (!referenceBrandId) return;
    setIsOrderingLoaded(false);
    try {
      logger.debug(`Backend'den KPI sıralaması yükleniyor`, { brandId: referenceBrandId, context: 'monthly-overview' });
      const res = await api.get(`/kpi-ordering/${referenceBrandId}?context=monthly-overview`);
      type KpiOrderingItem = { kpi_id: string; order_index: number };
      const items = getListItems<KpiOrderingItem>(res.data);
      logger.debug(`Backend'den KPI sıralama kaydı alındı`, { count: items.length });
      const sorted = (items || []).slice().sort((a, b) => (Number(a?.order_index ?? 999) - Number(b?.order_index ?? 999)));
      const refIds = sorted.map((r) => String(r.kpi_id));
      logger.debug(`Sıralanmış KPI ID'leri`, { ids: refIds });
      
      // Tüm markaların KPI'larını birleştir
      const allKpiIds = new Set<string>();
      for (const brand of brands) {
        const brandId = String(brand.id);
        const bd = brandData[brandId];
        if (bd?.kpis) {
          for (const k of bd.kpis) {
            allKpiIds.add(String(k.id));
          }
        }
      }
      
      const completeIds = [...refIds, ...Array.from(allKpiIds).filter(id => !refIds.includes(String(id)))];
      logger.debug(`KPI sıralaması güncellendi`, { count: completeIds.length });
      setOrderedKpiIds(completeIds);
      // localStorage'a kaydetme kaldırıldı - her zaman backend'den yükle
      // try { localStorage.setItem(manualOrderStorageKey, JSON.stringify(completeIds)); } catch {}
    } catch (e) {
      logger.error('KPI sıralaması yüklenemedi', e);
    } finally {
      setIsOrderingLoaded(true);
    }
  }, [useManualOrdering, referenceBrandId, manualOrderStorageKey, brands, brandData]);

  // Her zaman backend'den sıralamayı yükle (kategori veya referenceBrandId değiştiğinde)
  // brandData dependency'si kaldırıldı - sadece referenceBrandId ve selectedCategory değiştiğinde yükle
  useEffect(() => {
    if (useManualOrdering && brands.length > 0 && referenceBrandId) {
      // brandData yüklenene kadar bekle
      const hasBrandData = Object.keys(brandData).length > 0;
      if (hasBrandData) {
        // Backend'den sıralamayı yükle (her zaman, localStorage'a bakmadan)
        logger.debug('useEffect: brandData yüklendi, sıralama yükleniyor');
        loadOrderingForManualMode();
      }
    }
  }, [useManualOrdering, brands.length, referenceBrandId, selectedCategory, loadOrderingForManualMode]);

  // brandData değiştiğinde de yükle (yeni marka verileri yüklendiğinde)
  // brandData objesinin key'lerini string olarak sakla ve değişikliği izle
  const brandDataKeys = useMemo(() => Object.keys(brandData).sort().join(','), [brandData]);
  useEffect(() => {
    if (useManualOrdering && brands.length > 0 && referenceBrandId) {
      const hasBrandData = brandDataKeys.length > 0;
      if (hasBrandData) {
        // brandData değiştiğinde sıralamayı yeniden yükle
        logger.debug('useEffect: brandData değişti, sıralama yeniden yükleniyor', { brandDataKeys });
        loadOrderingForManualMode();
      }
    }
  }, [brandDataKeys, useManualOrdering, referenceBrandId, loadOrderingForManualMode]);

  // Sayfa focus olduğunda da sıralamayı yeniden yükle (başka kullanıcı değişiklik yaptıysa görmek için)
  useEffect(() => {
    if (!useManualOrdering || !referenceBrandId || brands.length === 0) return;
    
    const handleFocus = () => {
      const hasBrandData = Object.keys(brandData).length > 0;
      if (hasBrandData) {
        // Sayfa focus olduğunda backend'den güncel sıralamayı yükle
        logger.debug('Window focus: sıralama yeniden yükleniyor');
        loadOrderingForManualMode();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [useManualOrdering, referenceBrandId, brands.length, loadOrderingForManualMode]);

  // Periyodik olarak backend'den sıralamayı kontrol et (her 30 saniyede bir)
  // brandData kontrolü kaldırıldı - her zaman yükle (brandData yoksa bile backend'den kontrol et)
  useEffect(() => {
    if (!useManualOrdering || !referenceBrandId || brands.length === 0) return;

    // İlk yükleme hemen yapılsın (brandData yoksa bile backend'den kontrol et)
    logger.debug('Periyodik yükleme başlatılıyor');
    const initialLoad = async () => {
      const hasBrandData = Object.keys(brandData).length > 0;
      if (hasBrandData) {
        loadOrderingForManualMode();
      }
    };
    initialLoad();

    // Sonra her 30 saniyede bir kontrol et
    const interval = setInterval(() => {
      logger.debug('Periyodik kontrol: sıralama yeniden yükleniyor');
      const hasBrandData = Object.keys(brandData).length > 0;
      if (hasBrandData) {
        loadOrderingForManualMode();
      }
    }, 30000); // 30 saniye

    return () => {
      clearInterval(interval);
    };
  }, [useManualOrdering, referenceBrandId, brands.length, selectedCategory, loadOrderingForManualMode]);

  const saveOrderingToBackend = useCallback(async (newOrderedIds: string[]) => {
    logger.debug('saveOrderingToBackend çağrıldı', { 
      newOrderedIdsCount: newOrderedIds.length, 
      newOrderedIds,
      canEditOrdering, 
      referenceBrandId 
    });
    
    if (!canEditOrdering) {
      logger.warn('saveOrderingToBackend: canEditOrdering false');
      return;
    }
    
    if (!referenceBrandId) {
      logger.warn('saveOrderingToBackend: referenceBrandId eksik');
      return;
    }
    
    const allKpiIds = new Set<string>();
    const kpiToBrands = new Map<string, Set<string>>();
    
    for (const brand of brands) {
      const brandId = String(brand.id);
      const bd = brandData[brandId];
      if (bd?.kpis) {
        for (const k of bd.kpis) {
          const kId = String(k.id);
          allKpiIds.add(kId);
          if (!kpiToBrands.has(kId)) {
            kpiToBrands.set(kId, new Set());
          }
          kpiToBrands.get(kId)!.add(brandId);
        }
      }
    }
    
    logger.debug('Tüm KPI ID\'leri', { ids: Array.from(allKpiIds) });
    
    const filtered = newOrderedIds.filter(id => allKpiIds.has(String(id)));
    const missing = Array.from(allKpiIds).filter(id => !filtered.includes(String(id)));
    // complete array'i tüm markaların KPI'larını içeriyor - Monthly KPI Dashboard için tüm KPI'ları kaydetmeliyiz
    const complete = [...filtered, ...missing];
    
    logger.debug('Filtreleme sonuçları', { 
      filteredCount: filtered.length, 
      missingCount: missing.length, 
      completeCount: complete.length,
      complete
    });
    
    // Monthly KPI Dashboard birden fazla marka gösterdiği için, tüm KPI'ları kaydetmeliyiz
    // Reference brand sadece hangi brandId ile kaydedileceğini belirler, ama tüm KPI'lar kaydedilir
    const payload = { kpiOrdering: complete.map((kpi_id, index) => ({ kpi_id, order_index: index })) };
    
    if (complete.length === 0) {
      logger.warn('complete boş, kayıt yapılmıyor');
      return;
    }
    
    try {
      logger.debug(`Backend'e KPI sıralaması kaydediliyor`, {
        brandId: referenceBrandId,
        context: 'monthly-overview',
        payloadCount: payload.kpiOrdering.length,
        completeCount: complete.length,
        payload: payload.kpiOrdering
      });
      await api.put(`/kpi-ordering/${referenceBrandId}`, { ...payload, context: 'monthly-overview' });
      logger.debug(`Backend'e KPI sıralaması başarıyla kaydedildi`, { count: payload.kpiOrdering.length, context: 'monthly-overview' });
    } catch (error: unknown) {
      logger.error('Backend kayıt hatası', error);
      throw error;
    }
  }, [referenceBrandId, brandData, brands, canEditOrdering]);

  // MARKA-BAZLI KARŞILAŞTIRMA MATRİSİ
  const renderComparisonTable = () => {
    const kpiMap: Record<string, Kpi> = {};
    for (const b of brands) {
      const bd = brandData[String(b.id)];
      if (!bd) continue;
      for (const k of bd.kpis) {
        if (!kpiMap[k.id]) kpiMap[k.id] = k;
      }
    }
    const allKpisRaw = Object.values(kpiMap);

    const manualOrderedKpis = (() => {
      if (!useManualOrdering) return allKpisRaw;
      const idToKpi = new Map<string, Kpi>();
      for (const k of allKpisRaw) idToKpi.set(String(k.id), k);
      const result: Kpi[] = [];
      for (const id of orderedKpiIds) { const k = idToKpi.get(String(id)); if (k) result.push(k); }
      for (const k of allKpisRaw) { if (!orderedKpiIds.includes(String(k.id))) result.push(k); }
      return result;
    })();

    const allKpis = useManualOrdering ? manualOrderedKpis : allKpisRaw.slice().sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    const displayCount = useManualOrdering ? allKpis.length : Math.min(windowedRowsCount, allKpis.length);
    const displayKpis = allKpis.slice(0, displayCount);

    const anyDataLoaded = brands.some(b => !!brandData[String(b.id)]);
    if (!anyDataLoaded) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Veriler yükleniyor…</div>
        </div>
      );
    }

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
      if (nearBottom) {
        setWindowedRowsCount(c => Math.min(c + 50, allKpis.length));
      }
    };

    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div ref={scrollRef} onScroll={onScroll} className="max-h-[75vh] overflow-y-auto overflow-x-hidden">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragMove={(event) => {
              if (!useManualOrdering) return;
              const el = scrollRef.current;
              if (!el) return;
              const rect = (event as any)?.active?.rect?.current?.translated || (event as any)?.active?.rect?.current?.initial;
              if (!rect) return;
              const container = el.getBoundingClientRect();
              const topOffset = rect.top - container.top;
              const height = rect.height ?? ((rect.bottom && rect.top) ? (rect.bottom - rect.top) : 0);
              const bottomOffset = container.bottom - (rect.top + height);
              const threshold = 80; const step = 20;
              if (topOffset < threshold) el.scrollTop -= step;
              else if (bottomOffset < threshold) el.scrollTop += step;
            }} onDragEnd={(event) => {
              const { active, over } = event as any;
              logger.debug('onDragEnd tetiklendi', { active: active.id, over: over?.id, useManualOrdering, canEditOrdering });
              
              if (!useManualOrdering) {
                logger.debug('useManualOrdering false, işlem iptal edildi');
                return;
              }
              
              if (!canEditOrdering) {
                logger.debug('canEditOrdering false, işlem iptal edildi');
                return;
              }
              
              if (!over || active.id === over.id) {
                logger.debug('over yok veya active.id === over.id, işlem iptal edildi');
                return;
              }
              
              // Use allKpis instead of orderedKpiIds to ensure we have all KPIs
              const currentIds = allKpis.map(k => String(k.id));
              logger.debug('Mevcut KPI ID\'leri (allKpis)', { ids: currentIds });
              
              if (currentIds.length === 0) {
                logger.debug('currentIds boş, işlem iptal edildi');
                return;
              }
              
              const oldIndex = currentIds.findIndex(id => String(id) === String(active.id));
              const newIndex = currentIds.findIndex(id => String(id) === String(over.id));
              
              logger.debug('Sıralama değişikliği', { oldIndex, newIndex, activeId: active.id, overId: over.id });
              
              if (oldIndex === -1 || newIndex === -1) {
                logger.debug('oldIndex veya newIndex -1, işlem iptal edildi');
                return;
              }
              
              const next = arrayMove(currentIds, oldIndex, newIndex);
              logger.debug('Yeni sıralama', { next });
              setOrderedKpiIds(next);
              
              // localStorage'a kaydetme kaldırıldı - sadece backend'e kaydet
              // try { 
              //   localStorage.setItem(manualOrderStorageKey, JSON.stringify(next)); 
              // } catch (e) {
              //   console.error('localStorage kaydetme hatası:', e);
              // }
              
              (async () => {
                try {
                  setIsSavingOrder(true);
                  logger.debug('Backend\'e kaydediliyor', { next });
                  await saveOrderingToBackend(next);
                  // Başarıyla kaydedildikten sonra, backend'den güncel sıralamayı tekrar yükle
                  // Bu, diğer kullanıcıların değişikliği görmesi için gerekli değil ama tutarlılık için iyi
                  logger.debug('KPI sıralaması başarıyla kaydedildi');
                } catch (e) {
                  logger.error('KPI sıralaması kaydedilemedi', e);
                } finally {
                  setIsSavingOrder(false);
                }
              })();
            }}>
          <table className="w-full table-auto border-collapse bg-white shadow-sm">
            <thead>
              <tr className="text-sm text-gray-800 border-b-2 border-gray-300 sticky top-0 bg-gradient-to-b from-gray-50 to-white z-30 shadow-sm">
                <th className="text-left py-3 px-4 border-r-2 border-gray-300 sticky left-0 bg-gradient-to-b from-gray-50 to-white z-30 font-bold text-base min-w-[250px] max-w-[350px]">KPI</th>
                {brands.map(b => (
                  <th key={`brand-head-${b.id}`} className="text-center py-3 px-4 border-r border-gray-200 font-bold text-base bg-gradient-to-b from-blue-50/50 to-white" colSpan={4}>
                    <div className="flex flex-col items-center gap-1">
                      <span>{b.name}</span>
                      <div className="h-0.5 w-full bg-blue-400 rounded-full"></div>
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="text-xs text-gray-700 border-b border-gray-200 sticky top-[52px] bg-gradient-to-b from-gray-50 to-white z-30">
                <th className="text-left py-2.5 px-4 border-r-2 border-gray-300 sticky left-0 bg-gradient-to-b from-gray-50 to-white z-30 font-semibold min-w-[250px] max-w-[350px]"></th>
                {brands.map(b => (
                  <React.Fragment key={`brand-sub-${b.id}`}>
                    <th className="text-right py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 w-[90px]">Aylık</th>
                    <th className="text-right py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 w-[100px]">YTD</th>
                    <th className="text-right py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 w-[90px]">Hedef</th>
                    <th className="text-right py-2.5 px-3 border-r border-gray-200 font-semibold text-gray-700 bg-blue-50/30 w-[140px]">Gerçekleşen %</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
              <SortableContext items={displayKpis.map(k => k.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {displayKpis.map((k, idx) => (
                <OverviewRow key={`row-${k.id}`} k={k} idx={idx} brands={brands} brandData={brandData} computedByBrand={computedByBrand} useManualOrdering={useManualOrdering} canDrag={canEditOrdering} selectedMonth={month} />
              ))}
            </tbody>
              </SortableContext>
          </table>
          </DndContext>
          </div>
        </div>
      </div>
    );
  };

  if (loading && brands.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Markalar yükleniyor…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        selectedCategory={selectedCategory}
        onChangeCategory={(v) => setSelectedCategory(v as typeof selectedCategory)}
        useManualOrdering={useManualOrdering}
        onToggleManualOrdering={setUseManualOrdering}
        isSavingOrder={isSavingOrder}
        canEditOrdering={canEditOrdering}
        year={year}
        month={month}
        onChangeDate={handleDateChange}
      />
      {renderComparisonTable()}
    </div>
  );
}

export default function MonthlyKpiOverviewIsland() {
  return (
    <QueryProvider>
      <MonthlyKpiOverviewIslandContent />
    </QueryProvider>
  );
}
