import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { getBrands, getBrandKpis, getKpiDetails, getKpiDailyReports, getKpiMonthlyReports, getKpiMonthlyReportsForUser } from '../services/api';
import type { Brand } from '../services/api';
import type { Kpi } from '../types/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { filterBrandsByCategory, type BrandCategoryKey } from '../lib/brandCategories';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import EmptyState from './ui/empty-state';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError } from '../lib/errorUtils';
import { logger } from '../lib/logger';

type ReportType = 'daily' | 'monthly';
type ReportData = {
  kpiId: string;
  kpiName: string;
  brandId: string;
  brandName: string;
  date: string;
  value: number;
  unit?: string;
};

export default function UserReportsIsland() {
  // useCurrentUser hook'u QueryClient gerektiriyor, bu yüzden QueryProvider içinde kullanıyoruz
  // const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<BrandCategoryKey | 'all'>('all');
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [kpisByBrand, setKpisByBrand] = useState<Record<string, Kpi[]>>({});
  const [reportData, setReportData] = useState<ReportData[]>([]);

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

  // Load brands
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoading(true);
        setError(null);
        const brandsResponse = await getBrands({ status: 'aktif' });
        const allBrands = 'brands' in brandsResponse ? brandsResponse.brands : (Array.isArray(brandsResponse) ? brandsResponse : []);
        setBrands(Array.isArray(allBrands) ? allBrands : []);
      } catch (e) {
        logger.error('Brands load error', e instanceof Error ? e : { error: e });
        setError(toUserFriendlyError(e).message);
      } finally {
        setLoading(false);
      }
    };
    loadBrands();
  }, []);

  // Filter brands by category
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredBrands(brands);
    } else {
      setFilteredBrands(filterBrandsByCategory(brands, selectedCategory));
    }
    // Reset selected brands when category changes
    setSelectedBrandIds([]);
    setKpisByBrand({});
    setSelectedKpiIds([]);
  }, [selectedCategory, brands]);

  // Load KPIs for selected brands
  useEffect(() => {
    const loadKpis = async () => {
      if (selectedBrandIds.length === 0) {
        setKpisByBrand({});
        setSelectedKpiIds([]);
        return;
      }

      try {
        setLoading(true);
        const kpisMap: Record<string, Kpi[]> = {};
        
        await Promise.all(
          selectedBrandIds.map(async (brandId) => {
            try {
              const { kpis } = await getBrandKpis(brandId);
              kpisMap[brandId] = Array.isArray(kpis) ? kpis : [];
            } catch (e) {
              logger.error(`KPI load error for brand ${brandId}`, e instanceof Error ? e : { error: e });
              kpisMap[brandId] = [];
            }
          })
        );
        
        setKpisByBrand(kpisMap);
      } catch (e) {
        logger.error('KPIs load error', e instanceof Error ? e : { error: e });
        setError(toUserFriendlyError(e).message);
      } finally {
        setLoading(false);
      }
    };

    loadKpis();
  }, [selectedBrandIds]);

  // Get all available KPIs from selected brands
  const availableKpis = useMemo(() => {
    const kpiMap = new Map<string, Kpi>();
    Object.values(kpisByBrand).forEach((kpis) => {
      if (Array.isArray(kpis)) {
        kpis.forEach((kpi) => {
          if (!kpiMap.has(kpi.id)) {
            kpiMap.set(kpi.id, kpi);
          }
        });
      }
    });
    return Array.from(kpiMap.values());
  }, [kpisByBrand]);

  // Generate report
  const generateReport = useCallback(async () => {
    if (selectedBrandIds.length === 0 || selectedKpiIds.length === 0 || !startDate || !endDate) {
      setError('Lütfen marka, KPI ve tarih aralığı seçin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startYear = start.getFullYear();
      const startMonth = start.getMonth() + 1;
      const endYear = end.getFullYear();
      const endMonth = end.getMonth() + 1;

      const allReportData: ReportData[] = [];

      if (reportType === 'daily') {
        // Daily reports
        const daysInRange: Array<{ year: number; month: number; day: number }> = [];
        const current = new Date(start);
        while (current <= end) {
          daysInRange.push({
            year: current.getFullYear(),
            month: current.getMonth() + 1,
            day: current.getDate(),
          });
          current.setDate(current.getDate() + 1);
        }

        await Promise.all(
          selectedBrandIds.map(async (brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            if (!brand) return;

            // Get daily reports for each day in range
            for (const { year, month, day } of daysInRange) {
              try {
                const reports = await getKpiDailyReports(brandId, year, month, day, selectedKpiIds);
                const kpiDetails = await getKpiDetails(selectedKpiIds);
                const kpiDetailsArray = Array.isArray(kpiDetails) ? kpiDetails : [];
                const kpiMap = new Map(kpiDetailsArray.map((k) => [k.id, k]));
                const reportsArray = Array.isArray(reports) ? reports : [];

                reportsArray.forEach((report) => {
                  const kpi = kpiMap.get(report.kpi_id);
                  if (kpi) {
                    allReportData.push({
                      kpiId: report.kpi_id,
                      kpiName: kpi.name,
                      brandId,
                      brandName: brand.name,
                      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                      value: report.value || 0,
                      unit: kpi.unit,
                    });
                  }
                });
              } catch (e) {
                logger.error(`Daily report error for ${brandId} ${year}-${month}-${day}`, e instanceof Error ? e : { error: e });
              }
            }
          })
        );
      } else {
        // Monthly reports
        const monthsInRange: Array<{ year: number; month: number }> = [];
        const current = new Date(startYear, startMonth - 1, 1);
        const endDateObj = new Date(endYear, endMonth - 1, 1);
        
        while (current <= endDateObj) {
          monthsInRange.push({
            year: current.getFullYear(),
            month: current.getMonth() + 1,
          });
          current.setMonth(current.getMonth() + 1);
        }

        await Promise.all(
          selectedBrandIds.map(async (brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            if (!brand) return;

            for (const { year, month } of monthsInRange) {
              try {
                const reports = await getKpiMonthlyReports(brandId, year, month, selectedKpiIds);
                const kpiDetails = await getKpiDetails(selectedKpiIds);
                const kpiDetailsArray = Array.isArray(kpiDetails) ? kpiDetails : [];
                const kpiMap = new Map(kpiDetailsArray.map((k) => [k.id, k]));
                const reportsArray = Array.isArray(reports) ? reports : [];

                reportsArray.forEach((report) => {
                  const kpi = kpiMap.get(report.kpi_id);
                  if (kpi) {
                    allReportData.push({
                      kpiId: report.kpi_id,
                      kpiName: kpi.name,
                      brandId,
                      brandName: brand.name,
                      date: `${year}-${String(month).padStart(2, '0')}`,
                      value: report.value || 0,
                      unit: kpi.unit,
                    });
                  }
                });
              } catch (e) {
                logger.error(`Monthly report error for ${brandId} ${year}-${month}`, e instanceof Error ? e : { error: e });
              }
            }
          })
        );
      }

      setReportData(allReportData);
    } catch (e) {
      logger.error('Report generation error', e instanceof Error ? e : { error: e });
      setError(toUserFriendlyError(e).message);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandIds, selectedKpiIds, startDate, endDate, reportType, brands]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (reportData.length === 0) return;

    const headers = ['Tarih', 'Marka', 'KPI', 'Değer', 'Birim'];
    const rows = reportData.map((r) => [
      r.date,
      r.brandName,
      r.kpiName,
      String(r.value),
      r.unit || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapor_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData]);

  const formatValue = (value: number, unit?: string) => {
    if (!unit) return new Intl.NumberFormat('tr-TR').format(value);
    const unitLower = unit.toLowerCase();
    if (unitLower === 'tl' || unitLower === '₺') {
      return `₺${new Intl.NumberFormat('tr-TR').format(value)}`;
    }
    if (unitLower === '%' || unitLower === 'yüzde') {
      return `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
    }
    return `${new Intl.NumberFormat('tr-TR').format(value)} ${unit}`;
  };

  return (
    <QueryProvider>
      <UserReportsContent />
    </QueryProvider>
  );
}

function UserReportsContent() {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<BrandCategoryKey | 'all'>('all');
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [kpisByBrand, setKpisByBrand] = useState<Record<string, Kpi[]>>({});
  const [reportData, setReportData] = useState<ReportData[]>([]);

  // Map brand category to brand filter category (for marka selection)
  // and to KPI category (for KPI filtering)
  const getBrandCategoryForFilter = (category: BrandCategoryKey | 'all'): BrandCategoryKey | 'all' => {
    // Servis kategorisi seçildiğinde satış markalarını göster
    if (category === 'servis-markalari') {
      return 'satis-markalari';
    }
    return category;
  };

  const getKpiCategoryForFilter = (category: BrandCategoryKey | 'all'): string | null => {
    // Marka kategorisine göre KPI kategorisini belirle
    if (category === 'satis-markalari') {
      return 'Satış - Aylık KPI';
    }
    if (category === 'servis-markalari') {
      return 'Servis - Aylık KPI';
    }
    if (category === 'kiralama-markalari') {
      return 'Kiralama - Aylık KPI';
    }
    if (category === 'ikinci-el-markalari') {
      return 'İkinci El - Aylık KPI';
    }
    if (category === 'ekspertiz-markalari') {
      return 'Ekspertiz - Aylık KPI';
    }
    return null; // 'all' için null (tüm KPI'lar)
  };

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

  // Load brands
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoading(true);
        setError(null);
        const brandsResponse = await getBrands({ status: 'aktif' });
        const allBrands = 'brands' in brandsResponse ? brandsResponse.brands : (Array.isArray(brandsResponse) ? brandsResponse : []);
        setBrands(Array.isArray(allBrands) ? allBrands : []);
      } catch (e) {
        logger.error('Brands load error', e instanceof Error ? e : { error: e });
        setError(toUserFriendlyError(e).message);
      } finally {
        setLoading(false);
      }
    };
    loadBrands();
  }, []);

  // Filter brands by category
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredBrands(brands);
    } else {
      // Servis kategorisi seçildiğinde satış markalarını göster
      const brandCategoryForFilter = getBrandCategoryForFilter(selectedCategory);
      setFilteredBrands(filterBrandsByCategory(brands, brandCategoryForFilter));
    }
    // Reset selected brands when category changes
    setSelectedBrandIds([]);
    setKpisByBrand({});
    setSelectedKpiIds([]);
  }, [selectedCategory, brands]);

  // Load KPIs for selected brands
  useEffect(() => {
    const loadKpis = async () => {
      if (selectedBrandIds.length === 0) {
        setKpisByBrand({});
        setSelectedKpiIds([]);
        return;
      }

      try {
        setLoading(true);
        const kpisMap: Record<string, Kpi[]> = {};
        
        await Promise.all(
          selectedBrandIds.map(async (brandId) => {
            try {
              const { kpis } = await getBrandKpis(brandId);
              kpisMap[brandId] = Array.isArray(kpis) ? kpis : [];
            } catch (e) {
              logger.error(`KPI load error for brand ${brandId}`, e instanceof Error ? e : { error: e });
              kpisMap[brandId] = [];
            }
          })
        );
        
        setKpisByBrand(kpisMap);
      } catch (e) {
        logger.error('KPIs load error', e instanceof Error ? e : { error: e });
        setError(toUserFriendlyError(e).message);
      } finally {
        setLoading(false);
      }
    };

    loadKpis();
  }, [selectedBrandIds]);

  // Get all available KPIs from selected brands, filtered by KPI category
  const availableKpis = useMemo(() => {
    const kpiMap = new Map<string, Kpi>();
    const targetKpiCategory = getKpiCategoryForFilter(selectedCategory);
    
    Object.values(kpisByBrand).forEach((kpis) => {
      if (Array.isArray(kpis)) {
        kpis.forEach((kpi) => {
          // KPI kategori filtresi uygula
          if (targetKpiCategory === null) {
            // 'all' seçildiğinde tüm KPI'ları göster
            if (!kpiMap.has(kpi.id)) {
              kpiMap.set(kpi.id, kpi);
            }
          } else {
            // Belirli bir kategori seçildiğinde sadece o kategorideki KPI'ları göster
            const kpiCategory = String(kpi.category || '').trim();
            if (kpiCategory === targetKpiCategory) {
              if (!kpiMap.has(kpi.id)) {
                kpiMap.set(kpi.id, kpi);
              }
            }
          }
        });
      }
    });
    return Array.from(kpiMap.values());
  }, [kpisByBrand, selectedCategory]);

  // Generate report
  const generateReport = useCallback(async () => {
    if (selectedBrandIds.length === 0 || selectedKpiIds.length === 0 || !startDate || !endDate) {
      setError('Lütfen marka, KPI ve tarih aralığı seçin.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startYear = start.getFullYear();
      const startMonth = start.getMonth() + 1;
      const endYear = end.getFullYear();
      const endMonth = end.getMonth() + 1;

      const allReportData: ReportData[] = [];

      if (reportType === 'daily') {
        // Daily reports
        const daysInRange: Array<{ year: number; month: number; day: number }> = [];
        const current = new Date(start);
        while (current <= end) {
          daysInRange.push({
            year: current.getFullYear(),
            month: current.getMonth() + 1,
            day: current.getDate(),
          });
          current.setDate(current.getDate() + 1);
        }

        await Promise.all(
          selectedBrandIds.map(async (brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            if (!brand) return;

            // Get daily reports for each day in range
            for (const { year, month, day } of daysInRange) {
              try {
                const reports = await getKpiDailyReports(brandId, year, month, day, selectedKpiIds);
                const kpiDetails = await getKpiDetails(selectedKpiIds);
                const kpiDetailsArray = Array.isArray(kpiDetails) ? kpiDetails : [];
                const kpiMap = new Map(kpiDetailsArray.map((k) => [k.id, k]));
                const reportsArray = Array.isArray(reports) ? reports : [];

                reportsArray.forEach((report) => {
                  const kpi = kpiMap.get(report.kpi_id);
                  if (kpi) {
                    allReportData.push({
                      kpiId: report.kpi_id,
                      kpiName: kpi.name,
                      brandId,
                      brandName: brand.name,
                      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                      value: report.value || 0,
                      unit: kpi.unit,
                    });
                  }
                });
              } catch (e) {
                logger.error(`Daily report error for ${brandId} ${year}-${month}-${day}`, e instanceof Error ? e : { error: e });
              }
            }
          })
        );
      } else {
        // Monthly reports
        const monthsInRange: Array<{ year: number; month: number }> = [];
        const current = new Date(startYear, startMonth - 1, 1);
        const endDateObj = new Date(endYear, endMonth - 1, 1);
        
        while (current <= endDateObj) {
          monthsInRange.push({
            year: current.getFullYear(),
            month: current.getMonth() + 1,
          });
          current.setMonth(current.getMonth() + 1);
        }

        await Promise.all(
          selectedBrandIds.map(async (brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            if (!brand) return;

            for (const { year, month } of monthsInRange) {
              try {
                const reports = await getKpiMonthlyReports(brandId, year, month, selectedKpiIds);
                const kpiDetails = await getKpiDetails(selectedKpiIds);
                const kpiDetailsArray = Array.isArray(kpiDetails) ? kpiDetails : [];
                const kpiMap = new Map(kpiDetailsArray.map((k) => [k.id, k]));
                const reportsArray = Array.isArray(reports) ? reports : [];

                reportsArray.forEach((report) => {
                  const kpi = kpiMap.get(report.kpi_id);
                  if (kpi) {
                    allReportData.push({
                      kpiId: report.kpi_id,
                      kpiName: kpi.name,
                      brandId,
                      brandName: brand.name,
                      date: `${year}-${String(month).padStart(2, '0')}`,
                      value: report.value || 0,
                      unit: kpi.unit,
                    });
                  }
                });
              } catch (e) {
                logger.error(`Monthly report error for ${brandId} ${year}-${month}`, e instanceof Error ? e : { error: e });
              }
            }
          })
        );
      }

      setReportData(allReportData);
    } catch (e) {
      logger.error('Report generation error', e instanceof Error ? e : { error: e });
      setError(toUserFriendlyError(e).message);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandIds, selectedKpiIds, startDate, endDate, reportType, brands]);

  // Export to CSV - Pivot table format (KPI-Marka-Tarih bazlı karşılaştırma)
  const exportToCSV = useCallback(() => {
    if (reportData.length === 0) return;

    // Veriyi organize et: KPI -> Marka -> Tarih -> Değer
    const dataMap = new Map<string, Map<string, Map<string, number>>>();
    const kpiUnits = new Map<string, string>(); // KPI ID -> Unit
    const kpiNames = new Map<string, string>(); // KPI ID -> Name
    const brandNames = new Set<string>();
    const dates = new Set<string>();

    reportData.forEach((r) => {
      if (!dataMap.has(r.kpiId)) {
        dataMap.set(r.kpiId, new Map());
        kpiNames.set(r.kpiId, r.kpiName);
        kpiUnits.set(r.kpiId, r.unit || '');
      }
      const brandMap = dataMap.get(r.kpiId)!;
      if (!brandMap.has(r.brandName)) {
        brandMap.set(r.brandName, new Map());
      }
      const dateMap = brandMap.get(r.brandName)!;
      dateMap.set(r.date, r.value);
      brandNames.add(r.brandName);
      dates.add(r.date);
    });

    // Tarihleri sırala
    const sortedDates = Array.from(dates).sort();
    // Markaları sırala
    const sortedBrands = Array.from(brandNames).sort();
    // KPI'ları sırala (ID'ye göre)
    const sortedKpiIds = Array.from(dataMap.keys()).sort((a, b) => {
      const nameA = kpiNames.get(a) || '';
      const nameB = kpiNames.get(b) || '';
      return nameA.localeCompare(nameB, 'tr');
    });

    // Header oluştur: KPI, Birim, Marka, Tarih1, Tarih2, ...
    const headers = ['KPI', 'Birim', 'Marka', ...sortedDates];

    // Satırları oluştur: Her KPI-Marka kombinasyonu için bir satır
    const rows: string[][] = [];
    sortedKpiIds.forEach((kpiId) => {
      const kpiName = kpiNames.get(kpiId) || '';
      const unit = kpiUnits.get(kpiId) || '';
      const brandMap = dataMap.get(kpiId)!;
      
      sortedBrands.forEach((brandName) => {
        const dateMap = brandMap.get(brandName);
        if (dateMap) {
          const row = [
            kpiName,
            unit,
            brandName,
            ...sortedDates.map((date) => {
              const value = dateMap.get(date);
              return value !== undefined ? String(value) : '';
            }),
          ];
          rows.push(row);
        }
      });
    });

    // CSV içeriğini oluştur
    const csvContent = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapor_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [reportData]);

  const formatValue = (value: number, unit?: string) => {
    if (!unit) return new Intl.NumberFormat('tr-TR').format(value);
    const unitLower = unit.toLowerCase();
    if (unitLower === 'tl' || unitLower === '₺') {
      return `₺${new Intl.NumberFormat('tr-TR').format(value)}`;
    }
    if (unitLower === '%' || unitLower === 'yüzde') {
      return `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
    }
    return `${new Intl.NumberFormat('tr-TR').format(value)} ${unit}`;
  };

  return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapor Oluştur</h1>
            <p className="text-sm text-gray-600 mt-1">Özel raporlarınızı oluşturun ve indirin</p>
          </div>
        </div>

        {error && (
          <ErrorAlert
            title="Hata"
            message={error}
            onRetry={() => setError(null)}
          />
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtreler</CardTitle>
            <CardDescription>Rapor için kriterleri seçin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marka Kategorisi
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  Tümü
                </Button>
                <Button
                  variant={selectedCategory === 'satis-markalari' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('satis-markalari')}
                >
                  Satış
                </Button>
                <Button
                  variant={selectedCategory === 'servis-markalari' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('servis-markalari')}
                >
                  Servis
                </Button>
                <Button
                  variant={selectedCategory === 'kiralama-markalari' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('kiralama-markalari')}
                >
                  Kiralama
                </Button>
                <Button
                  variant={selectedCategory === 'ikinci-el-markalari' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('ikinci-el-markalari')}
                >
                  İkinci El
                </Button>
                <Button
                  variant={selectedCategory === 'ekspertiz-markalari' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('ekspertiz-markalari')}
                >
                  Ekspertiz
                </Button>
              </div>
            </div>

            {/* Brand Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markalar {selectedBrandIds.length > 0 && `(${selectedBrandIds.length} seçili)`}
              </label>
              <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                {filteredBrands.length === 0 ? (
                  <p className="text-sm text-gray-500">Marka bulunamadı</p>
                ) : (
                  <div className="space-y-2">
                    {filteredBrands.map((brand) => (
                      <label key={brand.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedBrandIds.includes(brand.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrandIds([...selectedBrandIds, brand.id]);
                            } else {
                              setSelectedBrandIds(selectedBrandIds.filter((id) => id !== brand.id));
                              setSelectedKpiIds(selectedKpiIds.filter((id) => {
                                const kpis = kpisByBrand[brand.id] || [];
                                return !kpis.some((k) => k.id === id);
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{brand.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* KPI Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KPI'lar {selectedKpiIds.length > 0 && `(${selectedKpiIds.length} seçili)`}
              </label>
              {availableKpis.length === 0 ? (
                <p className="text-sm text-gray-500">Önce marka seçin</p>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {availableKpis.map((kpi) => (
                      <label key={kpi.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={selectedKpiIds.includes(kpi.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedKpiIds([...selectedKpiIds, kpi.id]);
                            } else {
                              setSelectedKpiIds(selectedKpiIds.filter((id) => id !== kpi.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{kpi.name}</span>
                        {kpi.unit && (
                          <Badge variant="outline" className="text-xs">
                            {kpi.unit}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rapor Tipi
              </label>
              <div className="flex gap-2">
                <Button
                  variant={reportType === 'daily' ? 'default' : 'outline'}
                  onClick={() => setReportType('daily')}
                >
                  Günlük
                </Button>
                <Button
                  variant={reportType === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setReportType('monthly')}
                >
                  Aylık
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button
                onClick={generateReport}
                disabled={loading || selectedBrandIds.length === 0 || selectedKpiIds.length === 0 || !startDate || !endDate}
                className="flex-1"
              >
                {loading ? 'Rapor Oluşturuluyor...' : 'Rapor Oluştur'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Results */}
        {reportData.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {reportType === 'daily' ? 'Günlük' : 'Aylık'} rapor başarıyla oluşturuldu
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {reportData.length} kayıt • {startDate} - {endDate}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV İndir
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {reportData.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title="Henüz rapor oluşturulmadı"
                description="Yukarıdaki filtreleri kullanarak bir rapor oluşturun."
              />
            </CardContent>
          </Card>
        )}
      </div>
  );
}
