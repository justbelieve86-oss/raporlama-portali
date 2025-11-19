import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getBrands, getBrandKpis, getKpiDailyReports, getBrandKpiTargets, getKpiCumulativeSources, getKpiFormulas, getKpiDetails } from '../services/api';
import type { Brand } from '../services/api';
import type { Target, KpiDetail } from '../types/api';
import { MenuIcon } from './ui/icons';
import { Card, CardContent } from './ui/card';
import { isMobileDevice } from '../utils/deviceDetection';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { QueryProvider } from './providers/QueryProvider';

type Kpi = {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  calculation_type?: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
  only_cumulative?: boolean;
};

type KpiData = {
  kpi: Kpi;
  dailyValue: number | null;
  cumulativeValue: number;
  targetValue: number | null;
};

const normalize = (s: string | undefined | null): string => String(s || '').trim().toLowerCase();

function getUnitMeta(unit?: string) {
  const u = String(unit || '').trim();
  const isPercent = u === '%' || normalize(u) === 'yüzde';
  const isTl = u === 'TL' || normalize(u) === 'tl' || normalize(u) === '₺';
  const unitLabel = u ? u : undefined;
  return { isPercent, isTl, unitLabel } as const;
}

function formatNumber(n: number): string {
  return Intl.NumberFormat('tr-TR').format(Number(n || 0));
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(Number(n || 0));
}

function MobileDailyKpiDashboardContent() {
  const { user } = useCurrentUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'Satış' | 'Servis' | 'Kiralama' | 'İkinci El' | 'Ekspertiz'>('Satış');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [kpiData, setKpiData] = useState<KpiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tarih state'i - varsayılan olarak dün (1 gün önce)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [year, setYear] = useState<number>(yesterday.getFullYear());
  const [month, setMonth] = useState<number>(yesterday.getMonth() + 1);
  const [day, setDay] = useState<number>(yesterday.getDate());

  useEffect(() => {
    // Desktop'ta mobil sayfaya gelinirse normal sayfaya yönlendir
    if (!isMobileDevice()) {
      window.location.href = '/user';
      return;
    }
  }, []);

  const brandCategoryKey = useMemo(() => {
    if (selectedCategory === 'Satış') return 'satis-markalari';
    if (selectedCategory === 'Servis') return 'satis-markalari';
    if (selectedCategory === 'Kiralama') return 'kiralama-markalari';
    if (selectedCategory === 'Ekspertiz') return 'ekspertiz-markalari';
    return 'ikinci-el-markalari';
  }, [selectedCategory]);

  const loadBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { brands: items } = await getBrands({ brandCategory: brandCategoryKey });
      const sorted = (items || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
      setBrands(sorted);
      if (sorted.length > 0 && !selectedBrandId) {
        setSelectedBrandId(String(sorted[0].id));
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'Markalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [brandCategoryKey, selectedBrandId]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // Kategori değiştiğinde marka seçimini sıfırla
  useEffect(() => {
    setSelectedBrandId('');
    setKpiData([]);
  }, [selectedCategory]);

  // Seçime göre günlük kategori metni (DailyKpiOverviewIsland mantığı)
  const canonicalDailyCategory = useMemo(() => {
    if (selectedCategory === 'Satış') return 'Satış - Günlük KPI';
    if (selectedCategory === 'Servis') return 'Servis - Günlük KPI';
    if (selectedCategory === 'Kiralama') return 'Kiralama - Günlük KPI';
    if (selectedCategory === 'Ekspertiz') return 'Ekspertiz - Günlük KPI';
    return 'İkinci El - Günlük KPI';
  }, [selectedCategory]);

  const loadKpiData = useCallback(async () => {
    if (!selectedBrandId) return;

    try {
      setLoading(true);
      setError(null);

      // Marka KPI'larını al
      const { kpis } = await getBrandKpis(selectedBrandId);
      
      // Kategori filtresi uygula (DailyKpiOverviewIsland mantığı)
      let filteredKpis = kpis || [];
      
      // DailyDataEntryIsland'daki alias eşlemesini yansıt
      const resolveCategoryAlias = (s: string): string => {
        const key = normalize(s);
        const map: Record<string, string> = {
          [normalize('2. El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
          [normalize('İkinci El Satış - Günlük KPI')]: 'İkinci El - Günlük KPI',
          [normalize('2. El - Günlük KPI')]: 'İkinci El - Günlük KPI',
        };
        return map[key] || s;
      };
      
      const desiredCategory = resolveCategoryAlias(canonicalDailyCategory);
      filteredKpis = filteredKpis.filter((kpi: Kpi) => {
        const kpiCategory = normalize(kpi.category || '');
        const desiredCategoryNormalized = normalize(desiredCategory);
        return kpiCategory === desiredCategoryNormalized;
      });
      
      // only_cumulative KPI'ları filtrele (günlük değer yok, sadece aylık override var)
      // Günlük KPI Dashboard'da sadece günlük değeri olan KPI'ları göster
      filteredKpis = filteredKpis.filter((kpi: Kpi) => kpi.only_cumulative !== true);

      // KPI ID'leri
      const kpiIds = filteredKpis.map((k: Kpi) => String(k.id));

      if (kpiIds.length === 0) {
        setKpiData([]);
        return;
      }

      // Tüm API çağrılarını paralel yap (performans optimizasyonu)
      const [dailyReports, targets, cumulativeSources, formulas, kpiDetails] = await Promise.all([
        // Günlük raporları al - tüm ayın verilerini al (day parametresi undefined)
        getKpiDailyReports(selectedBrandId, year, month, undefined, kpiIds.length > 0 ? kpiIds : undefined),
        // Target'ları al
        getBrandKpiTargets(selectedBrandId, year, month, kpiIds),
        // Cumulative sources al
        getKpiCumulativeSources(kpiIds),
        // Formulas al
        getKpiFormulas(kpiIds),
        // KPI detaylarını al (unit bilgisi için)
        getKpiDetails(kpiIds),
      ]);

      // Günlük değerleri gün bazında organize et (DailyKpiOverviewIsland mantığı)
      const values: Record<string, Record<number, number>> = {};
      if (Array.isArray(dailyReports)) {
        for (const r of dailyReports) {
          const kpiId = String(r.kpi_id);
          if (!values[kpiId]) values[kpiId] = {};
          
          let dayOfMonth = 0;
          if (r.report_date) {
            try {
              const reportDate = new Date(r.report_date);
              if (!isNaN(reportDate.getTime())) {
                dayOfMonth = reportDate.getDate();
              }
            } catch (e) {
              // Parse hatası durumunda devam et
            }
          } else if (r.day !== undefined) {
            dayOfMonth = Number(r.day);
          }
          
          if (dayOfMonth > 0) {
            values[kpiId][dayOfMonth] = Number(r.value || 0);
          }
        }
      }

      // Cumulative sources map'i oluştur
      const cumulativeSourcesMap: Record<string, string[]> = {};
      if (Array.isArray(cumulativeSources)) {
        for (const cs of cumulativeSources) {
          const kId = String(cs.kpi_id);
          const sId = String(cs.source_kpi_id);
          if (!cumulativeSourcesMap[kId]) cumulativeSourcesMap[kId] = [];
          cumulativeSourcesMap[kId].push(sId);
        }
      }

      // KPI verilerini birleştir
      const data: KpiData[] = filteredKpis
        .map((kpi: Kpi) => {
          const kpiId = String(kpi.id);
          
          // Günlük değer hesaplama (DailyKpiOverviewIsland mantığı)
          let dailyValue: number | null = null;
          if (kpi.calculation_type === 'cumulative') {
            // Cumulative KPI: sources'ların o günkü toplamı
            const sources = cumulativeSourcesMap[kpiId] || [];
            let sum = 0;
            for (const sid of sources) {
              sum += Number(values[sid]?.[day] || 0);
            }
            dailyValue = sum > 0 ? sum : null;
          } else {
            // Normal KPI: o günkü değer
            dailyValue = values[kpiId]?.[day] ?? null;
          }

          // Target değer
          const target = Array.isArray(targets)
            ? targets.find((t: Target) => String(t.kpi_id) === kpiId && t.month === month)
            : null;
          const targetValue = target?.target ?? null;

          // Cumulative hesaplama (DailyKpiOverviewIsland mantığı)
          let cumulativeValue = 0;
          if (kpi.calculation_type === 'cumulative') {
            // Cumulative KPI: sources'ların toplamı
            const sources = cumulativeSourcesMap[kpiId] || [];
            for (let d = 1; d <= day; d++) {
              for (const sid of sources) {
                cumulativeValue += Number(values[sid]?.[d] || 0);
              }
            }
          } else {
            // Normal KPI: 1'den seçilen güne kadar toplam
            for (let d = 1; d <= day; d++) {
              cumulativeValue += Number(values[kpiId]?.[d] || 0);
            }
          }

          // Unit bilgisi
          const kpiDetail = Array.isArray(kpiDetails)
            ? kpiDetails.find((d: KpiDetail) => String(d.id) === kpiId)
            : null;
          const unit = kpiDetail?.unit || kpi.unit;

          return {
            kpi: { ...kpi, unit },
            dailyValue,
            cumulativeValue,
            targetValue,
          };
        })
        // Hem günlük hem kümülatif değeri olmayan KPI'ları filtrele
        // Günlük değeri olmayan ama kümülatif değeri olan KPI'lar gösterilmeli
        // Sadece aylık veri girişi yapılan KPI'lar (hem günlük hem kümülatif null) filtrelenmeli
        .filter((item: KpiData) => item.dailyValue !== null || item.cumulativeValue > 0);

      setKpiData(data);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message || 'KPI verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId, year, month, day, canonicalDailyCategory]);

  useEffect(() => {
    if (selectedBrandId) {
      loadKpiData();
    }
  }, [loadKpiData]);

  const formatValue = (value: number | null, unit?: string) => {
    if (value === null || value === undefined) return '-';
    const meta = getUnitMeta(unit);
    if (meta.isPercent) {
      return `${formatNumber(value)}%`;
    }
    if (meta.isTl) {
      return `${formatCurrency(value)} ₺`;
    }
    return `${formatNumber(value)} ${meta.unitLabel || ''}`.trim();
  };

  const calculateProgress = (value: number | null, target: number | null) => {
    if (!target || target === 0 || value === null) return null;
    return Math.round((value / target) * 100);
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Günlük KPI Dashboard</h1>
              <p className="text-xs text-gray-600">{user?.full_name || user?.username || 'Kullanıcı'}</p>
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 text-white touch-manipulation"
              aria-label="Menü"
            >
              <MenuIcon size={20} />
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsMenuOpen(false)}
            />
            <nav className="fixed top-0 right-0 h-full w-64 bg-slate-900 z-50 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Menü</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg text-white hover:bg-slate-800 touch-manipulation"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <a
                  href="/user/mobile"
                  className="block px-4 py-3 text-white hover:bg-slate-800 rounded-lg touch-manipulation"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Ana Sayfa
                </a>
                <a
                  href="/user/mobile/daily-kpi"
                  className="block px-4 py-3 text-white bg-slate-800 rounded-lg touch-manipulation"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Günlük KPI Dashboard
                </a>
                <a
                  href="/user/mobile/monthly-kpi"
                  className="block px-4 py-3 text-white hover:bg-slate-800 rounded-lg touch-manipulation"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Aylık KPI Dashboard
                </a>
                <a
                  href="/login"
                  className="block px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg touch-manipulation mt-4 border-t border-slate-700 pt-4"
                  onClick={() => {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    setIsMenuOpen(false);
                  }}
                >
                  Çıkış Yap
                </a>
              </div>
            </nav>
          </>
        )}

        {/* Main Content */}
        <main className="p-4 space-y-4 pb-20">
          {/* Filters */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Kategori Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm touch-manipulation"
                >
                  <option value="Satış">Satış</option>
                  <option value="Servis">Servis</option>
                  <option value="Kiralama">Kiralama</option>
                  <option value="İkinci El">İkinci El</option>
                  <option value="Ekspertiz">Ekspertiz</option>
                </select>
              </div>

              {/* Marka Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marka
                </label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm touch-manipulation"
                  disabled={loading || brands.length === 0}
                >
                  {brands.length === 0 ? (
                    <option value="">Marka yükleniyor...</option>
                  ) : (
                    brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Tarih Seçimi */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Yıl
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ay
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Gün
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm touch-manipulation"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-sm text-red-800">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* KPI List */}
          {!loading && !error && kpiData.length > 0 && (
            <div className="space-y-3">
              {kpiData.map((item) => {
                const progress = calculateProgress(item.dailyValue, item.targetValue);
                const progressColor = progress === null 
                  ? 'gray' 
                  : progress >= 100 
                    ? 'green' 
                    : progress >= 70 
                      ? 'blue' 
                      : progress >= 50 
                        ? 'amber' 
                        : 'red';

                return (
                  <Card key={item.kpi.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {item.kpi.name}
                            </h3>
                            {item.kpi.category && (
                              <p className="text-xs text-gray-500 mt-1">
                                {item.kpi.category}
                              </p>
                            )}
                          </div>
                          {item.kpi.unit && (
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                              {item.kpi.unit}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Günlük Değer</p>
                            <p className="text-base font-semibold text-gray-900">
                              {formatValue(item.dailyValue, item.kpi.unit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Kümülatif</p>
                            <p className="text-base font-semibold text-blue-600">
                              {formatValue(item.cumulativeValue, item.kpi.unit)}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Hedef</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatValue(item.targetValue, item.kpi.unit)}
                            </span>
                          </div>
                        </div>

                        {progress !== null && (
                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Günlük Gerçekleşme</span>
                              <span className={`text-xs font-semibold ${
                                progressColor === 'green' ? 'text-green-700' :
                                progressColor === 'blue' ? 'text-blue-700' :
                                progressColor === 'amber' ? 'text-amber-700' :
                                'text-red-700'
                              }`}>
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  progressColor === 'green' ? 'bg-green-500' :
                                  progressColor === 'blue' ? 'bg-blue-500' :
                                  progressColor === 'amber' ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {(() => {
                          const cumulativeProgress = calculateProgress(item.cumulativeValue, item.targetValue);
                          const cumulativeProgressColor = cumulativeProgress === null 
                            ? 'gray' 
                            : cumulativeProgress >= 100 
                              ? 'green' 
                              : cumulativeProgress >= 70 
                                ? 'blue' 
                                : cumulativeProgress >= 50 
                                  ? 'amber' 
                                  : 'red';
                          
                          return cumulativeProgress !== null ? (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">Kümülatif Gerçekleşme</span>
                                <span className={`text-xs font-semibold ${
                                  cumulativeProgressColor === 'green' ? 'text-green-700' :
                                  cumulativeProgressColor === 'blue' ? 'text-blue-700' :
                                  cumulativeProgressColor === 'amber' ? 'text-amber-700' :
                                  'text-red-700'
                                }`}>
                                  {cumulativeProgress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    cumulativeProgressColor === 'green' ? 'bg-green-500' :
                                    cumulativeProgressColor === 'blue' ? 'bg-blue-500' :
                                    cumulativeProgressColor === 'amber' ? 'bg-amber-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(cumulativeProgress, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && kpiData.length === 0 && selectedBrandId && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-gray-600">
                  Seçilen kategori ve marka için KPI bulunamadı.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
  );
}

export default function MobileDailyKpiDashboard() {
  return (
    <QueryProvider>
      <MobileDailyKpiDashboardContent />
    </QueryProvider>
  );
}

